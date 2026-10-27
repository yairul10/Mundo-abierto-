import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
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
