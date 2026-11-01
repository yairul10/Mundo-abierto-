import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOME_STATS,fleetMultipliers,savedPveMultipliers} from '../js/fleet-balance.js';
import {offlineRoster,pvpRoster} from '../js/pvp-loadout.js';
import {equip,importRoster,SHIPS} from '../server/pvp/world-rules.mjs';
import {SHIP_PREVIEWS} from '../js/ship-preview-catalog.js';
const pairs={bastion:'titan',segadora:'espectro',centella:'agilbasica'};
for(const [advanced,basic] of Object.entries(pairs)){
 for(const key of ['hp','attack','speed'])assert(fleetMultipliers(advanced)[key]>=fleetMultipliers(basic)[key]);
}
for(const [id,base] of Object.entries({egida:'bastion',azote:'segadora',vertigo:'centella'})){
 for(const key of ['hp','attack','speed'])assert.equal(fleetMultipliers(id,'pvp')[key],Math.round((fleetMultipliers(base)[key]+.1)*100)/100);
}
const expected={aurora:[.7,.7,1,.7],agilbasica:[.7,.7,1,1.05],titan:[1.05,.7,1,.7],espectro:[.7,1.05,1,.7],bastion:[1.4,1.05,1,1.05],segadora:[1.05,1.4,1,1.05],centella:[1.05,1.05,1,1.4],egida:[2.1,1.6,1,1.6],azote:[1.6,2.1,1,1.6],vertigo:[1.6,1.6,1,2.1],obsidian:[2.2,2.2,1,2.2]};
const source={shipId:'segadora',ownedShips:Object.fromEntries(Object.keys(expected).map(id=>[id,true])),shipBaseStats:{maxHp:1000,attack:100,defense:100,speed:100},maxEnergy:1000};
const snapshot=structuredClone(source),roster=pvpRoster(source);
for(const [id,values] of Object.entries(expected)){
 assert.deepEqual(Object.values(fleetMultipliers(id,'pvp')),values);
 assert.equal(fleetMultipliers(id).defense,1);
 const p={roster:importRoster(roster.profiles)};assert(equip(p,id));
 assert.equal(p.profile.maxHp,1000*values[0]*20);assert.equal(p.profile.attack,Math.round(100*values[1]));
 assert.equal(SHIP_PREVIEWS[id].name,id==='aurora'?'Cadete':id==='agilbasica'?'Aurora':SHIP_PREVIEWS[id].name);
}
for(const id of ['egida','azote','vertigo'])for(const key of ['hp','attack','speed'])assert(fleetMultipliers('obsidian','pvp')[key]>fleetMultipliers(id,'pvp')[key]);
assert.deepEqual(source,snapshot);
// Legacy recovery preserves upgrades rather than dividing an old save by new coefficients.
const legacy={shipId:'segadora',ownedShips:{segadora:true},maxHp:1100,attack:185,defense:95,speed:105,maxEnergy:100};
assert.deepEqual(offlineRoster(legacy).base,{maxHp:1000,attack:100,defense:100,speed:100});
assert.deepEqual(savedPveMultipliers({fleetBalanceVersion:2},'segadora'),{hp:1.5,attack:2,defense:1,speed:1.5});
assert.deepEqual(SHIPS,HOME_STATS);
assert.deepEqual(HOME_STATS.aurora,[1,1,1,1]);
console.log('Fleet progression: upgrades, both environment conversions, exact server loadouts, ownership and legacy saves pass.');

const admin={clientVersion:4,adminShipAllowed:true,roster:importRoster(pvpRoster(source).profiles)};assert(equip(admin,'adminpod'));assert.equal(admin.profile.maxHp,300000);assert.equal(admin.profile.attack,160);assert.equal(admin.profile.defense,100);assert.equal(admin.profile.speed,170);
