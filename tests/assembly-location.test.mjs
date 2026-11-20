import assert from 'node:assert/strict';
import {ASSEMBLED_SHIPS,canAssembleShip,assembleShip} from '../js/assembled-ships.js';
for(const [id,ship] of Object.entries(ASSEMBLED_SHIPS).filter(([,ship])=>!ship.adminOnly)){
 for(const zone of ['pve','pvp']){
  const pilot={level:100,gold:2000000,loot:{...ship.recipe},ownedShips:{aurora:true},shipId:'aurora'};
  assert.equal(canAssembleShip(pilot,id,zone),true,`${id}: available in ${zone}`);
  assert.equal(assembleShip(pilot,id,zone),true);
  assert.equal(pilot.gold,2000000-ship.cost);
  for(const key of Object.keys(ship.recipe))assert.equal(pilot.loot[key],0,`${id}: material ${key} debited`);
  assert.equal(pilot.shipId,'aurora','Assembly must not auto-equip');
  assert.equal(pilot.ownedShips[id],true);
  const after=structuredClone(pilot);
  assert.equal(assembleShip(pilot,id,zone),false,'No double debit');
  assert.deepEqual(pilot,after);
 }
 const missing={level:100,gold:2000000,loot:{...ship.recipe},ownedShips:{aurora:true}};
 const material=Object.keys(ship.recipe)[0];missing.loot[material]--;
 const before=structuredClone(missing);
 assert.equal(assembleShip(missing,id,'pve'),false,'Missing materials prevent assembly');
 assert.deepEqual(missing,before,'A failed assembly must not debit resources');
}
console.log('Assembly: both bases, resource costs, permanent ownership and no automatic equip.');
