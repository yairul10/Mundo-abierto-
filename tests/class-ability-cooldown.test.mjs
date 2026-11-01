import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeCombatPlayer,ability} from '../server/pvp/combat.mjs';
import {reset} from '../server/pvp/world-rules.mjs';
for(const shipId of ['titan','bastion','egida','segadora','centella','obsidian']){
 test(`${shipId}: cooldown is 25 seconds from activation, with no energy loss on rejection`,()=>{
  const p={pos:[0,120,0]};makeCombatPlayer(p,{shipId,maxHp:1000,maxEnergy:1000,energy:1000});
  assert(ability(p,10000));assert.equal(p.abilityReadyAt,35000);
  const remaining=p.energy;
  assert.equal(ability(p,p.abilityUntil),false);
  assert.equal(ability(p,34999),false);assert.equal(p.energy,remaining);
  assert(ability(p,35000));assert.equal(p.abilityReadyAt,60000);
  reset(p);assert.equal(p.abilityReadyAt,0);
 });
}
test('browser rejects an early activation after the effect finishes',()=>{
 const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
 const table=source.slice(source.indexOf('const SHIP_ABILITIES='),source.indexOf('const SPECIAL_UPGRADES='));
 const activation=source.slice(source.indexOf('function activateClassAbility(){'),source.indexOf('function classAbilityActive('));
 const context={player:{shipId:'bastion',energy:1000},PVP_MODE:false,classAbilityTime:0,classAbilityCd:0,docked:false,landing:false,inSafeZone:()=>false,playerMesh:{position:{}},combatAudio:{play(){}},abilityDuration:()=>6,pvpSession:null,hud(){},lootToast(){}};
 vm.createContext(context);vm.runInContext(table+activation,context);
 vm.runInContext('for(const skill of Object.values(SHIP_ABILITIES))if(skill.cooldown!==25)throw Error("Wrong cooldown");activateClassAbility();',context);
 assert.equal(context.classAbilityCd,25);assert.equal(context.player.energy,945);
 context.classAbilityTime=0;context.classAbilityCd=19;context.activateClassAbility();
 assert.equal(context.player.energy,945);
 context.classAbilityCd=0;context.activateClassAbility();assert.equal(context.player.energy,890);
});
