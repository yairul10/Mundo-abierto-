import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from '../pvp/worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'clans-d1-')),id='12345678-1234-1234-1234-123456789abc';
const options={modules:workerTestModules(),compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:persist,serviceBindings:{PLAY_IDENTITY:request=>Response.json({authenticated:true,playerId:request.headers.get('Authorization')==='Bearer member-session-123'?'22222222-2222-2222-2222-222222222222':id})},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);
const read=()=>mf.dispatchFetch('https://test/clans/me?accountId=forged',{headers:{Authorization:'Bearer fixture-session-123'}});
try{
 const db=await mf.getD1Database('CLANS_DB'),member='22222222-2222-2222-2222-222222222222';
 await db.prepare('CREATE TABLE player_saves(player_id TEXT PRIMARY KEY)').run();await db.prepare('INSERT INTO player_saves VALUES(?)').bind(member).run();
 for(const file of ['0001-clans.sql','0003-clan-membership.sql']){const schema=readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8');await db.batch(schema.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
 await db.batch([db.prepare("INSERT INTO clans(realm,id,name,name_key,tag,admission,created_at) VALUES('normal','one','Clan Uno','clan uno','UNO','request',1)"),db.prepare("INSERT INTO clan_members VALUES('normal',?,'one','leader',1)").bind(id)]);
 const act=async(token,action,targetId)=>{const response=await mf.dispatchFetch('https://test/clans/membership',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,clanId:'one',targetId})});return {status:response.status,...await response.json()}};
 assert.equal((await act('member-session-123','request')).requested,true);
 assert.equal((await act('member-session-123','approve',member)).status,403);
 assert.equal((await act('fixture-session-123','approve',member)).joined,true);
 await mf.dispose();mf=new Miniflare(options);
 const response=await mf.dispatchFetch('https://test/clans/me',{headers:{Authorization:'Bearer member-session-123'}}),data=await response.json();assert.equal(data.clan.role,'member');assert.equal(data.pilotId,member);assert.equal(data.requests.length,0);
 assert.equal((await act('member-session-123','leave')).left,true);
 assert.equal((await act('fixture-session-123','invite',member)).invited,true);assert.equal((await act('member-session-123','acceptInvite')).joined,true);
 console.log('PASS real Worker/D1: verified requests, role validation, approval, persistence after restart, leave and private invitation acceptance.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
