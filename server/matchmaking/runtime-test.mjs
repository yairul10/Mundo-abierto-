import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {workerTestModules} from '../pvp/worker-test-modules.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'ranked-')),ids=Array.from({length:5},(_,i)=>`${i+1}2345678-1234-1234-1234-123456789abc`);
const contents=`import worker from '../pvp/worker.mjs';import {SharedWorld} from '../pvp/shared-world.mjs';import {ClanWarLobby} from '../clan-wars/lobby.mjs';import {advancePvp} from '../pvp/pvp-match.mjs';import {rankedCoordinator} from './route.mjs';import {pvpRoomName} from '../pvp/pvp-teams.mjs';
export class TestLobby extends ClanWarLobby{expire(){const s=JSON.parse(this.ctx.storage.sql.exec('SELECT data FROM matchmaking_state WHERE id=1').toArray()[0].data);for(const q of s.queues)q.deadline=Date.now()-1;for(const m of s.matches)m.startsAt=Date.now()-1;this.ctx.storage.sql.exec('UPDATE matchmaking_state SET data=? WHERE id=1',JSON.stringify(s));}}
export class TestRoom extends SharedWorld{fixture(action){const s=this.worldLoad(),now=Date.now();for(const p of s.players){p.connected=true;p.lastSeen=now}if(action==='start'){s.pvpMatch.ranked.joinDeadline=now-1;advancePvp(s,now);advancePvp(s,now+3001)}if(action==='killHuman'){s.players.find(p=>!p.isBot).hp=0;s.players.filter(p=>p.isBot)[0].hp=0;advancePvp(s,now+3100)}if(action==='win'){for(const p of s.players)if(p.team!=='a')p.hp=0;advancePvp(s,now+4000)}if(action==='finishArena'){const winner=s.players.find(p=>p.isBot&&p.hp>0);for(const p of s.players)if(p!==winner)p.hp=0;advancePvp(s,now+4000)}this.worldSave(s,true);return {status:s.pvpMatch.status,players:s.players,ranked:s.pvpMatch.ranked}}}
export default{async fetch(req,env){const u=new URL(req.url);if(u.pathname==='/fixture/expire'){await rankedCoordinator(env,'normal').expire();return Response.json({ok:true})}if(u.pathname==='/fixture/room')return Response.json(await env.ROOMS.getByName(pvpRoomName('normal',u.searchParams.get('code'),u.searchParams.get('mode'))).fixture(u.searchParams.get('action')));return worker.fetch(req,env)}};`;
const options={cf:false,modules:[{type:'ESModule',path:'server/matchmaking/runtime-worker.mjs',contents},...workerTestModules()],compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],d1Databases:['CLANS_DB'],d1Persist:join(persist,'db'),durableObjects:{ROOMS:{className:'TestRoom',useSQLite:true},LOBBIES:{className:'TestLobby',useSQLite:true}},durableObjectsPersist:join(persist,'do'),bindings:{TEST_SERVER_ENABLED:'true',TEST_GUEST_ACCESS:'true'},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:1000,period:60}}},serviceBindings:{PLAY_IDENTITY:req=>{const id=req.headers.get('Authorization')?.replace('Bearer fixture-','');return Response.json({authenticated:ids.includes(id),playerId:id})}}};
let mf=new Miniflare(options);
const call=async(raw={},index=0,path='/ranked/action')=>{const r=await mf.dispatchFetch('https://test'+path,{method:'POST',headers:{'Content-Type':'application/json',...(index===null?{}:{Authorization:'Bearer fixture-'+ids[index]})},body:JSON.stringify(raw)});return {status:r.status,data:await r.json()}};
const fixture=async(action,assignment)=>await (await mf.dispatchFetch('https://test/fixture/room?mode='+assignment.mode+'&code='+assignment.code+'&action='+action)).json();
try{
 const db=await mf.getD1Database('CLANS_DB');await db.exec('CREATE TABLE players(id TEXT PRIMARY KEY,display_name TEXT)');for(const [i,id]of ids.entries())await db.prepare('INSERT INTO players VALUES(?,?)').bind(id,'Pilot '+i).run();
 assert.equal((await call({},null)).status,401);
 assert.equal((await call({realm:'invalid'})).status,400);
 const party=(await call({action:'create'})).data.party;for(const i of [1,2])assert.equal((await call({action:'joinParty',code:party.id},i)).data.party.members.length,i+1);
 assert.equal((await call({action:'queue',mode:'5v5'},1)).data.error,'leader_only');assert.equal((await call({action:'queue',mode:'2v2'})).data.error,'party_too_large');
 const queued=await call({action:'queue',mode:'5v5'});assert.ok(queued.data.queue.deadline-queued.data.serverTime===120000);assert.equal(queued.data.assignment,null);
 await mf.dispatchFetch('https://test/fixture/expire');let assigned=(await call()).data.assignment;assert.ok(assigned);await mf.dispatchFetch('https://test/fixture/expire');assigned=(await call()).data.assignment;
 const loadout={clientVersion:5,matchId:assigned.id,shipId:'aurora',name:'FORGED',roster:{aurora:{shipId:'aurora',maxHp:1000,hp:1000,attack:100,defense:20,speed:220,maxEnergy:100}}};
 assert.equal((await call(loadout,3,'/ranked/join')).data.error,'match_not_assigned');
 for(const i of [0,1,2]){const r=await call(loadout,i,'/ranked/join');assert.equal(r.status,200,JSON.stringify(r));}
 let room=await fixture('start',assigned);assert.equal(room.players.length,10);assert.equal(room.players.filter(p=>p.isBot).length,7);assert.equal(new Set(room.players.filter(p=>!p.isBot).map(p=>p.team)).size,1);assert.ok(room.players.filter(p=>p.isBot).every(p=>!p.name.includes('BOT')));assert.equal(room.status,'active');
 room=await fixture('win',assigned);assert.equal(room.status,'finished');const settled=await call();assert.equal(settled.data.rank.points,50);assert.equal((await call()).data.rank.points,50);assert.equal((await call({},1)).data.rank.points,50);
 await call({action:'leaveParty'});await call({action:'queue',mode:'arena20'});await mf.dispatchFetch('https://test/fixture/expire');assigned=(await call()).data.assignment;await mf.dispatchFetch('https://test/fixture/expire');assigned=(await call()).data.assignment;assert.equal((await call({...loadout,matchId:assigned.id},0,'/ranked/join')).status,200);
 room=await fixture('start',assigned);assert.equal(room.players.length,20);room=await fixture('killHuman',assigned);assert.equal(room.status,'active');assert.equal(room.players.find(p=>!p.isBot).place,19);await fixture('finishArena',assigned);assert.equal((await call()).data.rank.points,51);
 await mf.dispose();mf=new Miniflare(options);assert.equal((await call()).data.rank.points,51);
 // A complete human 1v1 starts before the two-minute deadline; cancel remains leader-only.
 const first=await call({action:'queue',mode:'1v1'});assert.ok(first.data.queue);
 const full=await call({action:'queue',mode:'1v1'},3);assert.ok(full.data.assignment);assert.ok(full.data.serverTime<first.data.queue.deadline);
 const assignment=(await call()).data.assignment;assert.equal(assignment.id,full.data.assignment.id);
 assert.equal((await call({action:'cancel'})).data.error,'match_assigned');

 console.log('Ranked runtime passed: verified parties, 120s queue, same-team friends, authorized travel, randomized fill, real combat after death, placements and idempotent points across restart.');
}finally{await mf.dispose();rmSync(persist,{recursive:true,force:true})}
