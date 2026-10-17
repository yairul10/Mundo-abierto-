import assert from 'node:assert/strict';
import {BOSS_RULES,ensureBoss,recordBossDamage,tickBoss,splitBossReward,bossSnapshot} from '../server/pvp/cooperative-boss.mjs';
import {equip,advance,attack,updateProtection,combatEligible} from '../server/pvp/world-rules.mjs';
const t=100000;
function pilot(id,pos,hp=20000){const p={id,connected:true,pos,roster:{aurora:{maxHp:1000,maxEnergy:500,attack:100000,defense:0}}};equip(p,'aurora');p.hp=hp;updateProtection(p,t);return p}
const world=(...players)=>({players,events:[],bullets:[],simTime:t});
{
 const a=pilot('a',[0,120,-1500]),b=pilot('b',[100,120,-1500],19000),safe=pilot('safe',[0,120,0]),far=pilot('far',[2500,120,0]),s=world(a,b,safe,far),boss=ensureBoss(s,t);
 assert.equal(boss.hp,1000000);assert.equal(bossSnapshot(boss).contributions,undefined);tickBoss(s,t+5000,combatEligible);assert.equal(a.hp,20000,'Neutral until attacked');
 recordBossDamage(boss,a,10,t);tickBoss(s,t+4999,combatEligible);assert.equal(a.hp,20000);tickBoss(s,t+5000,combatEligible);assert.equal(a.hp,19000);assert.equal(boss.lastAttack.targetId,'a');
 a.hp=18000;tickBoss(s,t+10000,combatEligible);assert.equal(b.hp,18000);assert.equal(boss.lastAttack.targetId,'b','Retarget highest current HP');assert.equal(safe.hp,20000);assert.equal(far.hp,20000);
 b.pos=[0,120,-620];updateProtection(b,t+10001);b.hp=30000;a.hp=10000;tickBoss(s,t+15001,combatEligible);assert.equal(b.hp,30000,'Protected base cannot be hit');
 const seq=boss.attackSeq;tickBoss(s,t+600000,combatEligible);assert.equal(boss.attackSeq,seq+1,'No burst after long inactivity');
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
console.log('Cooperative boss: shared HP, highest-current-HP targeting, base/range guards, cadence, actual damage, exact shares, offline contributors and respawn passed.');
