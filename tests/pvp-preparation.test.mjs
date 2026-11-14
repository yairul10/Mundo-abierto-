import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PVP_SKILLS} from '../server/pvp/skills.mjs';
test('PvP preparation edits powers outside a hangar and locks selection during battle',()=>{
 const source=readFileSync(new URL('../js/pvp-skills-ui.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'const presentCombatButton=()=>{};\n').replace('export function','function');
 const nodes=[];class Element{constructor(){this.children=[];this.style={};this.classList={toggle(){}};nodes.push(this)}append(...x){this.children.push(...x)}setAttribute(k,v){this[k]=v}addEventListener(){}replaceChildren(...x){this.children=x}}
 const host=new Element(),document={createElement:()=>new Element(),getElementById:()=>null,body:new Element()},sent=[];
 let preparing=true;const state={rules:{skills:PVP_SKILLS,safeRadius:0,pvpSkills:true,cooperative:false}},me={hp:100,pos:[0,120,700],protected:true,equippedSkills:['fury','instantShield'],skillUntil:{},skillReadyAt:{}};
 const mount=new Function('document','addEventListener',source+';return mountPvpSkills')(document,()=>{}),ui=mount({tools:host,equipmentHost:host,isPreparing:()=>preparing,getState:()=>({state,me,now:10000}),canUse:()=>!preparing,isHangarOpen:()=>false,send:m=>sent.push(m),storage:{getItem:()=>null,setItem(){}},key:'pvp'});
 ui.update();const equipment=nodes.find(n=>n.id==='pvpSkillEquipment'),bar=nodes.find(n=>n.id==='pvpSkills'),selects=nodes.filter(n=>String(n.id||'').startsWith('pvpSkillSelect'));
 assert.equal(equipment.hidden,false);assert.equal(bar.hidden,true);assert.ok(host.children.includes(equipment));assert.ok(selects.slice(0,2).every(n=>!n.disabled));
 selects[0].value='luck';selects[0].onchange();assert.equal(sent[0].type,'skills');assert.equal(new Set(sent[0].skills).size,2);
 preparing=false;me.protected=false;ui.update();assert.equal(equipment.hidden,true);assert.equal(bar.hidden,false);assert.ok(selects.every(n=>n.disabled));
 const button=nodes.find(n=>n.id==='pvpSkillButton0');button.onclick();assert.equal(sent.at(-1).type,'pvpSkill');me.skillReadyAt.fury=20000;ui.update();const count=sent.length;button.onclick();assert.equal(sent.length,count);
 state.rules.skillSlots=3;me.equippedSkills=['fury','instantShield','paralyze'];preparing=true;me.protected=true;ui.update();assert.equal(selects[2].disabled,false);selects[2].value='fury';selects[2].onchange();assert.equal(sent.at(-1).skills.length,3);assert.equal(new Set(sent.at(-1).skills).size,3);state.rules.cooperative=true;ui.update();assert.equal(bar.hidden,true);assert.equal(equipment.hidden,true);
});
