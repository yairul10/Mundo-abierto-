import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopMode,initDesktopPlatform} from '../js/desktop-platform.js';
import {mountDesktopControls} from '../js/desktop-controls.js';
function harness(){
 class Target extends EventTarget{closest(selector){return this.ui&&(!selector.startsWith('input,')||this.typing)?{}:null}setPointerCapture(){}hasPointerCapture(){return false}}
 const doc=new Target(),win=new Target(),background=new Target(),button=new Target();button.ui=true;button.typing=true;doc.body=new Target();const keys={},events=[];let active=true,play=true,observe;
 win.MutationObserver=class{constructor(fn){observe=fn}observe(){}disconnect(){}};
 const control=mountDesktopControls({doc,win,keys,enabled:()=>active,canPlay:()=>play,onFire:v=>events.push(['fire',v]),onAim:(...v)=>events.push(['aim',...v]),onZoom:v=>events.push(['zoom',v]),onAction:v=>events.push(['action',v]),onHelp:()=>events.push(['help']),onEscape:()=>events.push(['escape'])});
 const send=(name,props={})=>{const e=new Event(name,{cancelable:true});for(const [k,v] of Object.entries({target:background,pointerType:'mouse',pointerId:1,button:0,buttons:1,clientX:200,clientY:200,...props}))Object.defineProperty(e,k,{value:v});doc.dispatchEvent(e);return e};
 return {doc,win,keys,events,control,send,button,disable(){active=false},block(){play=false;observe()}};
}
test('native phones/tablets retain touch controls even with a mouse; native PC detection does not sign in',async()=>{
 const fake={Capacitor:{Plugins:{CosmosPlayGames:{platform:async()=>({pc:true})}}},matchMedia:()=>({matches:true}),navigator:{maxTouchPoints:0},document:{body:{classList:{toggle(){}}}},dispatchEvent(){}};
 assert.equal(desktopMode(fake),false);assert.equal(await initDesktopPlatform(fake),true);
 fake.Capacitor.Plugins.CosmosPlayGames.platform=async()=>({pc:false});assert.equal(await initDesktopPlatform(fake),false);
 fake.Capacitor.Plugins.CosmosPlayGames.platform=async()=>{throw Error('old plugin')};assert.equal(await initDesktopPlatform(fake),false);
 const browser={matchMedia:()=>({matches:true}),navigator:{maxTouchPoints:0}};assert.equal(desktopMode(browser),true);browser.navigator.maxTouchPoints=5;assert.equal(desktopMode(browser),false);
});
test('physical movement keys, continuous fire and actions work; typing, IME and modifier shortcuts stay untouched',()=>{
 const h=harness();h.send('keydown',{code:'KeyW',key:'z'});assert.equal(h.keys.w,1);h.send('keyup',{code:'KeyW'});assert.equal(h.keys.w,0);
 h.send('keydown',{code:'Space'});assert.deepEqual(h.events.at(-1),['fire',true]);h.send('keyup',{code:'Space'});assert.deepEqual(h.events.at(-1),['fire',false]);
 for(const code of ['KeyQ','KeyX','KeyE','KeyM','Tab'])h.send('keydown',{code});assert.deepEqual(h.events.filter(e=>e[0]==='action').map(e=>e[1]),['missile','ability','dock','map','menu']);
 const count=h.events.length;for(const props of [{target:h.button},{ctrlKey:true},{altKey:true},{isComposing:true}])assert.equal(h.send('keydown',{code:'KeyQ',...props}).defaultPrevented,false);assert.equal(h.events.length,count);
 h.send('keydown',{code:'KeyW'});h.send('focusin',{target:h.button});assert.equal(h.keys.w,0);assert.deepEqual(h.events.at(-1),['fire',false]);
 h.control.dispose();
});
test('mouse fire and keyboard fire have independent release; right drag aims and wheel zoom avoids menus',()=>{
 const h=harness();assert.equal(h.send('pointerdown').defaultPrevented,true);h.send('keydown',{code:'Space'});h.send('pointerup',{buttons:0});assert.deepEqual(h.events.at(-1),['fire',true]);h.send('keyup',{code:'Space'});assert.deepEqual(h.events.at(-1),['fire',false]);
 h.send('pointerdown',{button:2,buttons:2});h.send('pointermove',{buttons:2,clientX:215,clientY:190});assert.deepEqual(h.events.at(-1),['aim',15,-10]);h.send('pointerup',{buttons:0});
 h.send('wheel',{deltaY:-100});assert.deepEqual(h.events.at(-1),['zoom',-1]);assert.equal(h.send('wheel',{deltaY:100,target:h.button}).defaultPrevented,false);
 assert.equal(h.send('pointerdown',{target:h.button}).defaultPrevented,false);assert.equal(h.send('pointerdown',{pointerType:'touch'}).defaultPrevented,false);h.control.dispose();
});
test('menus, app pause and lost capture release held movement and firing; mobile mode never captures mouse',()=>{
 for(const trigger of ['blur','cosmos:app-paused','pagehide','menu','lostpointercapture']){
 const h=harness();h.send('keydown',{code:'KeyW'});h.send('pointerdown');if(trigger==='menu')h.block();else if(trigger==='lostpointercapture'){h.send(trigger);h.win.dispatchEvent(new Event('blur'))}else h.win.dispatchEvent(new Event(trigger));assert.equal(h.keys.w,0);assert.deepEqual(h.events.at(-1),['fire',false]);h.control.dispose();
 }
 const h=harness();h.disable();assert.equal(h.send('pointerdown').defaultPrevented,false);assert.equal(h.send('keydown',{code:'KeyW'}).defaultPrevented,false);assert.equal(h.keys.w,undefined);h.control.dispose();
});
