import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from '../pvp/worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const id='12345678-1234-1234-1234-123456789abc',persist=mkdtempSync(join(tmpdir(),'clan-missions-'));
// Fixture-only subclass: real worldSave/alarm/outbox, with combat/network output disabled.
const contents=`import {SharedWorld} from '../pvp/shared-world.mjs';
import {clanRoute} from './route.mjs';
export {ArenaRoom,ArenaLobby} from '../pvp/worker.mjs';
export class MissionHarness extends SharedWorld {
 advanceRoom(){} worldBroadcast(){} startSimulation(){}
 seed(){const now=Date.now(),p={id:'pilot',accountId:'${id}',realm:'normal',profile:{shipId:'obsidian'},connected:false,lastSeen:now};const s={cooperative:true,room:{status:'completed'},players:[p],duels:[],invites:[],events:[],bossRewards:[{id:'fixture-receipt',bossId:'fixture-boss',playerId:'pilot',enemyKind:'colossusPro',damage:10,totalDamage:10,amount:1}]};this.worldSave(s,true);return this.count()}
 count(){return this.ctx.storage.sql.exec('SELECT count(*) n FROM clan_mission_outbox').toArray()[0].n}
 async drain(){await this.alarm();return {count:this.count(),alarm:await this.ctx.storage.getAlarm()}}
}
export default {async fetch(req,env){const path=new URL(req.url).pathname;if(path.startsWith('/fixture/')){const room=env.FIXTURE.getByName('one');return Response.json(path.endsWith('seed')?await room.seed():await room.drain())}const r=await clanRoute(req,env);return Response.json(r.body,{status:r.status})}};`;
const options={modules:[{type:'ESModule',path:'server/clans/missions-runtime-worker.mjs',contents},...workerTestModules()],compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:join(persist,'d1'),durableObjects:{FIXTURE:{className:'MissionHarness',useSQLite:true},ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:join(persist,'do'),serviceBindings:{PLAY_IDENTITY:()=>Response.json({authenticated:true,playerId:id})}};
let mf=new Miniflare(options);
const request=(path,method='GET',auth=true)=>mf.dispatchFetch('https://test'+path,{method,headers:auth?{Authorization:'Bearer fixture-token-123'}:{}});
try{
 let db=await mf.getD1Database('CLANS_DB');
 for(const file of ['0001-clans.sql']){const sql=readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8');await db.batch(sql.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)))}
 await db.batch([db.prepare("CREATE TABLE players(id TEXT PRIMARY KEY,display_name TEXT)"),db.prepare('INSERT INTO players VALUES(?,?)').bind(id,'Piloto Real'),db.prepare("INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES('normal','one','Clan Uno','clan uno','UNO',1)"),db.prepare("INSERT INTO clan_members VALUES('normal',?,'one','leader',1)").bind(id)]);
 assert.equal(await (await request('/fixture/seed')).json(),1);
 // Delivery fails before schema exists: queue survives and alarm retries even in a finished room.
 const failed=await (await request('/fixture/drain')).json();assert.equal(failed.count,1);assert.ok(failed.alarm>Date.now());
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('CLANS_DB');
 const migration=readFileSync(new URL('./migrations/0006-clan-missions.sql',import.meta.url),'utf8');await db.batch(migration.split(/;\n/).map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 assert.equal((await (await request('/fixture/drain')).json()).count,0);
 let missions=await request('/clans/missions');assert.equal(missions.status,200);missions=await missions.json();assert.equal(missions.missions[0].progress,1);assert.equal(missions.contributors[0].pilot,'Piloto Real');
 await request('/fixture/seed');await request('/fixture/drain');assert.equal((await (await request('/clans/missions')).json()).missions[0].progress,1);
 assert.equal((await request('/clans/missions','POST')).status,405);assert.equal((await request('/clans/missions','GET',false)).status,401);assert.equal((await (await request('/clans/ranking')).json()).ranking[0].kills,1);
 console.log('PASS real Worker + D1 + SQLite: mission outbox atomic persistence, failed delivery retry, restart recovery, deduplication, verified names and read-only authenticated routes.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
