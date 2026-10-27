import assert from 'node:assert/strict';
import {pvpMultipliers,pvpRoster,offlineRoster} from '../js/pvp-loadout.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
import {equip,importRoster} from '../server/pvp/world-rules.mjs';
const expected={azote:[1.2,1.95,1.05,1.15],egida:[2.6,1.1,2.1,.95],vertigo:[1.05,1.2,.95,1.95],obsidian:[2.4,2.25,2.1,1.7],aurora:[.5,.5,.5,.5],titan:[1.3,.35,1,.25],espectro:[.2,.85,.15,.9],segadora:[.6,1.35,.45,.55],bastion:[2,.5,1.5,.35],centella:[.45,.6,.35,1.35]};
const source={shipId:'obsidian',level:50,ownedShips:Object.fromEntries(Object.keys(expected).map(id=>[id,true])),shipBaseStats:{maxHp:1000,attack:200,defense:100,speed:300},maxHp:1900,hp:950,attack:350,defense:160,speed:360,droneCount:8,formations:{fortress:true},droneFormation:'fortress'};
const before=structuredClone(source),arena=pvpRoster(source),normal=offlineRoster(source);
for(const [id,values]of Object.entries(expected)){
 assert.deepEqual(Object.values(pvpMultipliers(id)),values);
 const q=arena.profiles[id];assert.deepEqual([q.maxHp,q.attack,q.defense,q.speed],[Math.round(1000*values[0]*1.15),Math.round(200*values[1]),Math.round(100*values[2]),Math.round(300*values[3])]);
 const pilot={roster:importRoster(arena.profiles)};for(let i=0;i<3;i++){assert.ok(equip(pilot,id));assert.equal(pilot.hp,q.maxHp*20);assert.equal(pilot.profile.attack,q.attack)}
}
assert.deepEqual(source,before);assert.deepEqual(pvpRoster(source),arena);
assert.equal(normal.profiles.obsidian.attack,350);
const saved=serializeHangarEditor(createHangarEditor(source),source);assert.equal(saved.attack,350);assert.equal(saved.speed,360);assert.deepEqual(saved.shipBaseStats,source.shipBaseStats);
console.log('PvP: exact additive coefficients for all ten ships, formation applied once, repeated equip stable, PvE save unchanged.');
