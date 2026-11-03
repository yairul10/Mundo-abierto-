import assert from 'node:assert/strict';
import {laserLevel,laserSpeed,laserUpgradeCost,buyLaserUpgrade} from '../js/laser-upgrade.js';
import {profile,makeCombatPlayer,volley,stepCombat} from '../server/pvp/combat.mjs';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
import {offlineRoster} from '../js/pvp-loadout.js';
const context={isPvpBase:true,isDocked:true};
const player={gold:3000000,loot:{nucleoNexo:155},ownedShips:{aurora:true},upgrades:{}};
const prices=[100000,200000,400000,800000,1500000];
assert.equal(laserSpeed(player),4000);
for(let level=0;level<5;level++){
 assert.deepEqual(laserUpgradeCost(player),{credits:prices[level],nuclei:5*2**level});
 for(const ctx of [{},{isPvpBase:true},{isDocked:true}]){const copy=structuredClone(player);assert.equal(buyLaserUpgrade(copy,ctx),false);assert.deepEqual(copy,player)}
 for(const field of ['gold','nuclei']){const copy=structuredClone(player);if(field==='gold')copy.gold=prices[level]-1;else copy.loot.nucleoNexo=5*2**level-1;const before=structuredClone(copy);assert.equal(buyLaserUpgrade(copy,context),false);assert.deepEqual(copy,before)}
 assert.equal(buyLaserUpgrade(player,context),true);
 assert.equal(laserSpeed(player),4000+440*(level+1));
 const raw=offlineRoster(player).profiles.aurora;
 const saved=serializeHangarEditor(createHangarEditor(player),player);
 assert.equal(laserLevel(saved),level+1);
 assert.equal(profile(raw).laserSpeedLevel,level+1);
 const pilot={id:'a',pos:[0,0,0],connected:true};makeCombatPlayer(pilot,raw);
 const bullets=volley({players:[pilot]},pilot,{weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},10000);
 assert.equal(Math.hypot(...bullets[0].vel),laserSpeed(player));
}
assert.equal(player.gold,0);assert.equal(player.loot.nucleoNexo,0);assert.equal(laserSpeed(player),6200);assert.equal(laserUpgradeCost(player),null);assert.equal(buyLaserUpgrade(player,context),false);
for(const value of [NaN,Infinity,'invalid',-5])assert.equal(laserSpeed({upgrades:{laserSpeed:value}}),4000);
assert.equal(profile({upgrades:{laserSpeed:999}}).laserSpeedLevel,5);
// A fast bolt crosses a small target between frames; server segment collision still hits.
const a={id:'a',pos:[0,0,0],connected:true},b={id:'b',pos:[0,0,-100],connected:true};
makeCombatPlayer(a,{attack:10,maxHp:100,maxEnergy:100,upgrades:{laserSpeed:5}});makeCombatPlayer(b,{maxHp:100,maxEnergy:100,defense:0});
const state={status:'active',players:[a,b],simTime:10000};volley(state,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},10000);stepCombat(state,10050);assert.equal(b.hp,95);
console.log('Laser: exact costs, base/max, PvP dock guards, atomic payments, persistence, roster/server parity and fast collision.');
