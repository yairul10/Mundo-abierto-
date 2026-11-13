import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../server/pvp/world-rules.mjs',import.meta.url),'utf8');
test('cooperative skill selection and activation are rejected before any side effects',()=>{
 const body=rules.slice(rules.indexOf('export function setSkills('),rules.indexOf('// A tactical formation change')).replaceAll('export function','function');
 const api=new Function(body+';return {setSkills,usePvpSkill}')();
 for(const state of [{cooperative:true},{realm:'test'}]){
  const p={equippedSkills:['fury','luck'],skillUntil:{},skillReadyAt:{},last_missile:10000};const before=JSON.stringify(p);
  assert.equal(api.setSkills(state,p,['interference','instantShield']), 'skills_disabled');
  for(const id of ['fury','luck','instantShield','transfer','paralyze','interference'])assert.equal(api.usePvpSkill(state,p,id,20000,'target'),'skills_disabled');
  assert.equal(JSON.stringify(p),before);
 }
});
test('cooperative advancement removes only PvP power effects and retains enemy paralysis',()=>{
 const prefix=rules.slice(rules.indexOf('export function advance(s,now){')+'export function advance(s,now){'.length,rules.indexOf(' if((s.cooperative===true||s.realm'));
 const run=new Function('s','constrainCorridor',prefix);
 const p={pos:[0,120,1000],skillUntil:{fury:100000},skillReadyAt:{fury:200000},paralyzedUntil:50000,equippedSkills:['fury','luck']};
 run({cooperative:true,players:[p]},()=>{});assert.deepEqual(p.skillUntil,{});assert.deepEqual(p.skillReadyAt,{});assert.equal(p.paralyzedUntil,50000);assert.deepEqual(p.equippedSkills,['fury','luck']);
 const q={pos:[0,120,1000],skillUntil:{fury:100000}};run({players:[q]},()=>{});assert.equal(q.skillUntil.fury,100000);
});
test('cooperative UI hides skills, blocks clicks, and preserves future PvP choices',()=>{
 const code=readFileSync(new URL('../js/pvp-skills-ui.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'const presentCombatButton=()=>{};\n').replace('export function','function');
 const elements=[];class Element{constructor(){this.children=[];this.classList={toggle(){}};elements.push(this)}append(...x){this.children.push(...x)}appendChild(x){this.append(x)}setAttribute(k,v){this[k]=v}addEventListener(){}replaceChildren(...x){this.children=x}}
 const doc={createElement:()=>new Element(),getElementById:()=>null,body:new Element()};let sent=0,writes=0;const me={equippedSkills:['fury','luck'],paralyzedUntil:0};
 const getState=()=>({state:{rules:{cooperative:true,skills:{}}},me,now:1000});
 const mount=new Function('document','addEventListener',code+';return mountPvpSkills')(doc,()=>{});
 const ui=mount({tools:new Element(),getState,canUse:()=>true,send:()=>sent++,isHangarOpen:()=>false,storage:{getItem:()=>JSON.stringify(['fury','luck']),setItem(){writes++}},key:'skills'});
 ui.update();const bar=elements.find(e=>e.id==='pvpSkills'),equipment=elements.find(e=>e.id==='pvpSkillEquipment');
 assert.equal(bar.hidden,true);assert.equal(equipment.hidden,true);
 for(const button of elements.filter(e=>String(e.id||'').startsWith('pvpSkillButton'))){assert.equal(button.disabled,true);assert.equal(button.hidden,true);button.onclick()}
 assert.equal(sent,0);assert.equal(writes,0);assert.deepEqual(ui.saved,['fury','luck']);
 me.paralyzedUntil=4000;ui.update();assert.equal(bar.hidden,false,'enemy paralysis still has a visible status');
});
