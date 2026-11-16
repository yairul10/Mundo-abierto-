import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYBINDING_KEY,DEFAULT_BINDINGS,readKeybindings,assignBinding,saveKeybindings,bindingAction,validBindingCode} from '../js/keybindings.js';
import {mountDesktopControls} from '../js/desktop-controls.js';
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}}
test('bindings persist across maps, reject duplicate/reserved keys and keep the current map on a failed write',()=>{
 const s=storage(),defaults=readKeybindings(s);let changed=assignBinding(defaults,'missile','KeyZ');assert.equal(bindingAction('KeyZ',changed),'missile');assert.equal(bindingAction('KeyQ',changed),null);
 assert.throws(()=>assignBinding(changed,'missile','KeyW'),/Avanzar/);for(const code of ['Escape','F5','F11','F12','ControlLeft','AltRight','Unidentified'])assert.equal(validBindingCode(code),false);
 let notifications=0;saveKeybindings(changed,s,{dispatchEvent(){notifications++}});assert.equal(notifications,1);assert.deepEqual(readKeybindings(s),changed);
 const raw=s.getItem(KEYBINDING_KEY),fail={getItem:s.getItem,setItem(){throw Error('quota')}};assert.throws(()=>saveKeybindings(DEFAULT_BINDINGS,fail),/quota/);assert.equal(s.getItem(KEYBINDING_KEY),raw);
 changed=assignBinding(changed,'pitchDown',null);changed=assignBinding(changed,'missile','KeyF');assert.equal(bindingAction('KeyF',changed),'missile');
 s.setItem(KEYBINDING_KEY,JSON.stringify({schema:1,bindings:{...changed,left:['KeyF']}}));assert.deepEqual(readKeybindings(s),DEFAULT_BINDINGS);
});
test('runtime honors remapped combat, movement and PvP keys; settings changes clear held inputs and aliases release independently',()=>{
 class Target extends EventTarget {closest(){return null}setPointerCapture(){}hasPointerCapture(){return false}}
 const doc=new Target(),win=new Target(),target=new Target(),s=storage();doc.body=new Target();let bindings=assignBinding(readKeybindings(s),'missile','KeyZ');bindings=assignBinding(bindings,'fire','KeyV');bindings=assignBinding(bindings,'skill0','KeyN');bindings=assignBinding(bindings,'forward','KeyI');
 const keys={},actions=[],firing=[];const c=mountDesktopControls({doc,win,enabled:()=>true,canPlay:()=>true,keys,getBindings:()=>bindings,onAction:v=>actions.push(v),onFire:v=>firing.push(v),onAim(){},onZoom(){}});
 const key=(type,code)=>{const e=new Event(type,{cancelable:true});Object.defineProperties(e,{code:{value:code},target:{value:target}});doc.dispatchEvent(e)};
 for(const code of ['KeyZ','KeyQ','KeyN','Digit1'])key('keydown',code);assert.deepEqual(actions,['missile','skill0']);key('keydown','KeyI');assert.equal(keys.w,1);key('keydown','KeyV');assert.equal(firing.at(-1),true);key('keyup','KeyV');assert.equal(firing.at(-1),false);
 bindings=structuredClone(DEFAULT_BINDINGS);win.dispatchEvent(new Event('cosmos:keybindings-changed'));assert.equal(keys.w,0);assert.equal(firing.at(-1),false);
 key('keydown','KeyW');key('keydown','ArrowUp');key('keyup','KeyW');assert.equal(keys.w,1);key('keyup','ArrowUp');assert.equal(keys.w,0);c.dispose();
});
