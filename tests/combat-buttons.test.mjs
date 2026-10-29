import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_ART,cooldownProgress,setCombatArtwork,presentCombatButton,shipCombatArtwork} from '../js/combat-buttons.js';
const element=()=>({dataset:{},style:{setProperty(k,v){this[k]=v}},classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)},toggle(x,on){on?this.add(x):this.remove(x)}},children:[],querySelector(){return this.children.find(c=>c.className==='combat-art')},prepend(child){this.children.unshift(child)},setAttribute(k,v){this[k]=v},offsetWidth:100});
test('Cooldown ring reflects actual remaining time with safe bounds',()=>{for(const [left,total,want] of [[30,30,0],[15,30,.5],[0,30,1],[-5,30,1],[60,30,0],[3,0,1]])assert.equal(cooldownProgress(left,total),want)});
test('Artwork updates without replacing hit target, handlers or timer',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};try{const button=element(),timer={id:'timer'},handler=()=>{};button.children.push(timer);button.onclick=handler;
 setCombatArtwork(button,'fire');const image=button.children[0];assert.match(image.src,/fire.webp$/);assert.equal(image.draggable,false);assert.equal(image['aria-hidden'],'true');
 setCombatArtwork(button,'fire');assert.equal(button.children.length,2);assert.equal(button.children[0],image);
 setCombatArtwork(button,'missile');assert.match(image.src,/missile.webp$/);assert.equal(button.children[1],timer);assert.equal(button.onclick,handler);
 }finally{globalThis.document=old}
});
test('Ready flash happens once after cooldown and active/blocked states remain visual',()=>{
 const b=element();b.disabled=true;presentCombatButton(b,{remaining:15,duration:30,blocked:true});assert.equal(b.style['--combat-ready'],'0.5');assert.ok(b.classList.values.has('combat-cooling'));assert.ok(b.classList.values.has('combat-blocked'));
 presentCombatButton(b,{remaining:0,duration:30});assert.ok(b.classList.values.has('combat-ready-flash'));assert.equal(b.dataset.combatWasReady,'true');assert.equal(b.disabled,true,'Renderer never authorizes an ability');
 presentCombatButton(b,{remaining:2,duration:6,active:true});assert.ok(b.classList.values.has('combat-active'));assert.equal(b.classList.values.has('combat-cooling'),false);
});
test('All six PvP powers and three ship roles have distinct appropriate art',()=>{
 for(const id of ['interference','shield','fury','paralyze','luck','transfer','fire','missile','overload'])assert.ok(COMBAT_ART[id]);
 assert.equal(shipCombatArtwork('titan'),'shield');assert.equal(shipCombatArtwork('espectro'),'fury');assert.equal(shipCombatArtwork('aurora'),'overload');
});
