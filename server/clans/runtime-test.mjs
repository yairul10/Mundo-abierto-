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
 let db=await mf.getD1Database('CLANS_DB');
 const schema=readFileSync(new URL('./migrations/0001-clans.sql',import.meta.url),'utf8');
 await db.batch(schema.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 assert.equal((await mf.dispatchFetch('https://test/clans/me')).status,401);
 let response=await read();assert.equal(response.status,200);assert.equal((await response.json()).clan,null);
 await db.batch([db.prepare("INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES('normal','one','Clan Uno','clan uno','UNO',1)"),db.prepare("INSERT INTO clan_members VALUES('normal',?,'one','leader',1)").bind(id)]);
 await mf.dispose();mf=new Miniflare(options);
 response=await read();assert.equal(response.status,200);const data=await response.json();assert.equal(data.clan.id,'one');assert.equal(data.permissions.editClan,true);assert.equal(data.rules.creationCost,200000);
 console.log('PASS Worker identity + real D1: migration, unauthenticated denial, verified account read and membership persistence after restart.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
