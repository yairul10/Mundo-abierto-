import assert from 'node:assert/strict';
import {equip,changeFormation,importRoster} from '../server/pvp/world-rules.mjs';
const raw={shipId:'aurora',maxHp:1000,maxEnergy:100,attack:50,defense:25,speed:300,droneCount:8,droneFormation:'fan',ownedFormations:['fan','fortress','drive','shield','spear','hunter','recovery'],boosters:{resistance:true}};
const p={connected:true,hp:1,roster:importRoster({aurora:raw})};equip(p,'aurora');p.hp=8000;p.energy=37;p.abilityUntil=12345;p.last_laser=456;p.skillReadyAt={fury:987};p.paralyzedUntil=654;
for(let n=0;n<5;n++){
 assert.equal(changeFormation(p,'fortress'),null);assert.equal(p.profile.maxHp,23000);assert.equal(p.hp,9200);
 assert.equal(changeFormation(p,'drive'),null);assert.equal(p.profile.speed,336.00000000000006);assert.equal(p.hp,8000);
 assert.equal(changeFormation(p,'shield'),null);assert.equal(p.profile.resistance,.85*.85);
 assert.equal(changeFormation(p,'spear'),null);assert.equal(p.profile.droneDamage,1.2);
 assert.equal(changeFormation(p,'hunter'),null);assert.equal(p.profile.droneRange,1380);
 assert.equal(changeFormation(p,'recovery'),null);assert.equal(p.profile.repairBonus,1.25);
 assert.equal(changeFormation(p,'fan'),null);assert.equal(p.profile.maxHp,20000);assert.equal(p.hp,8000);
}
assert.equal(p.energy,37);assert.equal(p.abilityUntil,12345);assert.equal(p.last_laser,456);assert.equal(p.skillReadyAt.fury,987);assert.equal(p.paralyzedUntil,654);
const before=structuredClone(p);assert.equal(changeFormation(p,'bogus'),'invalid_formation');assert.deepEqual(p,before);
p.roster.aurora.ownedFormations=['fan'];assert.equal(changeFormation(p,'shield'),'invalid_formation');p.hangar=true;assert.equal(changeFormation(p,'fan'),'invalid_formation');
console.log('Live formations: all bonuses, owned-only switching, stable HP ratio, no healing/cooldown/energy reset.');
