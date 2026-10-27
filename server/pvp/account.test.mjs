import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {verifiedPvpAccount} from './account.mjs';
import identity from '../cloud-save/play-games-identity-worker.mjs';
const playerId='12345678-1234-1234-1234-123456789abc';
function signed(exp,sub=playerId){const payload=Buffer.from(JSON.stringify({sub,exp})).toString('base64url');return payload+'.'+createHmac('sha256','fixture-signing-secret').update(payload).digest('base64url')}
const env={DB:{},GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture',SESSION_SIGNING_KEY:'fixture-signing-secret'};
const service={fetch:r=>identity.fetch(r,env)};
const request=token=>new Request('https://pvp.test/world/join',{headers:token?{Authorization:'Bearer '+token}:{}});
test('Google account verification rejects missing, forged and expired sessions and fails closed without binding',async()=>{
 assert.equal((await verifiedPvpAccount(request(),{PLAY_IDENTITY:service})).status,401);
 assert.equal((await verifiedPvpAccount(request(signed(1)),{PLAY_IDENTITY:service})).status,401);
 const token=signed(Math.floor(Date.now()/1000)+300);
 assert.equal((await verifiedPvpAccount(request(token+'x'),{PLAY_IDENTITY:service})).status,401);
 assert.equal((await verifiedPvpAccount(request(token),{})).status,503);
 assert.deepEqual(await verifiedPvpAccount(request(token),{PLAY_IDENTITY:service}),{playerId});
});
test('Worker ignores claimed account IDs and never admits unauthenticated guests',async()=>{
 const source=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8').replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {}').replace("import {SharedWorld} from './shared-world.mjs';",'class SharedWorld {}').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,import.meta.url).href}'`);
 const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let calls=0,body;const bindings={PLAY_IDENTITY:service,API_LIMIT:{limit:async()=>({success:true})},ROOMS:{getByName:()=>({enter:async b=>{calls++;body=b;return {playerId:'verified'}}})}};
 const join=token=>new Request('https://pvp.test/world/join',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({clientVersion:2,accountId:'forged',guestKey:'a'.repeat(64),realm:'normal'})});
 assert.equal((await worker.fetch(join(),bindings)).status,401);assert.equal(calls,0);
 assert.equal((await worker.fetch(join(signed(Math.floor(Date.now()/1000)+300)),bindings)).status,200);assert.equal(calls,1);assert.equal(body.accountId,playerId);
});
test('room identity stays stable across local key changes and rejects legacy guest entry',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(':memory:');
 const source=readFileSync(new URL('./shared-world.mjs',import.meta.url),'utf8').replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {constructor(ctx){this.ctx=ctx}}').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,import.meta.url).href}'`);
 const {SharedWorld}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const ctx={getWebSockets:()=>[],blockConcurrencyWhile:fn=>fn(),storage:{setAlarm:async()=>{},sql:{exec(q,...args){const result=db.prepare(q).all(...args);return {toArray:()=>result}}},transactionSync(fn){db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}};
 try{
  const world=new SharedWorld(ctx,{});assert.equal((await world.enter({guestKey:'a'.repeat(64)})).error,'google_required');
  const a=await world.enter({accountId:playerId,guestKey:'a'.repeat(64),name:'Primero'}),b=await world.enter({accountId:playerId,guestKey:'b'.repeat(64),name:'Otro nombre'});
  assert.equal(a.playerId,b.playerId);assert.notEqual(a.token,b.token);
  const other=await world.enter({accountId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'});assert.notEqual(other.playerId,a.playerId);
 }finally{db.close()}
});
test('pending guest receipts migrate once with secret possession, preserving receipt IDs and claimed rows',async()=>{
 const {migrateGuestRewards}=await import('./account.mjs');const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE boss_rewards(id TEXT PRIMARY KEY,player_id TEXT,claimed INTEGER)');
 const ctx={storage:{sql:{exec(q,...args){const rows=db.prepare(q).all(...args);return {toArray:()=>rows}}},transactionSync(fn){db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}};
 try{
  const key='a'.repeat(64),bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)),legacy=Buffer.from(bytes).toString('hex').slice(0,24);
  db.prepare('INSERT INTO boss_rewards VALUES(?,?,?)').run('pending',legacy,0);db.prepare('INSERT INTO boss_rewards VALUES(?,?,?)').run('claimed',legacy,1);
  await migrateGuestRewards(ctx,legacy,'attacker');assert.equal(db.prepare("SELECT player_id FROM boss_rewards WHERE id='pending'").get().player_id,legacy);
  await migrateGuestRewards(ctx,key,'verified');await migrateGuestRewards(ctx,key,'other-account');
  assert.deepEqual(db.prepare('SELECT * FROM boss_rewards ORDER BY id').all().map(r=>({...r})),[{id:'claimed',player_id:legacy,claimed:1},{id:'pending',player_id:'verified',claimed:0}]);
 }finally{db.close()}
});
