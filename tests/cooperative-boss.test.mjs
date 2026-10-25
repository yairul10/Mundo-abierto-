import assert from 'node:assert/strict';
import {BOSS_RULES,advanceBossMotion,bossPatrolPosition,ensureBoss,recordBossDamage,tickBoss,splitBossReward,bossSnapshot} from '../server/pvp/cooperative-boss.mjs';
import {equip,advance,attack,updateProtection,combatEligible} from '../server/pvp/world-rules.mjs';
const t=100000;
function pilot(id,pos,hp=20000){const p={id,connected:true,pos,roster:{aurora:{maxHp:1000,maxEnergy:500,attack:100000,defense:0}}};equip(p,'aurora');p.hp=hp;updateProtection(p,t);return p}
const world=(...players)=>({players,events:[],bullets:[],simTime:t});
{
 const a=pilot('a',[0,120,-1500]),b=pilot('b',[100,120,-1500],19000),c=pilot('c',[-100,120,-1500],18000),d=pilot('d',[150,120,-1500],21000),safe=pilot('safe',[0,120,0]),far=pilot('far',[2500,120,0]),s=world(a,b,c,d,safe,far),boss=ensureBoss(s,t);
 assert.equal(boss.hp,1000000);assert.equal(bossSnapshot(boss).contributions,undefined);tickBoss(s,t,combatEligible);assert.equal(a.hp,20000,'Neutral until attacked');
 recordBossDamage(boss,a,10,t);tickBoss(s,t+2999,combatEligible);assert.equal(a.hp,20000);assert.deepEqual(bossSnapshot(boss).aimTargets.map(x=>x.targetId),['c','b','a'],'Public pre-aim selects the three lowest-current-HP eligible pilots');assert.equal(bossSnapshot(boss).nextAttackAt,t+3000);tickBoss(s,t+3000,combatEligible);assert.equal(a.hp,15000);assert.equal(b.hp,14000);assert.equal(c.hp,13000);assert.deepEqual(boss.lastAttack.targets.map(h=>h.targetId),['c','b','a']);
 tickBoss(s,t+6000,combatEligible);assert.equal(c.hp,8000);assert.equal(a.hp,10000);assert.equal(b.hp,9000);assert.deepEqual(boss.lastAttack.targets.map(h=>h.targetId),['c','b','a'],'Re-rank all pilots using current HP before each volley');assert.equal(safe.hp,20000);assert.equal(far.hp,20000);assert.equal(d.hp,21000,'Fourth eligible pilot with more HP is not selected');
 b.pos=[0,120,-620];updateProtection(b,t+6001);b.hp=30000;tickBoss(s,t+12000,combatEligible);assert.equal(b.hp,30000,'Protected base cannot be hit');assert(!bossSnapshot(boss).aimTargets.some(x=>x.targetId==='b'),'Protected pilots are removed from cannon aiming');
 const seq=boss.attackSeq;tickBoss(s,t+600000,combatEligible);assert.equal(boss.attackSeq,seq+1,'No burst after long inactivity');
}
{
 const a=pilot('solo',[0,120,-1500]),s=world(a),b=ensureBoss(s,t);recordBossDamage(b,a,1,t);tickBoss(s,t+3000,combatEligible);assert.equal(a.hp,5000);assert.equal(b.lastAttack.targets.length,1,'Solo pilots receive the entire 15000 damage volley in one hit');
}
{
 const a=pilot('a',[0,120,-1500]),b=pilot('b',[100,120,-1500]),s=world(a,b),boss=ensureBoss(s,t);
 recordBossDamage(boss,a,1,t);tickBoss(s,t+3000,combatEligible);
 assert.equal(a.hp,12500);assert.equal(b.hp,12500);
 assert.equal(boss.lastAttack.targets.reduce((sum,hit)=>sum+hit.damage,0),15000,'Two pilots split the full volley equally');
}
{
 const a=pilot('mover',[0,120,-1500]),s=world(a),b=ensureBoss(s,t),start=[...b.pos];advanceBossMotion(s,t+1000,combatEligible);assert(Math.hypot(...b.pos.map((v,i)=>v-start[i]))>50,'Neutral boss patrols');assert.equal(b.teleportSeq,0);
 const hitAt=t+1000;recordBossDamage(b,a,100,hitAt);b.hp-=100;advanceBossMotion(s,hitAt+19999,combatEligible);assert.equal(b.teleportSeq,0);a.pos=b.pos.map((v,i)=>v+(i===0?250:0));updateProtection(a,hitAt+19999);
 advanceBossMotion(s,hitAt+20000,combatEligible,()=>.5);assert.equal(b.teleportSeq,1);assert(Math.hypot(...b.lastTeleport.from.map((v,i)=>v-b.pos[i]))>600);assert.equal(b.hp,999900);assert.equal(b.contributions.mover,100,'Teleport keeps HP and damage shares');
 advanceBossMotion(s,hitAt+20000,combatEligible,()=>.5);assert.equal(b.teleportSeq,1,'Retry at same timestamp cannot jump twice');
 const loaded=JSON.parse(JSON.stringify(s));advanceBossMotion(loaded,hitAt+20001,combatEligible);assert.equal(loaded.boss.teleportSeq,1);assert.equal(loaded.boss.nextTeleportAt,hitAt+40000,'Timers survive reload');
 loaded.players[0].pos=[0,120,0];updateProtection(loaded.players[0],hitAt+21000);advanceBossMotion(loaded,hitAt+50000,combatEligible);assert.equal(loaded.boss.teleportSeq,1,'No combat teleport for protected pilots');
 loaded.boss.hp=0;const pos=[...loaded.boss.pos];advanceBossMotion(loaded,hitAt+60000,combatEligible);assert.deepEqual(loaded.boss.pos,pos,'Dead bosses do not patrol');
 for(let phase=0;phase<=Math.PI*2;phase+=.005){const pos=bossPatrolPosition(phase),distance=Math.hypot(...pos);assert(distance-BOSS_RULES.hitRadius>650);assert(distance+BOSS_RULES.hitRadius<3000)}
 const old={...b};delete old.rulesVersion;old.hp=12345;old.nextAttackAt=t+5000;const upgraded=ensureBoss({boss:old},t);assert.equal(upgraded.hp,12345);assert.equal(upgraded.contributions.mover,100);assert.equal(upgraded.nextAttackAt,t+3000,'Live upgrade shortens cooldown without resetting round');
}

