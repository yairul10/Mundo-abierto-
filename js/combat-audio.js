// Lightweight original effects, synthesized once and reused without downloads.
export const AUDIO_KEY='cosmos.audio.v1';
export const EFFECTS=Object.freeze({
 laser:{duration:.16,volume:.22,cooldown:.055,frequency:1500,end:220},
 enemyLaser:{duration:.2,volume:.17,cooldown:.08,frequency:820,end:130},
 drone:{duration:.12,volume:.09,cooldown:.12,frequency:2100,end:500},
 missile:{duration:.65,volume:.32,cooldown:.16,noise:.8,frequency:160,end:55},
 impact:{duration:.17,volume:.22,cooldown:.075,noise:.65,frequency:310,end:80},
 explosion:{duration:.85,volume:.5,cooldown:.09,noise:1,frequency:75,end:24}
});
// Original seamless ambient score: warm pads and sparse, soft bell notes.
export function createAmbientBuffer(context){
 const duration=32,rate=16000,result=context.createBuffer(1,duration*rate,rate),data=result.getChannelData(0);
 const chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
 const frequency=midi=>Math.round(440*Math.pow(2,(midi-69)/12)*duration)/duration;
 const notes=chords.map(chord=>chord.map(frequency));
 for(let i=0;i<data.length;i++){
  const t=i/rate;let sample=0;
  for(let chord=0;chord<4;chord++){
   const age=(t-chord*8+duration)%duration;if(age>=16)continue;
   const swell=Math.pow(Math.sin(Math.PI*age/16),2);
   for(const f of notes[chord])sample+=swell*(Math.sin(2*Math.PI*f*t)+.22*Math.sin(2*Math.PI*f*2*t))*.035;
  }
  const beat=Math.floor(t/4),age=t%4,f=frequency([76,72,69,67,72,76,74,71][beat]);
  sample+=Math.sin(2*Math.PI*f*t)*Math.min(1,age/.08)*Math.exp(-age*2)*.018;
  data[i]=sample*Math.min(1,t/.04,(duration-t)/.04);
 }
 return result;
}
export function createCombatAudio({host=globalThis,listener=()=>null,storage,document:doc=host.document}={}){
 let settings={volume:.55,musicVolume:.2,muted:false};
 try{const saved=JSON.parse(storage?.getItem(AUDIO_KEY)||'null');if(saved){if(Number.isFinite(saved.volume))settings.volume=Math.max(0,Math.min(1,saved.volume));if(Number.isFinite(saved.musicVolume))settings.musicVolume=Math.max(0,Math.min(1,saved.musicVolume));settings.muted=saved.muted===true}}catch{}
 let context,master,musicGain,musicSource,musicBuffer,unlocked=false;
 const buffers=new Map(),last=new Map(),voices=new Set(),views=new Set();
 function gain(){if(master)master.gain.setTargetAtTime(settings.muted?0:settings.volume,context.currentTime,.02);if(musicGain)musicGain.gain.setTargetAtTime(settings.muted?0:settings.musicVolume,context.currentTime,.5)}
 function startMusic(){
  if(!context||musicSource||settings.muted||settings.musicVolume<=0||doc?.hidden)return;
  try{musicBuffer??=createAmbientBuffer(context);musicSource=context.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;musicSource.connect(musicGain);musicSource.start()}catch{musicSource=null}
 }
 function persist(){try{storage?.setItem(AUDIO_KEY,JSON.stringify(settings))}catch{}gain();if(unlocked)startMusic();for(const refresh of views)refresh()}
 function unlock(){
  if(doc?.hidden)return;
  try{
   const AudioContext=host.AudioContext||host.webkitAudioContext;if(!AudioContext)return;
   if(!context){context=new AudioContext();master=context.createGain();const compressor=context.createDynamicsCompressor();master.connect(compressor);musicGain=context.createGain();musicGain.connect(compressor);compressor.connect(context.destination);gain()}
   unlocked=true;if(context.state!=='running')context.resume()?.catch(()=>{});startMusic();
  }catch{}
 }
 function buffer(kind){
  if(buffers.has(kind))return buffers.get(kind);
  const spec=EFFECTS[kind],rate=context.sampleRate,b=context.createBuffer(1,Math.ceil(rate*spec.duration),rate),data=b.getChannelData(0);
  let phase=0,low=0;
  for(let i=0;i<data.length;i++){
   const t=i/rate,p=t/spec.duration,f=spec.frequency*Math.pow(spec.end/spec.frequency,p);
   phase+=2*Math.PI*f/rate;
   const noise=Math.random()*2-1;low+=.13*(noise-low);
   const tonal=Math.sin(phase)+.16*Math.sin(phase*2.03);
   const texture=kind==='explosion'?low*3:noise*.5+low;
   const env=Math.min(1,t/.006)*Math.pow(1-p,kind==='explosion'?2:1.7);
   data[i]=Math.max(-1,Math.min(1,(tonal*(1-(spec.noise||0)*.85)+texture*(spec.noise||0))*env*.65));
  }
  buffers.set(kind,b);return b;
 }
 function play(kind,position){
  const spec=EFFECTS[kind];
  if(!spec||!context||context.state!=='running'||doc?.hidden||settings.muted||settings.volume<=0||voices.size>=18)return false;
  const now=context.currentTime;if(now-(last.get(kind)??-Infinity)<spec.cooldown)return false;
  let attenuation=1,pan=0;const origin=listener();
  if(position&&origin){const dx=position.x-origin.x,dy=position.y-origin.y,dz=position.z-origin.z,d=Math.hypot(dx,dy,dz);if(d>=1800)return false;attenuation=Math.pow(1-d/1800,2);pan=Math.max(-.75,Math.min(.75,dx/900))}
  try{
   const source=context.createBufferSource(),level=context.createGain();source.buffer=buffer(kind);source.playbackRate.value=.95+Math.random()*.1;
   level.gain.value=spec.volume*attenuation;source.connect(level);
   const stereo=context.createStereoPanner?.();if(stereo){stereo.pan.value=pan;level.connect(stereo);stereo.connect(master)}else level.connect(master);
   source.onended=()=>{voices.delete(source);source.disconnect();level.disconnect();stereo?.disconnect()};voices.add(source);last.set(kind,now);source.start();return true;
  }catch{return false}
 }
 function visibility(){
  if(!context)return;
  if(doc?.hidden){for(const voice of voices){try{voice.stop()}catch{}}context.suspend()?.catch(()=>{})}
  else if(unlocked){context.resume()?.catch(()=>{});startMusic()}
 }
 doc?.addEventListener('pointerdown',unlock,{passive:true});doc?.addEventListener('keydown',unlock);doc?.addEventListener('visibilitychange',visibility);
 return {play,unlock,get settings(){return {...settings}},setVolume(value){if(Number.isFinite(+value)){settings.volume=Math.max(0,Math.min(1,+value));persist()}},setMuted(value){settings.muted=!!value;persist()},setMusicVolume(value){if(Number.isFinite(+value)){settings.musicVolume=Math.max(0,Math.min(1,+value));persist()}},
  mount(parent){
   if(!doc||!parent)return;
   const section=doc.createElement('section');section.style.cssText='margin:14px 0;padding:12px;border:1px solid #426078;border-radius:12px;background:#101d2b;color:#e9f6ff';
   const title=doc.createElement('h3');title.textContent='Sonido';title.style.margin='0 0 10px';section.append(title);
   const label=doc.createElement('label');label.textContent='Volumen de efectos ';const value=doc.createElement('span');label.append(value);
   const slider=doc.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.setAttribute('aria-label','Volumen de efectos');slider.style.cssText='display:block;width:100%;margin:10px 0';
   slider.oninput=()=>{unlock();this.setVolume(Number(slider.value)/100)};
   const musicLabel=doc.createElement('label');musicLabel.textContent='Música ambiental ';const musicValue=doc.createElement('span');musicLabel.append(musicValue);
   const musicSlider=doc.createElement('input');musicSlider.type='range';musicSlider.min='0';musicSlider.max='100';musicSlider.step='1';musicSlider.setAttribute('aria-label','Volumen de música ambiental');musicSlider.style.cssText=slider.style.cssText;musicSlider.oninput=()=>{unlock();this.setMusicVolume(Number(musicSlider.value)/100)};
   const mute=doc.createElement('button');mute.type='button';mute.onclick=()=>{unlock();this.setMuted(!settings.muted)};
   const preview=doc.createElement('button');preview.type='button';preview.textContent='Probar sonido';preview.style.marginLeft='8px';preview.onclick=()=>{unlock();setTimeout(()=>play('laser'),40)};
   const refresh=()=>{slider.value=String(Math.round(settings.volume*100));value.textContent=slider.value+'%';musicSlider.value=String(Math.round(settings.musicVolume*100));musicValue.textContent=musicSlider.value+'%';mute.textContent=settings.muted?'Activar sonido':'Silenciar';mute.setAttribute('aria-pressed',String(settings.muted))};views.add(refresh);refresh();section.append(label,slider,musicLabel,musicSlider,mute,preview);parent.append(section);
  },
  dispose(){doc?.removeEventListener('pointerdown',unlock);doc?.removeEventListener('keydown',unlock);doc?.removeEventListener('visibilitychange',visibility);for(const voice of voices){try{voice.stop()}catch{}}voices.clear();views.clear();try{musicSource?.stop();musicSource?.disconnect()}catch{}musicSource=null;musicBuffer=null;context?.close()?.catch(()=>{})}
 };
}
