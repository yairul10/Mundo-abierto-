import assert from 'node:assert/strict';
import {SYSTEM_SECTORS,SYSTEM_ROUTES,systemMapState,mountSystemMap} from '../js/system-map.js';
assert.deepEqual(SYSTEM_SECTORS.map(s=>s.id),['aurora','belt','ember','graveyard','pvp']);
for(const [level,count]of [[1,4],[9,4],[10,3],[29,3],[30,2],[39,2],[40,0],[138,0]])assert.equal(systemMapState(level,'aurora').filter(s=>s.locked).length,count);
assert.equal(systemMapState(138,'pvp').find(s=>s.current).id,'pvp');assert.equal(SYSTEM_ROUTES.length,5);assert(SYSTEM_ROUTES.some(r=>r.from==='aurora'&&r.to==='pvp'&&r.level===40));
const listeners={};
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={setProperty(k,v){this[k]=v}};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};}
 set className(value){this._className=value;this.classes=new Set(value.split(' '))}get className(){return this._className||''}
 set textContent(value){this._text=String(value);this.children=[]}get textContent(){return (this._text||'')+this.children.map(c=>c.textContent).join(' ')}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes;this._text=''}setAttribute(k,v){this.attributes[k]=v}
 querySelector(selector){this.queries||={};return this.queries[selector]??=new Element(selector==='.system-map-close'?'button':'div')}
 querySelectorAll(selector){return this.children.filter(c=>c.tag===selector)}addEventListener(k,v){this.events[k]=v}focus(){document.activeElement=this}
}
const body=new Element(),head=new Element(),trigger=new Element();globalThis.document={body,head,activeElement:trigger,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(key,handler)=>listeners[key]=handler};
let state={level:10,current:'aurora'},opens=0;
const api=mountSystemMap({trigger,getState:()=>state,onOpen:()=>opens++});
assert.equal(api.open,false);trigger.events.click();assert.equal(api.open,true);assert.equal(opens,1);assert(body.classes.has('system-map-open'));assert.equal(trigger.attributes['aria-expanded'],'true');
const overlay=body.children[0],nodes=overlay.querySelector('.system-map-nodes'),detail=overlay.querySelector('.system-map-detail');assert.equal(nodes.children.length,5);
const graveyard=nodes.children.find(c=>c.dataset.sector==='graveyard');assert(graveyard.classes.has('locked'));assert.equal(graveyard.children[0].textContent,'🔒');graveyard.onclick();assert(detail.textContent.includes('Bloqueado · Nivel 40'));assert(detail.textContent.includes('Acechadores'));assert.equal(state.current,'aurora','inspecting a sector never travels or changes player state');
state.level=40;api.refresh();assert.equal(nodes.children.filter(c=>c.classes.has('locked')).length,0);assert(detail.textContent.includes('Desbloqueado · Nivel 40'));
state.current='pvp';api.refresh();assert(nodes.children.find(c=>c.dataset.sector==='pvp').classes.has('current'));
let stopped=false;listeners.keydown({key:'Escape',preventDefault(){},stopPropagation(){stopped=true}});assert(stopped);assert.equal(api.open,false);assert.equal(document.activeElement,trigger);assert(!body.classes.has('system-map-open'));
trigger.events.keydown({key:'Enter',preventDefault(){}});assert.equal(api.open,true);overlay.events.click({target:overlay});assert.equal(api.open,false);
trigger.events.click();overlay.querySelector('.system-map-close').onclick();assert.equal(api.open,false);
assert.equal(mountSystemMap({trigger:null}).open,false);
console.log('System map: all five sectors, actual route thresholds, grey/locked state, current PvP location, blocked-sector inspection, refresh, minimap/keyboard open, outside/X/Escape close and focus restoration.');