{
 const a=pilot('a',[0,120,-1500]),s=world(a),boss=ensureBoss(s,t);boss.hp=10;
 const bullets=attack(s,a,{weapon:'missile',targetId:boss.id,shots:[{offset:[0,0,0],direction:[0,0,-1],locked:true}]},t);assert.equal(bullets[0].target,boss.id);
 for(let time=t+100;time<=t+600;time+=100)advance(s,time);
 assert.equal(boss.hp,0);assert.equal(boss.contributions.a,10,'Overkill contributes only remaining HP');assert.equal(s.bossRewards[0].amount,1000000);const receipt=s.bossRewards[0].id;
 advance(s,t+700);assert.equal(s.bossRewards.length,1,'No repeat awards');assert.equal(s.bossRewards[0].id,receipt);
 const persisted=JSON.parse(JSON.stringify(s));advance(persisted,boss.respawnAt-1);assert.equal(persisted.boss.hp,0);advance(persisted,boss.respawnAt);assert.equal(persisted.boss.hp,1000000);assert.notEqual(persisted.boss.instanceId,boss.instanceId);assert.deepEqual(persisted.boss.contributions,{});
}
{
 const shares=splitBossReward({c:1,b:1,a:1,zero:0,nan:NaN});assert.deepEqual(shares.map(r=>r.amount),[333334,333333,333333]);assert.equal(shares.reduce((n,r)=>n+r.amount,0),1000000);
 assert.deepEqual(splitBossReward({a:750000,b:250000}).map(r=>r.amount),[750000,250000]);assert.deepEqual(splitBossReward({}),[]);
 const s=world(),b=ensureBoss(s,t);recordBossDamage(b,{id:'disconnected'},50,t);b.hp=0;tickBoss(s,t+1,combatEligible);assert.equal(s.bossRewards[0].playerId,'disconnected','Departed contributors retain awards');
}
console.log('Cooperative boss: shared HP, three lowest-current-HP targets, shared 15000 damage, solo hits, bounded patrol, combat teleports and persistence, base/range guards, cadence, actual damage, exact shares, offline contributors and respawn passed.');
