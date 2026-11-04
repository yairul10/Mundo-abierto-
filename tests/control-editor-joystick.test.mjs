import assert from 'node:assert/strict';
import {mountPvpControlEditor} from '../js/pvp-control-editor.js';
function harness(saved,pve=false,realm='normal'){
 const registry=new Map(),storage=new Map(),listeners={};
 globalThis.innerWidth=1000;globalThis.innerHeight=500;
 class Element{
  constructor(id=''){this.id=id;this.children=[];this.events={};this.attributes={};this.dataset={};this.classList={add(){}};this.styles={};this.style={setProperty:(k,v)=>this.styles[k]=v,getPropertyValue:k=>this.styles[k]||''};}
  append(e){this.children.push(e);if(e.id)registry.set(e.id,e)}prepend(e){this.append(e)}
  querySelector(selector){if(selector==='.combat-art')return null;if(!this.queries)this.queries={};return this.queries[selector]??=new Element()}
  getBoundingClientRect(){return this.id==='joystick'?{left:24,top:340,width:120,height:120}:{left:0,top:0,width:1000,height:500}}
  setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]}
  addEventListener(k,v){this.events[k]=v}setPointerCapture(){}replaceChildren(...children){this.children=children}
 }
 for(const id of ['hangarHomeView','fireBtn','skillBtn','classAbilityBtn','pvpSkillButton0','pvpSkillButton1','joystick','formationBtn','questToggle','characterBtn','zoomIn','zoomOut','farmAutoBtn','companionModeBtn'])registry.set(id,new Element(id));
 const key='mundoAbierto.'+(pve?'pveControls.':'pvpControls.')+realm;if(saved)storage.set(key,JSON.stringify(saved));
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={getElementById:id=>registry.get(id),createElement:()=>new Element(),head:new Element(),body:new Element()};
 globalThis.addEventListener=(k,v)=>listeners[k]=v;
 mountPvpControlEditor({realm,pve,isHangarOpen:()=>true});
 const section=registry.get('pvpControlEditorEntry'),overlay=registry.get('pvpControlEditor'),joystick=registry.get('joystick');
 section.querySelector('#pvpEditControls').onclick();
 const canvas=overlay.querySelector('.pvp-editor-canvas');
 const preview=canvas.children.find(c=>c.attributes['aria-label']==='Joystick de movimiento');
 return {registry,storage,key,overlay,canvas,joystick,preview,listeners};
}
const old=[[90,80],[81,89],[91,61],[77,65],[67,71]],h=harness(old);
assert.equal(h.registry.get('fireBtn').styles.left,'90vw','legacy PvP weapon position retained');
assert(h.preview,'joystick shown in PvP editor');assert.equal(h.preview.style.width,'120px');assert.equal(h.preview.style.height,'120px');
h.preview.events.pointerdown({preventDefault(){},pointerId:1});h.preview.events.pointermove({pointerId:1,clientX:500,clientY:200});h.preview.events.pointerup();
h.overlay.querySelector('[data-action="save"]').onclick();
assert.deepEqual(JSON.parse(h.storage.get(h.key)),[...old,[50,40]]);assert.equal(h.joystick.styles.left,'50vw');assert.equal(h.joystick.styles.top,'40vh');
const saved=JSON.parse(h.storage.get(h.key)),loaded=harness(saved);assert.equal(loaded.joystick.styles.left,'50vw','position survives remount');
loaded.preview.events.pointerdown({preventDefault(){},pointerId:2});loaded.preview.events.pointermove({pointerId:2,clientX:-100,clientY:1000});loaded.overlay.querySelector('[data-action="cancel"]').onclick();assert.equal(loaded.joystick.styles.left,'50vw','cancel leaves live joystick untouched');
const edge=harness([...old,[-100,1000]]);assert.equal(edge.joystick.styles.left,'6.800000000000001vw');assert.equal(edge.joystick.styles.top,'86.4vh');
edge.overlay.querySelector('[data-action="reset"]').onclick();edge.overlay.querySelector('[data-action="save"]').onclick();assert.equal(edge.joystick.styles.left,'8.4vw');assert.equal(edge.joystick.styles.top,'80vh');
const pve=harness(Array.from({length:10},()=>[40,50]),true);assert.equal(pve.joystick.styles.left,'40vw');assert(pve.preview);
const companionPreview=pve.canvas.children.find(c=>c.dataset.index===10);
assert(companionPreview,'companion mode has its own drag target');
companionPreview.events.pointerdown({preventDefault(){},pointerId:3});
companionPreview.events.pointermove({pointerId:3,clientX:700,clientY:200});
companionPreview.events.pointerup();
pve.overlay.querySelector('[data-action="save"]').onclick();
const pveSaved=JSON.parse(pve.storage.get(pve.key));
assert.deepEqual(pveSaved[10],[70,40]);
assert.deepEqual(pveSaved[9],[40,50],'moving companion does not move AUTO');
assert.equal(harness(pveSaved,true).registry.get('companionModeBtn').styles.left,'70vw');
const test=harness(null,false,'test');assert(!test.storage.has('mundoAbierto.pvpControls.normal'));
console.log('Joystick editor: legacy five-button saves preserved, sized PvP preview, drag/save/reload, cancel/reset, screen bounds and PvE compatibility.');
