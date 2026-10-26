import assert from 'node:assert/strict';
import {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage,arenaEnemySnapshots,ARENA_ENEMIES} from '../server/pvp/arena-enemies.mjs';
import {advance,equip,updateProtection,combatEligible,attack} from '../server/pvp/world-rules.mjs';
import {applyBossReceipts} from '../js/pvp-boss-rewards.js';
const time=100000;
function pilot(id,pos){const p={id,pos,connected:true,roster:{aurora:{maxHp:100000,maxEnergy:500,attack:100000,defense:0,speed:220,level:105}}};equip(p,'aurora');updateProtection(p,time);return p}
const a=pilot('a',[-1600,120,900]),b=pilot('b',[-1450,120,900]),safe=pilot('safe',[0,120,0]);
const s={realm:'test',players:[a,b,safe],events:[],bullets:[],simTime:time};
advance(s,time);assert.equal(s.arenaEnemies.length,4);assert.equal(s.arenaEnemies.filter(e=>e.kind==='nexo').length,2);assert.equal(s.arenaEnemies.filter(e=>e.kind==='colossusPro').length,2);
for(const e of s.arenaEnemies){assert(Math.hypot(...e.pos)-e.hitRadius>650);assert.equal(e.active,false)}
const boss=s.arenaEnemies.find(e=>e.kind==='colossusPro');recordArenaDamage(s,boss,a,60000,time);recordArenaDamage(s,boss,b,20000,time);boss.hp=120000;
advanceArenaEnemies(s,time+100,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,2);
boss.hp=10000;advanceArenaEnemies(s,time+200,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,6);
for(let i=0;i<30;i++)advanceArenaEnemies(s,time+300+i*100,combatEligible,()=>.5);assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id).length,6,'Thresholds cannot endlessly spawn adds');assert.equal(s.arenaEnemies.filter(e=>e.parentId===boss.id&&e.hp>0).length,6);
const add=s.arenaEnemies.find(e=>e.parentId===boss.id);recordArenaDamage(s,add,a,100,time+3400);add.hp=0;advanceArenaEnemies(s,time+3500,combatEligible,()=>.5);const addReceipts=s.bossRewards.filter(r=>r.bossId===add.instanceId);assert.equal(addReceipts.reduce((n,r)=>n+r.amount,0),220);
const baseline=safe.hp;advanceArenaEnemies(s,time+20000,combatEligible,()=>.5);assert.equal(safe.hp,baseline,'Base protection applies to every NPC');
boss.hp=0;advanceArenaEnemies(s,time+20100,combatEligible,()=>.5);const receipts=s.bossRewards.filter(r=>r.bossId===boss.instanceId);assert.equal(receipts.reduce((n,r)=>n+r.amount,0),55000);assert.equal(receipts.find(r=>r.playerId==='a').amount,41250);assert.equal(receipts.reduce((n,r)=>n+Object.values(r.materials||{}).reduce((sum,x)=>sum+x,0),0),66);
assert(s.arenaEnemies.filter(e=>e.parentId===boss.id).every(e=>e.hp===0),'No orphan adds after boss death');
const saved=JSON.parse(JSON.stringify(s));advanceArenaEnemies(saved,time+20200,combatEligible,()=>.5);assert.equal(saved.bossRewards.length,s.bossRewards.length,'Restart does not duplicate rewards');
let player={gold:0,loot:{}};const result=applyBossReceipts(player,receipts);assert(result.added>0);assert(Object.values(result.pilot.loot).reduce((sum,x)=>sum+x,0)>0);assert.equal(applyBossReceipts(result.pilot,receipts).added,0);assert.deepEqual(applyBossReceipts(result.pilot,receipts).pilot.loot,result.pilot.loot);
const big=applyBossReceipts({gold:0},[{id:'nexo:solo',amount:1100000}]);assert.equal(big.added,1100000);assert.equal(applyBossReceipts({},[{id:'bad',amount:1,materials:{invalid:10}}]).added,0);
const normal={players:[pilot('normal',[0,120,0])],events:[]};advance(normal,time);assert.equal(normal.arenaEnemies,undefined);assert.equal(normal.boss.rules.reward,1000000,'Normal mode keeps its existing boss');
assert(arenaEnemySnapshots(s).every(e=>e.kind&&e.instanceId));
// All four bosses can be targeted using the existing server projectile path.
const fight={realm:'test',players:[a],events:[],bullets:[],simTime:time};advance(fight,time);a.pos=[...fight.arenaEnemies[1].pos];a.pos[2]+=500;updateProtection(a,time);assert(attack(fight,a,{weapon:'missile',targetId:fight.arenaEnemies[1].id,shots:[{offset:[0,0,0],direction:[0,0,-1],locked:true}]},time));assert.equal(fight.bullets[0].target,fight.arenaEnemies[1].id);
// Coloso missiles are server projectiles: no instant damage and no NPC friendly fire.
{
 const p=pilot('missile-target',[-1600,120,1500]),world={realm:'test',players:[p],events:[],bullets:[],simTime:time};advance(world,time);const carrier=world.arenaEnemies.find(e=>e.kind==='colossusPro');recordArenaDamage(world,carrier,p,1,time);const hp=p.hp;advance(world,time+5100);assert(world.bullets.some(b=>b.owner===carrier.id&&b.missile));assert.equal(p.hp,hp,'Missile damage waits for collision');for(let i=1;i<=20;i++)advance(world,time+5100+i*100);assert(p.hp<hp,'Authoritative missile collision causes damage');assert(world.arenaEnemies.filter(e=>e.id!==carrier.id).every(e=>e.hp===e.maxHp),'NPCs do not damage other bosses');
}
console.log('PASS: 2+2 test-only bosses, bounded waves, shared damage/rewards, 10% bonus, materials, base protection, restart, targeting and normal-mode isolation');
