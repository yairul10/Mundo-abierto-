import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBaseActions} from '../js/base-actions.js';
function element(){
 const classes=new Set(['hidden']),listeners={};
 return {hidden:false,disabled:true,textContent:'Aterrizar',classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)},
 addEventListener(type,listener){listeners[type]=listener},dispatch(type,event={}){listeners[type]?.(event)}};
}
function setup(){
 const root=element(),dock=element(),pvp=element(),hall=element(),calls=[];
 const actions=mountBaseActions({root,dock,pvp,hall,onPvp:()=>calls.push('pvp'),onHall:()=>calls.push('hall')});
 return {root,dock,pvp,hall,calls,actions};
}
test('nearby-base shortcuts expose landing, PvP and hall without requiring a landing pad',()=>{
 const f=setup();f.actions.update({visible:true,canLand:false});
 assert.equal(f.root.classList.contains('hidden'),false);assert.equal(f.dock.disabled,true);
 assert.equal(f.pvp.disabled,false);assert.equal(f.hall.disabled,false);assert.equal(f.pvp.hidden,false);assert.equal(f.hall.hidden,false);
 f.pvp.dispatch('click');f.hall.dispatch('click');assert.deepEqual(f.calls,['pvp','hall']);
 f.actions.update({visible:true,canLand:true});assert.equal(f.dock.disabled,false);
});
test('moving away, dying or opening a menu hides and deactivates the shortcuts',()=>{
 const f=setup();f.actions.update({visible:true,canLand:true});f.actions.update();
 assert.equal(f.root.classList.contains('hidden'),true);assert.equal(f.dock.classList.contains('hidden'),true);
 assert.equal(f.pvp.disabled,true);assert.equal(f.hall.disabled,true);
 f.pvp.dispatch('click');f.hall.dispatch('click');assert.deepEqual(f.calls,[]);
 f.actions.update({visible:true,canUseMenus:false});f.pvp.dispatch('click');assert.deepEqual(f.calls,[]);
});
test('automatic landing keeps only the disabled maneuver status and restores all actions afterward',()=>{
 const f=setup();f.dock.textContent='Descendiendo · 50%';f.actions.update({landing:true});
 assert.equal(f.root.classList.contains('hidden'),false);assert.equal(f.dock.classList.contains('hidden'),false);
 assert.equal(f.dock.disabled,true);assert.equal(f.dock.textContent,'Descendiendo · 50%');
 assert.equal(f.pvp.hidden,true);assert.equal(f.hall.hidden,true);
 f.pvp.dispatch('click');assert.deepEqual(f.calls,[]);
 f.actions.update({visible:true,canLand:true});assert.equal(f.pvp.hidden,false);assert.equal(f.hall.hidden,false);assert.equal(f.pvp.disabled,false);
});
test('touching the action row does not propagate into flight aiming',()=>{
 const f=setup();let stopped=false;
 f.root.dispatch('pointerdown',{stopPropagation(){stopped=true}});
 assert.equal(stopped,true);
});
