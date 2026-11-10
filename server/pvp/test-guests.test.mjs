import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedPvpAccount} from './account.mjs';
const key='a'.repeat(64),token='test-guest-'+key;
const request=(auth=token)=>new Request('https://pvp.test/world/join',{headers:auth?{Authorization:'Bearer '+auth}:{}});
test('temporary guests require the test realm and both enabled flags',async()=>{
 const env={TEST_GUEST_ACCESS:'true',TEST_SERVER_ENABLED:'true'};
 const a=await verifiedPvpAccount(request(),env,'test');
 assert.equal(a.testGuest,true);assert.match(a.playerId,/^[a-f0-9-]{36}$/);
 assert.deepEqual(await verifiedPvpAccount(request(),env,'test'),a);
 for(const [e,realm] of [[env,'normal'],[env,undefined],[{},'test'],[{...env,TEST_SERVER_ENABLED:'false'},'test'],[{...env,TEST_GUEST_ACCESS:'false'},'test']])assert.equal((await verifiedPvpAccount(request(),e,realm)).status,401);
 assert.equal((await verifiedPvpAccount(request('test-guest-invalid'),env,'test')).status,503);
 assert.equal((await verifiedPvpAccount(request(),env,'test')).playerId=== (await verifiedPvpAccount(request('test-guest-'+'b'.repeat(64)),env,'test')).playerId,false);
});
test('join routes guests only to the test room and overwrites claimed identities',async()=>{
 const source=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8').replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {}').replace("import {SharedWorld} from './shared-world.mjs';",'class SharedWorld {}').replace(/from '(\.\/[^']+)'/g,(_,p)=>"from '"+new URL(p,import.meta.url).href+"'");
 const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let room,body,calls=0;const env={TEST_GUEST_ACCESS:'true',TEST_SERVER_ENABLED:'true',API_LIMIT:{limit:async()=>({success:true})},ROOMS:{getByName:name=>{room=name;return {enter:async b=>{calls++;body=b;return {playerId:'test'}}}}}};
 const join=realm=>new Request('https://pvp.test/world/join',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({realm,clientVersion:5,accountId:'forged',testGuest:false})});
 assert.equal((await worker.fetch(join('normal'),env)).status,401);assert.equal(calls,0);
 assert.equal((await worker.fetch(join('test'),env)).status,200);assert.equal(room,'shared-cemetery-test-v1');assert.equal(body.testGuest,true);assert.notEqual(body.accountId,'forged');
 assert.equal((await worker.fetch(join('test'),{...env,TEST_SERVER_ENABLED:'false'})).status,403);
});
