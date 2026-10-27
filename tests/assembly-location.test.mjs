import assert from 'node:assert/strict';
import {ASSEMBLED_SHIPS,canAssembleShip,assembleShip} from '../js/assembled-ships.js';
for(const [id,ship]of Object.entries(ASSEMBLED_SHIPS).filter(([,ship])=>!ship.adminOnly)){
 const zone=ship.assemblyZone||'pve',other=zone==='pve'?'pvp':'pve';
 const pilot={level:100,gold:2000000,loot:{...ship.recipe},ownedShips:{aurora:true},shipId:'aurora'};
 const before=structuredClone(pilot);
 assert.equal(canAssembleShip(pilot,id,other),false);assert.equal(assembleShip(pilot,id,other),false);assert.deepEqual(pilot,before);
 assert.equal(assembleShip(pilot,id,zone),true);assert.equal(pilot.shipId,'aurora','Assembly must not auto-equip');assert.equal(pilot.ownedShips[id],true);
 assert.equal(assembleShip(pilot,id,zone),false,'No double debit');
}
console.log('Assembly: PvE/PvP base restrictions, no debit in wrong zone, permanent ownership, no automatic equip.');
