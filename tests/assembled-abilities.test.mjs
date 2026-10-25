import assert from 'node:assert/strict';
import {makeCombatPlayer,ability,volley,defenseDamage} from '../server/pvp/combat.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function pilot(id){const p={id,connected:true,pos:[0,0,0]};makeCombatPlayer(p,{shipId:id,hp:1000,maxHp:1000,energy:200,maxEnergy:200,attack:100,defense:0});assert.equal(ability(p,10000),true);return p}
for(const [id,mult]of [['espectro',1.6],['segadora',1.7],['azote',1.7]]){
 const p=pilot(id),s={players:[p,{id:'target',pos:[0,0,500]}]},shot={offset:[0,0,0],direction:[0,0,1]};
 close(volley(s,p,{weapon:'laser',shots:[shot]},10000)[0].damage,50*mult);
 close(defenseDamage(p,100,10001,()=>1),['segadora','azote'].includes(id)?120:130);
 assert.equal(p.energy,135);assert.equal(p.abilityUntil,15000);
}
for(const [id,mult]of [['titan',.3],['bastion',.2],['egida',.2]]){
 const p=pilot(id);close(defenseDamage(p,100,10001),90*mult);assert.equal(p.energy,145);assert.equal(p.abilityUntil,16000);
}
for(const [id,allowsAt500]of [['aurora',false],['centella',true],['vertigo',true]]){
 const p=pilot(id),s={players:[p,{id:'target',pos:[0,0,500]}]},m={weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,1]}]};
 assert.ok(volley(s,p,m,10000));assert.equal(!!volley(s,p,m,10500),allowsAt500);
 assert.equal(p.energy,160);assert.equal(p.abilityUntil,15000);
}
console.log('New fleet abilities: enhanced cadence, shield and fury; original effects, durations and energy preserved.');
