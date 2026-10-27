import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {ASSEMBLED_SHIPS,canAssembleShip,assembleShip,shipRole} from '../js/assembled-ships.js';
import {profile,makeCombatPlayer,ability,defenseDamage} from '../server/pvp/combat.mjs';
for(const [id,ship]of Object.entries(ASSEMBLED_SHIPS)){
 assert.deepEqual([ship.recipe.nucleo_demolicion,ship.recipe.bobina_anclaje,ship.recipe.cristal_punteria],id==='obsidian'?[200,200,200]:[100,100,100]);
 const player={level:40,gold:ship.cost,loot:{...ship.recipe},ownedShips:{aurora:true},shipId:'aurora'};
 const missing=structuredClone(player);missing.loot.cristal_punteria--;
 const before=JSON.stringify(missing);assert.equal(assembleShip(missing,id,ship.assemblyZone||'pve'),false);assert.equal(JSON.stringify(missing),before);
 assert.equal(canAssembleShip({...player,level:39},id,ship.assemblyZone||'pve'),false);
 assert.equal(assembleShip(player,id,ship.assemblyZone||'pve'),true);assert.equal(player.gold,0);assert.ok(Object.values(player.loot).every(v=>v===0));assert.equal(player.ownedShips.aurora,true);assert.equal(player.ownedShips[id],true);
 assert.equal(assembleShip(player,id,ship.assemblyZone||'pve'),false);assert.equal(JSON.parse(JSON.stringify(player)).ownedShips[id],true);
 const raw={shipId:id,hp:100,maxHp:100,energy:100,maxEnergy:100,attack:30,defense:5,speed:220};
 assert.equal(profile(raw).shipId,id);const p={};makeCombatPlayer(p,raw);assert.equal(ability(p,1000),true);assert.ok(p.abilityUntil>1000);
 if(shipRole(id)==='titan')assert.ok(defenseDamage(p,50,2000)<defenseDamage(p,50,10000)*.5);
}
assert.ok(ASSEMBLED_SHIPS.segadora.attack>1.35);
assert.ok(ASSEMBLED_SHIPS.bastion.hp>1.8&&ASSEMBLED_SHIPS.bastion.defense>1.5);
assert.ok(ASSEMBLED_SHIPS.centella.speed>1.4);
console.log('Assembled ships: exact recipes, atomic debit, permanent ownership, all assembled identities and abilities.');

const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const statsSource=game.slice(game.indexOf('function shipBonuses(id){'),game.indexOf('function changeShip(id){'));
const testPlayer={shipId:'aurora',maxHp:1000,hp:400,attack:100,defense:50,speed:220};
const sync=new Function('player','SHIP_TYPES','equippedBonus',statsSource+';return syncShipStats;')(testPlayer,{aurora:{hp:1,attack:1,defense:1,speed:1},...ASSEMBLED_SHIPS},()=>({hp:1}));
for(const id of ['obsidian','segadora','bastion','centella','bastion','aurora']){
 testPlayer.shipId=id;sync();assert.ok(Math.abs(testPlayer.hp/testPlayer.maxHp-.4)<1e-9);
}
assert.deepEqual([testPlayer.maxHp,testPlayer.hp,testPlayer.attack,testPlayer.defense,testPlayer.speed],[1000,400,100,50,220]);
console.log('Ship swaps preserve hull percentage and restore base stats without stacking.');
