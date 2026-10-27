import test from 'node:test';
import assert from 'node:assert/strict';
import {tickNpcPattern,advanceNpcHazards} from '../server/pvp/npc-patterns.mjs';
import {stepCombat} from '../server/pvp/combat.mjs';
import {tickBoss} from '../server/pvp/cooperative-boss.mjs';
import {arenaEnemySnapshots} from '../server/pvp/arena-enemies.mjs';
const pilot=(id='p',x=0)=>({id,clientVersion:5,connected:true,pos:[x,120,1100],hp:10000,profile:{maxHp:10000,maxEnergy:100,speed:200,shipId:'aurora',defense:0,special:{}},energy:100,skillUntil:{}});
function fixture(kind){const p=pilot(),b={id:'npc',instanceId:'round1',kind:kind==='titan'?'granTitanPro':'reinforcement',model:kind,connected:true,npc:true,pos:[0,120,800],hp:9000,maxHp:10000,active:true,attackSeq:0,contributions:{},rules:{attackPattern:kind,damage:kind==='titan'?1472:kind==='catapult'?1380:kind==='stalker'?1150:230,tetherDps:230,zone:'pve',targets:1,range:1400}};return {p,b,s:{players:[p],arenaEnemies:[b],bullets:[],events:[]}}}
test('Titan telegraphs, fires six spears with a gap, alternates four marked bombs, and survives JSON reconstruction',()=>{
 const {p,b,s}=fixture('titan');tickNpcPattern(s,b,1000,[p]);assert.equal(b.charge.kind,'spear');assert.equal(s.bullets.length,0);tickNpcPattern(s,b,3499,[p]);assert.equal(s.bullets.length,0);tickNpcPattern(s,b,3500,[p]);assert.equal(s.bullets.length,6);assert(s.bullets.every(v=>v.paralyzeMs===3000&&v.damage===1472));
 tickNpcPattern(s,b,9000,[p]);assert.equal(b.charge.kind,'bomb');const restored=JSON.parse(JSON.stringify(s)),boss=restored.arenaEnemies[0];tickNpcPattern(restored,boss,11500,restored.players);assert.equal(boss.bombs.length,4);assert(boss.bombs.every(x=>x.detonateAt===15000));assert.equal(boss.patternEvents.at(-1).projectile,'bomb');tickNpcPattern(restored,boss,11500,restored.players);assert.equal(boss.bombs.length,4,'No replay at same timestamp');
 const snapshot=arenaEnemySnapshots(restored)[0];assert.equal(snapshot.patternEvents.length,1);assert.equal(snapshot.bombs.length,4);
});
test('Catapult commits to its marked position, waits for charge and flight, damages the area once, and can be dodged',()=>{
 const {p,b,s}=fixture('catapult');tickNpcPattern(s,b,1000,[p]);p.pos[0]=500;tickNpcPattern(s,b,2400,[p]);assert.equal(b.bombs[0].targetPos[0],0);const hit=pilot('hit'),old=pilot('legacy');old.clientVersion=4;s.players.push(hit,old);advanceNpcHazards(s,3899,()=>true);assert.equal(hit.hp,10000);advanceNpcHazards(s,3900,()=>true);assert.equal(hit.hp,8620);assert.equal(p.hp,10000);assert.equal(old.hp,10000,'Old apps never take invisible specialized blast damage');advanceNpcHazards(s,4000,()=>true);assert.equal(hit.hp,8620);
});
test('Bombs cannot damage a protected pilot or survive owner death, and stale explosions never catch up',()=>{
 const {p,b,s}=fixture('catapult');tickNpcPattern(s,b,1000,[p]);tickNpcPattern(s,b,2400,[p]);advanceNpcHazards(s,3900,()=>false);assert.equal(p.hp,10000);b.patternDue=null;tickNpcPattern(s,b,5000,[p]);tickNpcPattern(s,b,6400,[p]);b.hp=0;advanceNpcHazards(s,7900,()=>true);assert.equal(p.hp,10000);b.hp=1;b.patternDue=null;tickNpcPattern(s,b,9000,[p]);tickNpcPattern(s,b,10400,[p]);advanceNpcHazards(s,13000,()=>true);assert.equal(p.hp,10000);
});
test('Harpoon collides server-side, immobilizes for three seconds, deals periodic damage, respects immunity and cleanse',()=>{
 const {p,b,s}=fixture('harpooner');tickNpcPattern(s,b,1000,[p]);assert.equal(s.bullets.length,1);const combat={...s,status:'active',players:[p,b],simTime:1000,canDamage:(o,t)=>!t||t===p};for(let t=1050;t<=1500;t+=50)stepCombat(combat,t);assert(p.paralyzedUntil>4000);assert.equal(p.npcTether.owner,b.id);assert.equal(p.hp,9999);const before=p.hp;advanceNpcHazards(s,1600,()=>true);assert(p.hp<before);const immune=p.npcSnagImmuneUntil;p.paralyzedUntil=0;advanceNpcHazards(s,1650,()=>true);assert.equal(p.npcTether,null);assert.equal(p.npcSnagImmuneUntil,immune);
});
test('Sniper has a 500 ms warning, tracks during charge, fires a fast dodgeable projectile and does not shoot through protection',()=>{
 const {p,b,s}=fixture('stalker');tickNpcPattern(s,b,1000,[p]);assert.equal(b.charge.kind,'sniper');tickNpcPattern(s,b,1499,[p]);assert.equal(s.bullets.length,0);p.pos[0]=50;tickNpcPattern(s,b,1500,[p]);assert.equal(s.bullets.length,1);assert.equal(Math.round(Math.hypot(...s.bullets[0].vel)),6000);assert.equal(b.lastAttack.shots[0].targetPos[0],50);
 const hp=p.hp,c={status:'active',players:[p,b],bullets:s.bullets,simTime:1500,canDamage:()=>false};stepCombat(c,1600);assert.equal(p.hp,hp);assert.equal(c.bullets.length,0);
});
test('No burst on delayed alarms, cancelled warnings restart, and legacy clients keep the previous attack path',()=>{
 const {p,b,s}=fixture('stalker');tickNpcPattern(s,b,1000,[p]);tickNpcPattern(s,b,9000,[p]);assert.equal(s.bullets.length,0);assert.equal(b.charge.fireAt,9500);tickNpcPattern(s,b,9100,[]);assert.equal(b.charge,null);tickNpcPattern(s,b,9200,[p]);assert.equal(b.charge.fireAt,9700);
 p.clientVersion=4;b.lastDamageAt=10000;b.nextAttackAt=10000;s.boss=b;tickBoss(s,10000,()=>true);assert(s.bullets.some(x=>x.owner===b.id));assert.equal(b.charge,null);assert.equal(b.lastAttack.projectile,'laser');
});
test('Special spears ignore legacy apps, can miss, and an attached cable releases when its owner dies',()=>{
 const {p,b,s}=fixture('harpooner');p.clientVersion=4;tickNpcPattern(s,b,1000,[p]);const c={status:'active',players:[p,b],bullets:s.bullets,simTime:1000,canDamage:(o,t)=>!t||t===p};for(let t=1050;t<=1800;t+=50)stepCombat(c,t);assert.equal(p.hp,10000);assert(!p.npcTether);
 p.clientVersion=5;p.npcTether={owner:b.id,instance:b.instanceId,dps:230,tickAt:1800,until:4800};p.paralyzedUntil=4800;b.hp=0;advanceNpcHazards(s,1900,()=>true);assert.equal(p.paralyzedUntil,0);assert.equal(p.npcTether,null);
});
test('A spear aimed at one pilot hits the first other pilot in its path',()=>{
 const {p,b,s}=fixture('titan'),bystander=pilot('crossing');bystander.pos=[0,120,950];s.players.push(bystander);tickNpcPattern(s,b,1000,[p]);tickNpcPattern(s,b,3500,[p]);const center=s.bullets.find(x=>Math.abs(x.vel[0])<.001);assert(center);const c={status:'active',players:[p,bystander,b],bullets:[center],simTime:3500,canDamage:(owner,target)=>!target||target===p||target===bystander};for(let t=3550;t<=3800;t+=50)stepCombat(c,t);assert(bystander.hp<10000);assert.equal(p.hp,10000);assert(bystander.paralyzedUntil>3800);
});
test('Catapult area damage reaches an uninvolved bystander, while protected and dueling pilots stay safe',async()=>{
 const {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage}=await import('../server/pvp/arena-enemies.mjs');
 const a=pilot('engaged'),b=pilot('bystander'),protectedPilot=pilot('safe'),duelist=pilot('duelist');a.pos=b.pos=protectedPilot.pos=duelist.pos=[0,120,1250];duelist.duelId='duel';const s={players:[a,b,protectedPilot,duelist],events:[],bullets:[]};ensureArenaEnemies(s,1000);const parent=s.arenaEnemies.find(x=>x.kind==='granTitanPro');recordArenaDamage(s,parent,a,1,1000);parent.hp=parent.maxHp*.69;const eligible=p=>p.id!=='safe'&&p.hp>0;advanceArenaEnemies(s,1100,eligible);const cat=s.arenaEnemies.find(x=>x.model==='catapult');assert(!parent.participants?.[b.id]&&!parent.contributions[b.id]);cat.bombs=[{instance:cat.instanceId,detonateAt:1200,targetPos:[0,120,1250],radius:180,damage:1380}];advanceArenaEnemies(s,1200,eligible);assert.equal(b.hp,8620);assert.equal(protectedPilot.hp,10000);assert.equal(duelist.hp,10000);
});
