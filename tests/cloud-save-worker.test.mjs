import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{MAX_SAVE_BYTES} from '../server/cloud-save/play-games-identity-worker.mjs';
const encoder=new TextEncoder();
const base64url=bytes=>Buffer.from(bytes).toString('base64url');
async function fixture(){
 const secret='test-only-save-signing-secret';
 const payload=base64url(encoder.encode(JSON.stringify({sub:'fixture-pilot',exp:Math.floor(Date.now()/1000)+3600})));
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const token=payload+'.'+base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));
 let saved=null,reads=0,writes=0;
 const env={GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture',SESSION_SIGNING_KEY:secret,DB:{
  prepare(sql){return {bind(...params){return {
   async first(){reads++;return saved?(sql.includes('SELECT payload')?{...saved}:{revision:saved.revision}):null},
   async run(){writes++;const [,data,expected]=params;if(saved&&saved.revision!==expected)return {meta:{changes:0}};
    saved={payload:data,revision:(saved?.revision||0)+1,updated_at:'fixture'};return {meta:{changes:1}}
   }
  }}}}
 }};
 const call=(method,body,headers={})=>worker.fetch(new Request('https://fixture.invalid/v1/play-games/save',{method,headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},...(body===undefined?{}:{body,...(body instanceof ReadableStream?{duplex:'half'}:{})})}),env);
 return {call,get saved(){return saved},get reads(){return reads},get writes(){return writes}};
}
test('cooperative receipt history larger than 64 KiB is saved and restored in full',async()=>{
 const f=await fixture(),progress={level:215,gold:5500000,pvpBossReceipts:Array.from({length:3000},(_,i)=>'receipt-'+String(i).padStart(32,'0')),quests:{},boosters:{damage2:240}};
 const body=JSON.stringify({revision:0,progress});assert.ok(encoder.encode(body).length>65536);assert.ok(encoder.encode(body).length<MAX_SAVE_BYTES);
 const put=await f.call('PUT',body,{'content-length':String(encoder.encode(body).length)});assert.equal(put.status,200);assert.deepEqual(await put.json(),{stored:true,revision:1});
 const get=await f.call('GET');assert.equal(get.status,200);assert.deepEqual((await get.json()).save.progress,progress);
 assert.equal(f.writes,1);
 const conflict=await f.call('PUT',JSON.stringify({revision:0,progress:{level:1}}));assert.equal(conflict.status,409);assert.equal(f.writes,1);assert.equal(JSON.parse(f.saved.payload).level,215);
});
test('a save of exactly the byte limit is accepted',async()=>{
 const f=await fixture(),empty=JSON.stringify({revision:0,progress:{padding:''}});
 const body=JSON.stringify({revision:0,progress:{padding:'x'.repeat(MAX_SAVE_BYTES-encoder.encode(empty).length)}});
 assert.equal(encoder.encode(body).length,MAX_SAVE_BYTES);
 assert.equal((await f.call('PUT',body)).status,200);
});
test('oversized Content-Length is rejected before any database access',async()=>{
 const f=await fixture();const response=await f.call('PUT','{}',{'content-length':String(MAX_SAVE_BYTES+1)});
 assert.equal(response.status,413);assert.equal(f.reads,0);assert.equal(f.writes,0);
});
test('chunked oversized bodies are cancelled without writing or trusting Content-Length',async()=>{
 const f=await fixture();let cancelled=false,chunks=0;
 const body=new ReadableStream({pull(controller){chunks++;controller.enqueue(new Uint8Array(128*1024));},cancel(){cancelled=true}});
 const response=await f.call('PUT',body,{'content-length':'2'});
 assert.equal(response.status,413);assert.equal(cancelled,true);assert.ok(chunks<20);assert.equal(f.reads,0);assert.equal(f.writes,0);
});
test('body limits count UTF-8 bytes and an oversized request preserves an existing save',async()=>{
 const f=await fixture();assert.equal((await f.call('PUT',JSON.stringify({revision:0,progress:{level:215,gold:12345}}))).status,200);
 const before=f.saved.payload;
 const body=JSON.stringify({revision:1,progress:{padding:'宇'.repeat(400000)}});
 assert.ok(body.length<MAX_SAVE_BYTES);assert.ok(encoder.encode(body).length>MAX_SAVE_BYTES);
 assert.equal((await f.call('PUT',body)).status,413);assert.equal(f.saved.payload,before);assert.equal(f.saved.revision,1);assert.equal(f.writes,1);
});
