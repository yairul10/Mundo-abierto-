import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {ensureArenaEnemies,recordArenaDamage,advanceArenaEnemies} from './arena-enemies.mjs';
// Exercise the real class with a small SQLite/context double, without a Workers runtime.
const source=readFileSync(new URL('./shared-world.mjs',import.meta.url),'utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {constructor(ctx){this.ctx=ctx}}')
 .replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL(path,import.meta.url).href}'`);
const {SharedWorld}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function context(){
 const db={world:null,rewards:[],writes:0,reads:0,fail:false};let sockets=[];
 return {db,setSockets(ws){sockets=ws},getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn(),storage:{
  sql:{exec(query,...args){let rows=[];
   if(query.startsWith('PRAGMA'))rows=[{name:'materials'},{name:'xp'}];
   else if(query.startsWith('SELECT data')){db.reads++;rows=db.world?[{data:db.world}]:[];}
   else if(query.startsWith('INSERT INTO shared_world')){if(db.fail)throw Error('disk failure');db.world=args[0];db.writes++;}
   else if(query.startsWith('INSERT OR IGNORE INTO boss_rewards'))db.rewards.push(args);
   return {toArray:()=>rows};}},
  transactionSync(fn){const before=structuredClone(db);try{return fn()}catch(e){Object.assign(db,before);throw e}}
 }};
}
const world=realm=>({realm,players:[],events:[],invites:[],duels:[]});
test('reinforcement awards persist in SQLite and replay after reconstruction without duplicates',()=>{
 const db=new DatabaseSync(':memory:');
 const ctx={getWebSockets:()=>[],blockConcurrencyWhile:fn=>fn(),storage:{
  // Execute writes immediately, like the Workers SQLite API.
  sql:{exec(query,...args){const rows=db.prepare(query).all(...args);return {toArray:()=>rows}}},
  transactionSync(fn){db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}
 }};
 try{
  const w=new SharedWorld(ctx,{}),s=world('test'),now=100000;
  ensureArenaEnemies(s,now);const parent=s.arenaEnemies.find(b=>b.kind==='colossusPro');
  recordArenaDamage(s,parent,{id:'first'},80000,now);parent.hp=120000;
  advanceArenaEnemies(s,now+100,()=>false,()=>.5);
  const add=s.arenaEnemies.find(b=>b.kind==='reinforcement');
  recordArenaDamage(s,add,{id:'first'},1000,now+200);
  recordArenaDamage(s,add,{id:'second'},add.maxHp-1000,now+200);add.hp=0;
  advanceArenaEnemies(s,now+300,()=>false,()=>.1);
  const receipt=structuredClone(s.bossRewards.find(r=>r.bossId===add.instanceId));
  assert.equal(receipt.playerId,'first');assert.equal(receipt.damage,1000);assert.equal(receipt.totalDamage,add.maxHp);
  assert.equal(receipt.amount,2400);assert.equal(receipt.xp,3600);assert.equal(receipt.materials.nucleoNexo,1);
  w.worldSave(s,true);assert.deepEqual(s.bossRewards,[]);
  const restored=new SharedWorld(ctx,{}),sent=[],attachment={};
  const ws={deserializeAttachment:()=>attachment,serializeAttachment:()=>{},send:data=>sent.push(JSON.parse(data))};
  restored.sendRewards(ws,'first');assert.equal(sent.length,1);
  assert.deepEqual(sent[0].receipts,[{id:receipt.id,amount:receipt.amount,damage:1000,totalDamage:add.maxHp,bossId:add.instanceId,materials:receipt.materials,xp:3600}]);
  const loaded=restored.worldLoad();advanceArenaEnemies(loaded,now+400,()=>false,()=>.1);restored.worldSave(loaded,true);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM boss_rewards').get().count,1);
  sent.length=0;restored.sendRewards({...ws,deserializeAttachment:()=>({})},'second');assert.equal(sent.length,0);
 }finally{db.close()}
});
for(const realm of ['normal','test']){
 test(`${realm}: cache and five-second checkpoint, with immediate critical writes`,()=>{
  const ctx=context(),w=new SharedWorld(ctx,{}),s=world(realm),now=Date.now,base=1700000000000;
  try{Date.now=()=>base;w.worldSave(s,true);const first=w.lastCheckpoint;
   Date.now=()=>base+100;for(let i=0;i<100;i++)w.worldSave(s);assert.equal(ctx.db.writes,1);assert.equal(w.worldLoad(),s);assert.equal(ctx.db.reads,0);
   Date.now=()=>base+5000;w.worldSave(s);assert.equal(ctx.db.writes,2);
   Date.now=()=>base+5100;s.bossRewards=[{id:'receipt',playerId:'pilot',amount:10,damage:10,totalDamage:10,bossId:'boss',materials:{nucleo:1}}];w.worldSave(s);
   assert.equal(ctx.db.writes,3);assert.equal(ctx.db.rewards.length,1);assert.deepEqual(s.bossRewards,[]);assert.deepEqual(JSON.parse(ctx.db.world).bossRewards,[]);assert(w.lastCheckpoint>first);
   w.worldSave(s,true);assert.equal(ctx.db.writes,4);
  }finally{Date.now=now;w.stopSimulation()}
 });
 test(`${realm}: a failed transaction retains rewards for retry`,()=>{
  const ctx=context(),w=new SharedWorld(ctx,{}),s=world(realm);s.bossRewards=[{id:'receipt',playerId:'pilot',amount:10,damage:10,totalDamage:10,bossId:'boss'}];ctx.db.fail=true;
  assert.throws(()=>w.worldSave(s),/disk failure/);assert.equal(s.bossRewards.length,1);assert.equal(ctx.db.rewards.length,0);assert.equal(w.lastCheckpoint,0);
  ctx.db.fail=false;w.worldSave(s);assert.equal(ctx.db.rewards.length,1);assert.equal(s.bossRewards.length,0);
 });
 test(`${realm}: restore only live sockets; idle worlds do not start a timer`,()=>{
  const ctx=context();ctx.db.world=JSON.stringify({...world(realm),players:[{id:'alive',connected:true},{id:'ghost',connected:true},{id:'closing',connected:true}]});
  ctx.setSockets([{readyState:1,deserializeAttachment:()=>({id:'alive'})},{readyState:2,deserializeAttachment:()=>({id:'closing'})}]);
  const w=new SharedWorld(ctx,{}),s=w.worldLoad();assert.deepEqual(s.players.map(p=>p.connected),[true,false,false]);assert.equal(w.worldLoad(),s);assert.equal(ctx.db.reads,1);
  w.startSimulation(world(realm));assert.equal(w.simulation,null);w.startSimulation(s);const timer=w.simulation;assert(timer);w.startSimulation(s);assert.equal(w.simulation,timer);w.stopSimulation();assert.equal(w.simulation,null);
 });
}

