import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {workerTestModules} from '../pvp/worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const ids=Array.from({length:4},(_,i)=>`${i+1}2345678-1234-1234-1234-123456789abc`),persist=mkdtempSync(join(tmpdir(),'clan-wars-'));
// Test-only fixtures accelerate the clock and combat. Production has no fixture endpoints.
const contents=`import worker from '../pvp/worker.mjs';
import {SharedWorld} from '../pvp/shared-world.mjs';import {ClanWarLobby} from './lobby.mjs';import {advancePvp} from '../pvp/pvp-match.mjs';import {pvpRoomName} from '../pvp/pvp-teams.mjs';
export class TestLobby extends ClanWarLobby {async dueFixture(clear=false){const e=this.event();e.beginsAt=Date.now()-1;this.save(e);if(clear)this.ctx.storage.sql.exec('DELETE FROM war_presence');await this.alarm();return this.event()}async collectFixture(){await this.alarm();return this.event()}}
export class TestRoom extends SharedWorld {winFixture(){const s=this.worldLoad(),now=Date.now();for(const p of s.players){p.connected=true;p.lastSeen=now+15000}advancePvp(s,now);advancePvp(s,now+5000);for(const p of s.players)if(p.team==='b')p.hp=0;advancePvp(s,now+5001);advancePvp(s,now+9001);for(const p of s.players)if(p.team==='b')p.hp=0;advancePvp(s,now+9002);this.worldSave(s,true);return s.pvpMatch}}
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname==='/fixture/due')return Response.json(await env.LOBBIES.getByName('clan-war-normal').dueFixture(u.searchParams.has('clear')));if(u.pathname==='/fixture/collect')return Response.json(await env.LOBBIES.getByName('clan-war-normal').collectFixture());if(u.pathname==='/fixture/win')return Response.json(await env.ROOMS.getByName(pvpRoomName('normal',u.searchParams.get('code'),'2v2')).winFixture());return worker.fetch(req,env)}};`;
const options={modules:[{type:'ESModule',path:'server/clan-wars/runtime-worker.mjs',contents},...workerTestModules()],compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:join(persist,'d1'),durableObjects:{LOBBIES:{className:'TestLobby',useSQLite:true},ROOMS:{className:'TestRoom',useSQLite:true}},durableObjectsPersist:join(persist,'do'),bindings:{CHAT_ADMIN_IDS:ids[0],TEST_SERVER_ENABLED:'true'},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}},serviceBindings:{PLAY_IDENTITY:req=>{const id=req.headers.get('Authorization')?.replace('Bearer fixture-','');return Response.json({authenticated:ids.includes(id),playerId:id})}}};
let mf=new Miniflare(options);
const call=async(path,id=ids[0],body)=>{const r=await mf.dispatchFetch('https://test'+path,{method:body?'POST':'GET',headers:id?{Authorization:'Bearer fixture-'+id,'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}};
try{
 let db=await mf.getD1Database('CLANS_DB');const schema=readFileSync(new URL('../clans/migrations/0001-clans.sql',import.meta.url),'utf8');await db.batch(schema.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 for(const file of ['0006-clan-missions.sql','0007-clan-war-points.sql']){const sql=readFileSync(new URL('../clans/migrations/'+file,import.meta.url),'utf8');await db.batch(sql.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)))}
 for(const [id,tag]of [['one','UNO'],['two','DOS']])await db.prepare('INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES(?,?,?,?,?,0)').bind('normal',id,'Clan '+tag,tag.toLowerCase(),tag).run();for(let i=0;i<4;i++)await db.prepare('INSERT INTO clan_members VALUES(?,?,?,?,0)').bind('normal',ids[i],i<2?'one':'two',i%2?'member':'leader').run();
 assert.equal((await call('/wars/status',null)).status,401);assert.equal((await call('/wars/action',ids[1],{action:'open',mode:'2v2'})).status,403);
 assert.equal((await call('/wars/action',ids[0],{action:'open',mode:'2v2'})).status,200);
 for(const i of [0,2])assert.equal((await call('/wars/action',ids[i],{action:'register',roster:ids.slice(i,i+2)})).status,200);
 const start=await call('/wars/action',ids[0],{action:'start'});assert.equal(start.data.event.phase,'countdown');assert.ok(start.data.event.beginsAt>Date.now()+299000);
 assert.equal((await call('/arena/join',ids[0],{clientVersion:5,arena:{action:'find',mode:'2v2'}})).data.error,'war_pending');
 for(const i of [0,2])await call('/wars/status',ids[i],{active:true});await call('/fixture/due');
 const first=await call('/wars/status',ids[0]);assert.ok(first.data.assignment);assert.equal((await call('/wars/status',ids[1])).data.assignment,null);
 const eventId=first.data.event.id,code=first.data.assignment.code;
 const body={eventId,clientVersion:5,snapshotDelta:1,name:'Piloto',shipId:'aurora',roster:{aurora:{maxHp:1000,maxShield:100,attack:100,defense:0,speed:200,maxEnergy:100}}};
 assert.equal((await call('/wars/join',ids[1],body)).data.error,'war_not_assigned');for(const i of [0,2]){const ticket=await call('/wars/join',ids[i],{...body,accountId:ids[1]});assert.equal(ticket.status,200);assert.ok(ticket.data.token);assert.equal(ticket.data.arena.code,code)}
 const combat=await call('/fixture/win?code='+code);assert.equal(combat.data.status,'finished');assert.equal(combat.data.score.a,2);
 await db.prepare('DROP TABLE clan_war_points').run();const retry=await call('/fixture/collect');assert.equal(retry.data.phase,'active');const repair=readFileSync(new URL('../clans/migrations/0007-clan-war-points.sql',import.meta.url),'utf8');await db.batch(repair.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const ended=await call('/fixture/collect');assert.equal(ended.data.phase,'finished');assert.equal(ended.data.matches[0].winnerTeam,'a');await call('/fixture/collect');const ranking=await call('/clans/ranking');assert.equal(ranking.data.ranking[0].points,100);assert.equal(ranking.data.ranking[0].warWins,1);
 await mf.dispose();mf=new Miniflare(options);const restored=await call('/wars/status');assert.equal(restored.data.event.id,eventId);assert.equal(restored.data.event.matches[0].score.a,2);assert.equal(restored.data.history[0].id,eventId);assert.equal((await call('/clans/ranking')).data.ranking[0].points,100);
 await call('/wars/action',ids[0],{action:'open',mode:'5v5'});assert.equal((await call('/wars/action',ids[0],{action:'register',roster:ids.slice(0,2)})).data.error,'war_invalid_roster');await call('/wars/action',ids[0],{action:'cancel'});
 console.log('PASS real Worker/D1/DO: verified admin and clan enrollment, manual countdown, incomplete active teams, locked war tickets, real best-of-three result and restart/history persistence.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
