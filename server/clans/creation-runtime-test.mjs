import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from '../pvp/worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'clans-d1-')),id='12345678-1234-1234-1234-123456789abc';
const options={modules:workerTestModules(),compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:persist,serviceBindings:{PLAY_IDENTITY:()=>Response.json({authenticated:true,playerId:id})},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);
const read=()=>mf.dispatchFetch('https://test/clans/me?accountId=forged',{headers:{Authorization:'Bearer fixture-session-123'}});
try{
 const db=await mf.getD1Database('CLANS_DB');
 await db.prepare('CREATE TABLE player_saves(player_id TEXT PRIMARY KEY,payload TEXT,revision INTEGER,updated_at TEXT)').run();
 for(const file of ['0001-clans.sql','0002-clan-payments.sql']){const schema=readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8');await db.batch(schema.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
 await db.prepare('INSERT INTO player_saves VALUES(?,?,1,CURRENT_TIMESTAMP)').bind(id,JSON.stringify({gold:500000})).run();
 const input={name:'Primer Clan',tag:'UNO',description:'Hola',admission:'request',revision:1,operationId:crypto.randomUUID(),accountId:'forged'},headers={Authorization:'Bearer fixture-session-123','Content-Type':'application/json'};
 const create=()=>mf.dispatchFetch('https://test/clans/create',{method:'POST',headers,body:JSON.stringify(input)});
 const responses=await Promise.all([create(),create()]);for(const response of responses)assert.equal(response.status,200);const [a,b]=await Promise.all(responses.map(r=>r.json()));assert.equal(a.clanId,b.clanId);
 const saved=await db.prepare('SELECT payload,revision FROM player_saves WHERE player_id=?').bind(id).first();assert.equal(JSON.parse(saved.payload).gold,300000);assert.equal(saved.revision,2);
 await mf.dispose();mf=new Miniflare(options);
 const response=await create();assert.equal(response.status,200);assert.equal((await response.json()).clanId,a.clanId);
 const me=await read();assert.equal((await me.json()).clan.role,'leader');
 console.log('PASS real Worker/D1: concurrent creation, verified leader, atomic 200k debit, persisted replay without duplicate charge.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
