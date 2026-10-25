import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {createCombatAudio,AUDIO_KEY,createAmbientBuffer}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/combat-audio.js',import.meta.url))).toString('base64'));
const listeners=new Map(),doc={hidden:false,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
let context,buffers=0,starts=0;const samples=[];
const node=()=>({connect(){},disconnect(){},gain:{value:0,setTargetAtTime(value){this.value=value}},pan:{value:0}});
class Context{
 constructor(){context=this;this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=node()}
 createGain(){return node()}createDynamicsCompressor(){return node()}createStereoPanner(){return node()}
 createBuffer(_,size){buffers++;const data=new Float32Array(size);samples.push(data);return {getChannelData:()=>data}}
 createBufferSource(){return {...node(),playbackRate:{value:1},start(){starts++},stop(){this.onended?.()}}}
 resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}
}
let saved=null;const storage={getItem:()=>null,setItem:(key,value)=>{assert.equal(key,AUDIO_KEY);saved=JSON.parse(value)}};
const audio=createCombatAudio({host:{AudioContext:Context},document:doc,listener:()=>({x:0,y:0,z:0}),storage});
assert.equal(audio.play('laser'),false,'Never starts before a user gesture');listeners.get('pointerdown')();assert.equal(context.state,'running');
assert.equal(audio.play('laser'),true);assert.equal(audio.play('laser'),false,'Rapid repeats are throttled');context.currentTime+=.1;assert.equal(audio.play('laser'),true);assert.equal(buffers,2,'Reuses music and effect buffers');
assert.equal(audio.play('explosion',{x:2000,y:0,z:0}),false,'Distant effects are culled');
for(const kind of ['enemyLaser','drone','missile','impact','explosion']){context.currentTime++;assert.equal(audio.play(kind),true)}
assert(samples.every(data=>data.every(Number.isFinite)&&data.some(x=>Math.abs(x)>.01)),'Every effect has valid audible samples');
audio.setMuted(true);assert.equal(saved.muted,true);assert.equal(audio.play('laser'),false);audio.setMuted(false);audio.setVolume(0);assert.equal(audio.play('laser'),false);audio.setVolume(2);assert.equal(saved.volume,1);
for(let i=0;i<30;i++){context.currentTime++;audio.play('laser')}assert.equal(starts,19,'Caps 18 effect voices plus one ambient loop');
doc.hidden=true;listeners.get('visibilitychange')();assert.equal(context.state,'suspended');assert.equal(audio.play('laser'),false);doc.hidden=false;listeners.get('visibilitychange')();context.currentTime++;assert.equal(audio.play('laser'),true,'Stopped voices release their slots');audio.dispose();assert.equal(context.state,'closed');assert.equal(listeners.size,0);
assert.doesNotThrow(()=>{const unsupported=createCombatAudio({host:{},document:null,storage:{getItem(){throw Error('blocked')}}});unsupported.unlock();assert.equal(unsupported.play('laser'),false);unsupported.dispose()});
const restored=createCombatAudio({host:{},document:null,storage:{getItem:()=>JSON.stringify({volume:.2,muted:true})}});assert.deepEqual(restored.settings,{volume:.2,musicVolume:.2,muted:true});
console.log('Combat audio: gesture activation, buffer reuse, finite effects, distance, throttle, voice cap, mute, volume persistence, background pause and unsupported fallback passed.');

const music=createAmbientBuffer(new Context()).getChannelData(0);assert.equal(music.length,512000);assert(music.every(Number.isFinite));assert(music.every(x=>Math.abs(x)<.75),'Music leaves headroom for effects');assert(Math.abs(music[0]-music.at(-1))<.01,'Loop boundary is smooth');restored.setMusicVolume(.12);assert.equal(restored.settings.musicVolume,.12);assert.equal(restored.settings.volume,.2,'Music volume is independent');
