import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatAudio,AUDIO_KEY,MUSIC_TRACKS,MUSIC_SESSION_KEY} from '../js/combat-audio.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const data=new Map(),session={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 class Element{constructor(){this.style={};this.attributes={}}setAttribute(k,v){this.attributes[k]=v}remove(){this.removed=true}}
 const children=[],doc=new EventTarget();doc.hidden=false;doc.createElement=()=>new Element();doc.body={appendChild:e=>children.push(e)};
 const node=()=>({connect(){},gain:{setTargetAtTime(){}}});
 class Context{constructor(){this.state='suspended';this.currentTime=0;this.destination=node()}createGain(){return node()}createDynamicsCompressor(){return node()}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){return Promise.resolve()}}
 const media=[];let blocked=false;
 class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=300;this.events=new Map();media.push(this)}addEventListener(k,v){this.events.set(k,v)}removeEventListener(k){this.events.delete(k)}play(){if(blocked)return Promise.reject(Object.assign(Error('gesture required'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve()}pause(){this.paused=true}removeAttribute(){}load(){}}
 const host=new EventTarget();Object.assign(host,{document:doc,AudioContext:Context,Audio,sessionStorage:session});
 return {session,doc,host,media,children,block(){blocked=true},allow(){blocked=false},create(settings={}){return createCombatAudio({host,storage:{getItem:key=>key===AUDIO_KEY?JSON.stringify(settings):null}})}};
}
test('music resumes the previous track and position across a private-room reload after prior playback',async()=>{
 const h=harness(),first=h.create();await turn();assert.equal(h.media.length,0,'fresh visit stays silent until the player interacts');first.unlock();await turn();h.media[0].events.get('ended')();h.media[0].currentTime=48;h.host.dispatchEvent(new Event('pagehide'));assert.equal(JSON.parse(h.session.getItem(MUSIC_SESSION_KEY)).track,1);first.dispose();const next=h.create();await turn();assert.equal(h.media[1].src,MUSIC_TRACKS[1]);assert.equal(h.media[1].paused,false);h.media[1].events.get('loadedmetadata')();assert.equal(h.media[1].currentTime,48);next.dispose();
});
test('mute, zero music volume, expired intent and disposing before resume never start a new player',async()=>{
 const h=harness();for(const settings of [{muted:true},{musicVolume:0}]){h.session.setItem(MUSIC_SESSION_KEY,JSON.stringify({enabled:true,track:0,time:10,at:Date.now()}));const audio=h.create(settings);await turn();assert.equal(h.media.length,0);audio.dispose()}
 h.session.setItem(MUSIC_SESSION_KEY,JSON.stringify({enabled:true,track:0,time:10,at:Date.now()-130000}));const expired=h.create();await turn();assert.equal(h.media.length,0);expired.dispose();
 h.session.setItem(MUSIC_SESSION_KEY,JSON.stringify({enabled:true,track:0,time:10,at:Date.now()}));const disposed=h.create();disposed.dispose();await turn();assert.equal(h.media.length,0);
});
test('browser autoplay rejection offers a single music-only control and removes it after successful playback',async()=>{
 const h=harness();h.block();h.session.setItem(MUSIC_SESSION_KEY,JSON.stringify({enabled:true,track:0,time:10,at:Date.now()}));const audio=h.create();await turn();assert.equal(h.children.length,1);const button=h.children[0];assert.ok(Object.hasOwn(button.attributes,'data-audio-resume'));h.host.dispatchEvent(new Event('cosmos:world-ready'));await turn();assert.equal(h.children.length,1);h.allow();button.onclick({stopPropagation(){}});await turn();assert.equal(h.media[0].paused,false);assert.equal(button.removed,true);audio.dispose();
});
