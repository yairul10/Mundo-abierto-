import assert from 'node:assert/strict';
import {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage,arenaEnemySnapshots,ARENA_ENEMIES} from '../server/pvp/arena-enemies.mjs';
import {advance,equip,updateProtection,combatEligible,attack} from '../server/pvp/world-rules.mjs';
import {applyBossReceipts} from '../js/pvp-boss-rewards.js';
const time=100000;
function pilot(id,pos){const p={id,pos,connected:true,roster:{aurora:{maxHp:100000,maxEnergy:500,attack:100000,defense:0,speed:220,level:105}}};equip(p,'aurora');updateProtection(p,time);return p}
const a=pilot('a',[-1200,120,100]),b=pilot('b',[-1100,120,100]),safe=pilot('safe',[0,120,0]);
const s={realm:'test',players:[a,b,safe],events:[],bullets:[],simTime:time};
advance(s,time);assert.equal(s.arenaEnemies.length,4);assert.equal(s.arenaEnemies.filter(e=>e.kind==='nexo').length,1);assert.equal(s.arenaEnemies.filter(e=>e.kind==='colossusPro').length,2);
for(const e of s.arenaEnemies){assert(Math.hypot(...e.pos)-e.hitRadius>650);assert.equal(e.active,false)}
const boss=s.arenaEnemies.find(e=>e.kind==='colossusPro');recordArenaDamage(s,boss,a,60000,time);recordArenaDamage(s,boss,b,20000,time);boss.hp=120000;
advanceArenaEnemies(s,time+100,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,2);
boss.hp=10000;advanceArenaEnemies(s,time+200,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,6);
for(let i=0;i<30;i++)advanceArenaEnemies(s,time+300+i*100,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,6,'Thresholds cannot endlessly spawn adds');assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id&&e.hp>0).length,6);
const add=s.arenaEnemies.find(e=>e.parentId===boss.id);recordArenaDamage(s,add,a,100,time+3400);recordArenaDamage(s,add,b,50,time+3401);add.hp=0;advanceArenaEnemies(s,time+3500,combatEligible,()=>.5);const addReceipts=s.bossRewards.filter(r=>r.bossId===add.instanceId);assert.equal(addReceipts.reduce((n,r)=>n+r.amount,0),2400);
assert.equal(addReceipts.length,1);assert.equal(addReceipts[0].playerId,'a','First attacker owns reinforcement rewards');
assert.equal(addReceipts[0].xp,3600);assert.equal(Object.values(addReceipts[0].materials).reduce((n,v)=>n+v,0),10);
const baseline=safe.hp;advanceArenaEnemies(s,time+3600,combatEligible,()=>.5);assert.equal(safe.hp,baseline,'Base protection applies to every NPC');
boss.hp=0;advanceArenaEnemies(s,time+3700,combatEligible,()=>.5);const receipts=s.bossRewards.filter(r=>r.bossId===boss.instanceId);assert.equal(receipts.reduce((n,r)=>n+r.amount,0),55000);assert.equal(receipts.find(r=>r.playerId==='a').amount,41250);assert.equal(receipts.reduce((n,r)=>n+Object.entries(r.materials||{}).filter(([key])=>key!=='nucleoNexo').reduce((sum,[,x])=>sum+x,0),0),66);
assert(receipts.every(r=>r.materials.nucleoNexo===1),'Each eligible top contributor gets one Coloso Nexus core');
assert(s.arenaEnemies.filter(e=>e.parentId===boss.id&&e.hp>0).length===5,'Surviving escorts remain after boss death');
assert.equal(receipts.reduce((n,r)=>n+r.xp,0),82500,'Coloso Pro XP pool is paid by effective damage');
const saved=JSON.parse(JSON.stringify(s));advanceArenaEnemies(saved,time+3800,combatEligible,()=>.5);assert.equal(saved.bossRewards.length,s.bossRewards.length,'Restart does not duplicate rewards');
let player={gold:0,loot:{}};const result=applyBossReceipts(player,receipts);assert(result.added>0);assert(Object.values(result.pilot.loot).reduce((sum,x)=>sum+x,0)>0);assert.equal(applyBossReceipts(result.pilot,receipts).added,0);assert.deepEqual(applyBossReceipts(result.pilot,receipts).pilot.loot,result.pilot.loot);
const big=applyBossReceipts({gold:0},[{id:'nexo:solo',amount:1100000}]);assert.equal(big.added,1100000);assert.equal(applyBossReceipts({},[{id:'bad',amount:1,materials:{invalid:10}}]).added,0);
const normal={players:[pilot('normal',[0,120,0])],events:[]};advance(normal,time);assert.equal(normal.arenaEnemies.length,4);assert.equal(normal.arenaEnemies.filter(e=>e.kind==='granTitanPro').length,1,'Normal mode includes the new PvE boss');assert.equal(normal.boss.rules.zone,'hostile');
assert(arenaEnemySnapshots(s).every(e=>e.kind&&e.instanceId));
// All four bosses can be targeted using the existing server projectile path.
const fight={realm:'test',players:[a],events:[],bullets:[],simTime:time};advance(fight,time);a.pos=[...fight.arenaEnemies[0].pos];a.pos[2]-=300;updateProtection(a,time);assert(attack(fight,a,{weapon:'missile',targetId:fight.arenaEnemies[0].id,shots:[{offset:[0,0,0],direction:[0,0,-1],locked:true}]},time));assert.equal(fight.bullets[0].target,fight.arenaEnemies[0].id);
// Coloso missiles are server projectiles: no instant damage and no NPC friendly fire.
{
 const p=pilot('missile-target',[-1200,120,100]),world={realm:'test',players:[p],events:[],bullets:[],simTime:time};advance(world,time);const carrier=world.arenaEnemies.find(e=>e.kind==='colossusPro');carrier.hp-=100000;recordArenaDamage(world,carrier,p,100000,time);const hp=p.hp;advance(world,time+5100);assert(world.bullets.some(b=>b.owner===carrier.id&&b.missile));assert.equal(p.hp,hp,'Missile damage waits for collision');for(let i=1;i<=20;i++)advance(world,time+5100+i*100);assert(p.hp<hp,'Authoritative missile collision causes damage');assert(world.arenaEnemies.filter(e=>e.id!==carrier.id).every(e=>e.hp===e.maxHp),'NPCs do not damage other bosses');
}
console.log('PASS: shared zoned bosses, bounded waves, shared damage/rewards, 10% bonus, materials, base protection, restart, targeting and normal-mode isolation');

