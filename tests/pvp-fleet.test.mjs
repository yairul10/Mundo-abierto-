import assert from 'node:assert/strict';
import {ASSEMBLED_SHIPS,assembleShip} from '../js/assembled-ships.js';
import {offlineRoster,pvpRoster,pveMultipliers} from '../js/pvp-loadout.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
import {equip,importRoster,useAbility} from '../server/pvp/world-rules.mjs';
const pairs={azote:'segadora',egida:'bastion',vertigo:'centella'};
for(const [id,parent]of Object.entries(pairs)){
 const ship=ASSEMBLED_SHIPS[id],base=ASSEMBLED_SHIPS[parent];
 for(const key of ['hp','attack','defense','speed'])assert.equal(ship[key],Number((base[key]+.1).toFixed(2)));
 const pilot={shipId:'aurora',level:40,gold:ship.cost,loot:{...ship.recipe},ownedShips:{aurora:true},shipBaseStats:{maxHp:1000,attack:200,defense:100,speed:300},formations:{fan:true}};
 const before=structuredClone(pilot);assert.equal(assembleShip(pilot,id,'pve'),false);assert.deepEqual(pilot,before);assert.equal(assembleShip(pilot,id,'pvp'),true);
 pilot.shipId=id;
 const normal=pveMultipliers(id),offline=offlineRoster(pilot).profiles[id];
 assert.deepEqual([offline.maxHp,offline.attack,offline.defense,offline.speed],[1000*normal.hp,Math.round(200*normal.attack),Math.round(100*normal.defense),Math.round(300*normal.speed)]);
 const editor=createHangarEditor(pilot);editor.hp=editor.maxHp*.4;
 const saved=serializeHangarEditor(editor,pilot);assert.deepEqual(saved.shipBaseStats,pilot.shipBaseStats);assert.equal(saved.maxHp,offline.maxHp);
 for(let i=0;i<4;i++){
  const roster=pvpRoster(saved),p={roster:importRoster(roster.profiles)};assert(equip(p,id));
  assert.equal(p.profile.maxHp,Math.round(1000*ship.hp)*20);assert.equal(p.profile.attack,Math.round(200*ship.attack));
  const back=serializeHangarEditor(createHangarEditor(saved),saved);assert.equal(back.attack,offline.attack);assert.equal(back.speed,offline.speed);assert.equal(back.hp/back.maxHp,.4);
 }
}
const p={id:'v',connected:true,pos:[900,120,0],roster:importRoster(pvpRoster({shipId:'vertigo',ownedShips:{vertigo:true},maxEnergy:100,shipBaseStats:{maxHp:1000,attack:200,defense:100,speed:300}}).profiles)};
equip(p,'vertigo');p.paralyzedUntil=10000;assert(useAbility({players:[p]},p,2000));assert.equal(p.paralyzedUntil,0);
console.log('PvP fleet: exact +0.1 stats, PvE-only -0.5, zone restriction, saved bases and repeated round trips stable, Vértigo cleanse.');
