import assert from 'node:assert/strict';
import {mountPvpSkills} from '../js/pvp-skills-ui.js';
import {shipCombatArtwork} from '../js/combat-buttons.js';
const nodes=[];
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty(k,v){this[k]=v}};this.classList={add(){},remove(){},toggle(){}};nodes.push(this)}
 append(...xs){this.children.push(...xs)}prepend(x){this.children.unshift(x)}replaceChildren(...xs){this.children=xs}setAttribute(k,v){this[k]=v}addEventListener(){}querySelector(){return this.children.find(x=>x.className==='combat-art')}
}
const home=new Element('section');globalThis.document={getElementById:()=>home,createElement:t=>new Element(t),body:new Element('body')};globalThis.addEventListener=()=>{};
const rules={fury:{name:'Furia',description:'Daño doble',cooldown:30000,icon:'🔥'},instantShield:{name:'Escudo instantáneo',description:'Protección',cooldown:30000,icon:'🛡'}};
const me={equippedSkills:['fury','instantShield'],pos:[800,0,0],hp:100,skillReadyAt:{},skillUntil:{}};let now=1000;
const ui=mountPvpSkills({tools:home,getState:()=>({state:{rules:{skills:rules,safeRadius:650}},me,now}),canUse:()=>true,send:()=>{},isHangarOpen:()=>false,storage:{getItem:()=>null,setItem(){}},key:'test'});ui.update();
const buttons=nodes.filter(n=>/^pvpSkillButton/.test(n.id||''));assert.equal(buttons.length,2);
for(const b of buttons){const timer=b.children.find(c=>c.className==='combat-timer');assert.equal(timer.textContent,'');assert.equal(timer.style.display,'none');assert(b['aria-label'].endsWith(' · Lista'))}
assert.notEqual(buttons[0].dataset.combatArt,shipCombatArtwork('espectro'));assert.notEqual(buttons[1].dataset.combatArt,shipCombatArtwork('titan'));
me.skillReadyAt.fury=6000;ui.update();const timer=buttons[0].children.find(c=>c.className==='combat-timer');assert.equal(timer.textContent,'5 s');assert.equal(timer.style.display,'');
me.skillUntil.fury=3000;ui.update();assert.equal(timer.textContent,'Activa 2 s');assert.equal(timer.style.display,'');
now=31000;ui.update();assert.equal(timer.textContent,'');assert.equal(timer.style.display,'none');
console.log('PvP skill labels: ready slots blank, accessible names preserved, cooldown/active timers visible, ship and PvP artwork distinct.');
