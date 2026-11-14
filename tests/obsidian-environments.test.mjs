import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_STATS,fleetMultipliers} from '../js/fleet-balance.js';
import {offlineRoster,pvpRoster,cooperativeRoster,cooperativeMultipliers} from '../js/pvp-loadout.js';
import {importRoster,equip,changeFormation} from '../server/pvp/world-rules.mjs';
const source={shipId:'obsidian',level:100,shipBaseStats:{maxHp:1000,attack:1000,defense:100,speed:1000},ownedShips:Object.fromEntries(Object.keys(HOME_STATS).map(id=>[id,true])),formations:{fan:true,fortress:true},droneCount:1,droneFormation:'fan'};
test('Obsidian keeps current PvP coefficients and shares its secondary profile between PvE and cooperative',()=>{
 assert.deepEqual(fleetMultipliers('obsidian','pvp'),{hp:2.2,attack:2.2,defense:1,speed:2.2});
 assert.deepEqual(cooperativeMultipliers('obsidian'),fleetMultipliers('obsidian','pve'));
 assert.deepEqual(cooperativeMultipliers('obsidian'),{hp:1.54,attack:1.54,defense:1,speed:1.54});
 const before=structuredClone(source),pvp=pvpRoster(source).profiles.obsidian,pve=offlineRoster(source).profiles.obsidian,coop=cooperativeRoster(source).profiles.obsidian;
 for(const key of ['maxHp','attack','defense','speed'])assert.equal(coop[key],pve[key]);
 assert.equal(pvp.maxHp,2200);assert.equal(coop.maxHp,1540);assert.deepEqual(source,before);
});
test('all other ships retain their existing cooperative stats',()=>{
 const a=pvpRoster(source).profiles,b=cooperativeRoster(source).profiles;
 for(const id of Object.keys(a))if(id!=='obsidian')assert.deepEqual(b[id],a[id],id);
});
test('authoritative equip and live formations preserve cooperative Obsidian without stacking modifiers',()=>{
 const p={connected:true,clientVersion:5,corridor:true,roster:importRoster(cooperativeRoster(source).profiles)};
 assert.ok(equip(p,'obsidian'));assert.equal(p.profile.maxHp,30800);assert.equal(p.profile.attack,1540);assert.equal(p.profile.speed,1540);
 p.hp=p.profile.maxHp/2;assert.equal(changeFormation(p,'fortress'),null);assert.equal(p.profile.maxHp,35420);assert.equal(p.hp,17710);
 assert.equal(changeFormation(p,'fan'),null);assert.equal(p.profile.maxHp,30800);assert.equal(p.hp,15400);
 assert.ok(equip(p,'obsidian'));assert.equal(p.profile.maxHp,30800);
});
