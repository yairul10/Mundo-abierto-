import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {workerTestModules} from './worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'global-chat-'));
const ids=['12345678-1234-1234-1234-123456789abc','22345678-1234-1234-1234-123456789abc'];
const options={modules:workerTestModules(),compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:join(persist,'d1'),durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:join(persist,'do'),bindings:{CHAT_ADMIN_KEY:'fixture-secret',CHAT_ADMIN_IDS:ids[0],TEST_SERVER_ENABLED:'true',TEST_GUEST_ACCESS:'true'},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}},serviceBindings:{PLAY_IDENTITY:req=>{const id=req.headers.get('Authorization')?.replace('Bearer fixture-','');return Response.json({authenticated:ids.includes(id),playerId:id})}}};
let mf=new Miniflare(options);
const call=async(message,id=ids[0],realm='normal')=>{const r=await mf.dispatchFetch('https://test/chat',{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+(id.startsWith('test-guest-')?id:'fixture-'+id)}:{})},body:JSON.stringify({realm,message,accountId:ids[1],name:'FORGED'})});return {status:r.status,data:await r.json()}};
try{
 const db=await mf.getD1Database('CLANS_DB');await db.exec('CREATE TABLE players(id TEXT PRIMARY KEY,display_name TEXT)');for(let i=0;i<2;i++)await db.prepare('INSERT INTO players VALUES(?,?)').bind(ids[i],i?'Bob':'Alice').run();
 assert.equal((await call({type:'chatHistory'},null)).status,401);
 assert.equal((await call({type:'chatHistory'},'test-guest-'+'a'.repeat(64),'test')).status,403);
 assert.equal((await call({type:'chatHistory'},ids[0],'bad')).status,400);
 const sent=await call({type:'chatSend',text:'Hola desde PVE',rulesVersion:1});assert.equal(sent.status,200);assert.equal(sent.data.events[0].message.name,'Alice');assert.equal(sent.data.events[0].message.author,ids[0]);
 const history=await call({type:'chatHistory'},ids[1]);assert.equal(history.data.events[0].messages[0].text,'Hola desde PVE');
 assert.deepEqual((await call({type:'chatHistory'},ids[1],'test')).data.events[0].messages,[]);
 assert.equal((await call({type:'chatSend',text:'spam',rulesVersion:1})).data.events[0].type,'chatError');
 await mf.dispose();mf=new Miniflare(options);
 assert.equal((await call({type:'chatHistory'})).data.events[0].messages[0].name,'Alice');
 console.log('Global chat runtime: verified identity, guest denial, shared history, realm isolation, cooldown, persistence passed.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
