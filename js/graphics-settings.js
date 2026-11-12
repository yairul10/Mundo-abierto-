// Device-local preferences, independent of pilot saves and test/normal modes.
export const GRAPHICS_KEY='mundoAbierto.graphics';
export const FRAME_RATE_KEY='mundoAbierto.frameRate';
export const QUALITY={
 verylow:{label:'Muy baja',pixelRatio:.5,maxPixels:450000,debrisDistance:700,detailDistance:1400,lights:false,sparks:2},
 low:{label:'Baja',pixelRatio:.7,maxPixels:800000,debrisDistance:1300,detailDistance:2600,lights:false,sparks:3},
 medium:{label:'Media',pixelRatio:1,maxPixels:1800000,debrisDistance:2300,detailDistance:3900,lights:false,sparks:6},
 high:{label:'Alta',pixelRatio:1.6,maxPixels:3500000,debrisDistance:4500,detailDistance:6500,lights:true,sparks:10}
};
export function normalizeGraphics(value){return ['auto',...Object.keys(QUALITY)].includes(value)?value:'auto'}
export function normalizeFrameRate(value){return Number(value)===60?60:30}
export function initialGraphicsLevel(hardware={}){
 const memory=Number(hardware.deviceMemory)||0,cores=Number(hardware.hardwareConcurrency)||0;
 if(memory>0&&memory<=3||cores>0&&cores<=4)return 'verylow';
 return memory>=6&&cores>=8?'medium':'low';
}
// Limit drawing only: game simulation and cooperative input retain their own cadence.
export function createFrameLimiter(frameRate=30){
 let limit=normalizeFrameRate(frameRate),next=null;
 return {
  get frameRate(){return limit},
  setFrameRate(value){limit=normalizeFrameRate(value);next=null},
  reset(){next=null},
  shouldRender(now){
   if(!Number.isFinite(now))return false;
   const interval=1000/limit;
   if(next===null){next=now+interval;return true}
   if(now+.25<next)return false;
   const missed=Math.max(0,Math.floor((now+.25-next)/interval));next+=(missed+1)*interval;
   return true;
  }
 };
}
export function isGraphicsRecoveryReload(token,savedToken,now){
 const age=now-Number(token);
 return Boolean(token&&token===savedToken&&age>=0&&age<60000);
}
export function renderRatio(profile,width,height,dpr=1){return Math.min(dpr,profile.pixelRatio,Math.sqrt(profile.maxPixels/Math.max(1,width*height)))}
export function createGraphicsController({mode='auto',initial='medium',frameRate=60,onChange=()=>{}}={}){
 const start=Object.hasOwn(QUALITY,initial)?initial:'low';
 let choice=normalizeGraphics(mode),level=choice==='auto'?start:choice,target=normalizeFrameRate(frameRate);
 let seconds=0,frames=0,bad=0,good=0,warmup=4,cooldown=0;
 const levels=Object.keys(QUALITY);
 function reset(){seconds=frames=bad=good=0;warmup=4;cooldown=0}
 function change(next){if(next!==level){level=next;onChange(level,choice)}}
 return {
  get mode(){return choice},get level(){return level},get profile(){return QUALITY[level]},get frameRate(){return target},
  setFrameRate(value){target=normalizeFrameRate(value);reset()},
  select(next){choice=normalizeGraphics(next);reset();level=choice==='auto'?start:choice;onChange(level,choice)},
  recover(){reset();change(level==='verylow'||start==='verylow'?'verylow':'low')},
  finishRecovery(){if(choice!=='auto')change(choice)},
  sample(dt,eligible=true){
   if(choice!=='auto')return;
   if(!eligible||!Number.isFinite(dt)||dt<=0||dt>2){seconds=frames=bad=good=0;warmup=4;return}
   if(warmup>0){warmup-=dt;return}
   cooldown=Math.max(0,cooldown-dt);seconds+=dt;frames++;
   if(seconds<3)return;
   const fps=frames/seconds;seconds=frames=0;
   bad=fps<(target===30?25.5:45)?bad+1:0;good=fps>=target*.95?good+1:0;
   const i=levels.indexOf(level);
   if(!cooldown&&bad>=1&&i>0){change(levels[i-1]);bad=good=0;cooldown=15}
   else if(!cooldown&&good>=10&&i<levels.length-1){change(levels[i+1]);bad=good=0;cooldown=30}
  }
 };
}
export function mountGraphicsSettings(controller,{parent,storage,onSelect=()=>{},onFrameRateSelect=()=>{}}){
 const section=document.createElement('section');section.className='graphics-settings';
 section.innerHTML='<h3>Gráficos</h3><label for="graphicsQuality">Calidad gráfica</label><select id="graphicsQuality"><option value="auto">Automática (recomendada)</option><option value="verylow">Muy baja</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select><label for="graphicsFrameRate">Límite de FPS</label><select id="graphicsFrameRate"><option value="30">30 FPS · Menor consumo</option><option value="60">60 FPS · Mayor fluidez</option></select><p id="graphicsStatus" class="inventory-note" role="status"></p><p class="inventory-note">Se guarda en este dispositivo. Muy baja reduce la nitidez y los efectos. 30 FPS ayuda a reducir el consumo y el calentamiento.</p>';
 parent.insertBefore(section,parent.querySelector('h3'));const select=section.querySelector('#graphicsQuality'),frameSelect=section.querySelector('#graphicsFrameRate'),status=section.querySelector('#graphicsStatus');
 function refresh(){
  select.value=controller.mode;frameSelect.value=String(controller.frameRate);
  const recovering=controller.mode!=='auto'&&controller.mode!==controller.level;
  const label=controller.mode==='auto'?'Automática · calidad actual':recovering?'Recuperación gráfica · calidad temporal':'Calidad actual';
  status.textContent=label+': '+controller.profile.label+' · '+controller.frameRate+' FPS';
 }
 select.onchange=()=>{controller.select(select.value);try{storage.setItem(GRAPHICS_KEY,controller.mode)}catch{}onSelect();refresh()};
 frameSelect.onchange=()=>{controller.setFrameRate(frameSelect.value);try{storage.setItem(FRAME_RATE_KEY,String(controller.frameRate))}catch{}onFrameRateSelect(controller.frameRate);refresh()};
 refresh();return {refresh};
}
