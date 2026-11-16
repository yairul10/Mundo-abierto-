import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFloatingJoystick} from '../js/floating-joystick.js';
function harness(){
 class Target extends EventTarget{constructor(){super();this.attrs=new Map();this.values=new Map();this.style={setProperty:(k,v,p='')=>this.values.set(k,[v,p]),getPropertyValue:k=>this.values.get(k)?.[0]||'',getPropertyPriority:k=>this.values.get(k)?.[1]||'',removeProperty:k=>this.values.delete(k)};this.captured=new Set()}setAttribute(k,v){this.attrs.set(k,v)}removeAttribute(k){this.attrs.delete(k)}getBoundingClientRect(){return {width:120,height:120}}closest(){return this.blocked?{}:null}setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id)}remove(){this.removed=true}}
 const doc=new Target(),win=new Target(),element=new Target(),stick=new Target(),background=new Target(),button=new Target();button.blocked=true;win.innerWidth=1000;win.innerHeight=500;doc.body=new Target();doc.head={appendChild(){}};doc.createElement=()=>new Target();let observer;win.MutationObserver=class {constructor(fn){observer=fn}observe(){}disconnect(){}};
 let allowed=true,state=[0,0];element.style.setProperty('left','12vw','important');element.style.setProperty('transform','translate(-50%,-50%)','important');
 const control=mountFloatingJoystick({element,stick,doc,win,onMove:(...v)=>state=v,canMove:()=>allowed});
 const send=(name,id,x=200,y=250,target=background)=>{const e=new Event(name,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y},button:{value:0},target:{value:target}});doc.dispatchEvent(e);return e};
 return {doc,win,element,button,background,control,send,get state(){return state},block(){allowed=false;observer()}};
}
test('floating movement starts at the finger, keeps one owner, and restores layout on release',()=>{
 const h=harness();assert.ok(!h.element.attrs.has('data-active'));assert.ok(h.send('pointerdown',1,210,230).defaultPrevented);assert.equal(h.element.style.getPropertyValue('left'),'210px');assert.deepEqual(h.state,[0,0]);
 h.send('pointermove',1,260,180);assert.deepEqual(h.state,[1,1]);
 assert.equal(h.send('pointerdown',2,900,400,h.button).defaultPrevented,false);h.send('pointerup',2);assert.deepEqual(h.state,[1,1]);
 h.send('pointerup',1);assert.deepEqual(h.state,[0,0]);assert.ok(!h.element.attrs.has('data-active'));assert.equal(h.element.style.getPropertyValue('left'),'12vw');assert.equal(h.element.style.getPropertyPriority('left'),'important');
 h.send('pointerdown',3,15,20);assert.deepEqual(h.state,[0,0]);assert.equal(h.element.style.getPropertyValue('left'),'15px');h.send('pointercancel',3);assert.deepEqual(h.state,[0,0]);h.control.dispose();
});
test('right half, controls and menus never start movement',()=>{
 const h=harness();for(const [x,target] of [[500,h.background],[900,h.background],[100,h.button]])assert.equal(h.send('pointerdown',1,x,200,target).defaultPrevented,false);
 assert.ok(!h.element.attrs.has('data-active'));h.block();assert.equal(h.send('pointerdown',1).defaultPrevented,false);h.control.dispose();
});
test('focus, orientation, pointer loss and opening a menu clear a held movement',()=>{
 const h=harness();for(const name of ['blur','resize','pagehide']){h.send('pointerdown',1);h.send('pointermove',1,250,200);h.win.dispatchEvent(new Event(name));assert.deepEqual(h.state,[0,0]);assert.ok(!h.element.attrs.has('data-active'))}
 h.send('pointerdown',2);h.send('pointermove',2,250,200);h.send('lostpointercapture',2);assert.deepEqual(h.state,[0,0]);
 h.send('pointerdown',3);h.send('pointermove',3,250,200);h.block();assert.deepEqual(h.state,[0,0]);h.control.dispose();assert.ok(!h.element.attrs.has('data-floating'));
});
