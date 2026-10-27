import assert from 'node:assert/strict';
import {settleRespawn,finishPvpTransfer} from '../js/pvp-settlement.js';
import {applyBossReceipts} from '../js/pvp-boss-rewards.js';
import {pilotXpNeed} from '../js/pilot-xp.js';
const key='mundoAbierto.player';let raw=JSON.stringify({level:100,xp:pilotXpNeed(100)-5,gold:5000,shipId:'aurora',maxHp:1000,maxEnergy:500,attack:100,defense:50,shipBaseStats:{maxHp:1000,attack:100,defense:50,speed:220},ownedShips:{aurora:true},loot:{nucleoNexo:50}}),fail=false;
const storage={getItem:()=>raw,setItem(k,v){if(fail)throw Error('quota');raw=v}};
const before=raw,bill={id:'respawn:test',destination:'pvp',cost:5000};fail=true;assert.throws(()=>settleRespawn(storage,key,bill),/quota/);assert.equal(raw,before);fail=false;assert.equal(settleRespawn(storage,key,bill).gold,0);assert.equal(settleRespawn(storage,key,bill).gold,0,'Retry never debits twice');
assert.throws(()=>settleRespawn(storage,key,{id:'next',destination:'pvp',cost:5000}),/suficientes/);
const result=applyBossReceipts(JSON.parse(before),[{id:'pvp:kill',amount:0,xp:10}]);assert.equal(result.added,0);assert.equal(result.addedXp,10);assert.equal(result.pilot.level,101);assert.equal(result.pilot.xp,5);assert.equal(result.pilot.shipBaseStats.maxHp,1010);assert.equal(result.pilot.loot.nucleoNexo,50);assert.equal(applyBossReceipts(result.pilot,[{id:'pvp:kill',amount:0,xp:10}]).addedXp,0);
assert.equal(applyBossReceipts(JSON.parse(before),[{id:'invalid',amount:0,xp:0}]).ids.length,0);
console.log('Death debit is atomic/idempotent; XP-only PvP receipts level up exactly once without granting cores.');

raw=before;settleRespawn(storage,key,{id:'transfer',destination:'pvp',cost:5000,transfer:true});assert.equal(JSON.parse(raw).gold,0);assert.equal(finishPvpTransfer(storage,key,true).gold,5000,'Failed/full-server entry is refunded');assert.equal(finishPvpTransfer(storage,key,true).gold,5000,'Refund is idempotent');assert.equal(JSON.parse(raw).hp,0,'A failed transfer keeps the death choice pending');
raw=before;settleRespawn(storage,key,{id:'confirmed',destination:'pvp',cost:5000,transfer:true});finishPvpTransfer(storage,key,false);assert.equal(finishPvpTransfer(storage,key,true).gold,0,'An admitted pilot cannot refund a completed revival');