test('valid kill, ranking counters, XP receipt and rolling window commit together and survive reconstruction',async()=>{
 const {awardKill}=await import('./pvp-results.mjs');const db=new DatabaseSync(':memory:');let fail=false;
 const ctx={getWebSockets:()=>[],blockConcurrencyWhile:fn=>fn(),storage:{setAlarm:async()=>{},sql:{exec(q,...args){if(fail&&q.startsWith('INSERT INTO shared_world'))throw Error('disk failure');const rows=db.prepare(q).all(...args);return {toArray:()=>rows}}},transactionSync(fn){db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}};
 try{const w=new SharedWorld(ctx,{}),s=world('normal');s.killHistory=[];awardKill(s,{id:'winner',name:'Verified',profile:{level:100}},{id:'victim',profile:{level:60}},100000,'valid');fail=true;assert.throws(()=>w.worldSave(s,true),/disk failure/);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pvp_ranking').get().n,0);assert.equal(s.pendingKills.length,1);fail=false;w.worldSave(s,true);w.worldSave(s,true);assert.equal(db.prepare('SELECT kills FROM pvp_ranking').get().kills,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM boss_rewards WHERE amount=0 AND xp>0').get().n,1);const fresh=new SharedWorld(ctx,{});assert.equal(fresh.worldLoad().killHistory.length,1);assert.equal(fresh.worldLoad().pendingKills.length,0);}finally{db.close()}
});