// Gran Titan deploys its own bounded Pro escorts, without cloning Coloso types.
{
 const state={players:[a],events:[],bullets:[]};ensureArenaEnemies(state,time);const titan=state.arenaEnemies.find(e=>e.kind==='granTitanPro');recordArenaDamage(state,titan,a,100,time);titan.hp=titan.maxHp*.69;advanceArenaEnemies(state,time+100,combatEligible,()=>.5);
 let adds=state.arenaEnemies.filter(e=>e.parentId===titan.id);assert.equal(adds.length,3);assert.deepEqual(adds.map(e=>e.model),['catapult','harpooner','stalker']);assert.deepEqual(adds.map(e=>e.maxHp),[13800,23000,18400]);assert.deepEqual(adds.map(e=>e.rules.damage),[1380,230,1150]);
 titan.hp=titan.maxHp*.39;advanceArenaEnemies(state,time+200,combatEligible,()=>.5);assert.equal(state.arenaEnemies.filter(e=>e.parentId===titan.id).length,6);const restored=JSON.parse(JSON.stringify(state));for(let i=0;i<10;i++)advanceArenaEnemies(restored,time+300+i*100,combatEligible,()=>.5);assert.equal(restored.arenaEnemies.filter(e=>e.parentId===titan.id).length,6,'No duplicate waves after reload');
 titan.hp=0;advanceArenaEnemies(state,time+2000,combatEligible,()=>.5);const rewards=state.bossRewards.filter(e=>e.bossId===titan.instanceId);assert.equal(rewards.reduce((n,r)=>n+r.amount,0),151800);assert.equal(rewards.reduce((n,r)=>n+r.xp,0),227700);assert.equal(rewards.reduce((n,r)=>n+Object.entries(r.materials).filter(([k])=>k!=='nucleoNexo').reduce((n,[,v])=>n+v,0),0),66);assert.equal(state.arenaEnemies.filter(e=>e.parentId===titan.id&&e.hp>0).length,6);
}
