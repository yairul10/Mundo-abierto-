import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage} from '../server/pvp/arena-enemies.mjs';
const now=100000;
const pilot=id=>({id,pos:[1200,120,0],connected:true,hp:10000});
const eligible=p=>p.connected&&p.hp>0;
for(const kind of ['colossusPro','granTitanPro'])test(kind+': escorts survive parent death and restart, reward once, expire on parent respawn',()=>{
 const a=pilot('a'),b=pilot('new-pilot'),s={players:[a,b],events:[],bullets:[]};ensureArenaEnemies(s,now);
 const parent=s.arenaEnemies.find(e=>e.kind===kind);recordArenaDamage(s,parent,a,1,now);parent.hp=parent.maxHp*.1;advanceArenaEnemies(s,now+100,eligible,()=>.5);
 const adds=s.arenaEnemies.filter(e=>e.parentId===parent.id);assert.equal(adds.length,6);const survivorId=adds[0].instanceId;
 parent.hp=0;advanceArenaEnemies(s,now+200,eligible,()=>.5);assert.equal(adds.filter(e=>e.hp>0).length,6);
 const saved=JSON.parse(JSON.stringify(s));advanceArenaEnemies(saved,now+300,eligible,()=>.5);const restored=saved.arenaEnemies.find(e=>e.instanceId===survivorId);assert(restored?.hp>0);
 b.pos=restored.pos.map((v,i)=>v+(i===0?100:0));saved.players[1]=b;
 recordArenaDamage(saved,restored,b,1,now+400);restored.hp--;restored.nextAttackAt=now+400;advanceArenaEnemies(saved,now+400,eligible,()=>.5);
 assert(saved.bullets.some(e=>e.owner===restored.id)||restored.charge?.targets.some(t=>t.targetId===b.id),'Surviving escort attacks or announces its specialized attack against a new participant');
 restored.hp=0;advanceArenaEnemies(saved,now+500,eligible,()=>.5);const receipts=saved.bossRewards.filter(e=>e.bossId===survivorId);assert.equal(receipts.length,1);assert.equal(receipts[0].playerId,b.id);assert(receipts[0].amount>0);assert(receipts[0].xp>0);
 const replay=JSON.parse(JSON.stringify(saved));advanceArenaEnemies(replay,now+600,eligible,()=>.5);assert.equal(replay.bossRewards.filter(e=>e.bossId===survivorId).length,1);
 const deadParent=replay.arenaEnemies.find(e=>e.id===parent.id),oldInstance=deadParent.instanceId;advanceArenaEnemies(replay,deadParent.respawnAt,eligible,()=>.5);const respawned=replay.arenaEnemies.find(e=>e.id===parent.id);assert.notEqual(respawned.instanceId,oldInstance);assert.equal(replay.arenaEnemies.filter(e=>e.parentInstance===oldInstance).length,0,'Old escorts removed only on a new boss instance');assert.equal(respawned.hp,respawned.maxHp);
});
