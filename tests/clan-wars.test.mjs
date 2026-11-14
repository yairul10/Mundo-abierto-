import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {WAR_COUNTDOWN,activeWarPilot,warTimeWinner} from '../server/clan-wars/rules.mjs';
import {warAdmin} from '../server/clan-wars/route.mjs';
import {enterPvp,advancePvp,resolveDuelRound,swapTeams,changeTeam} from '../server/pvp/pvp-match.mjs';
const url=new URL('../server/clan-wars/lobby.mjs',import.meta.url),source=readFileSync(url,'utf8').replace("import {CoopLobby} from '../pvp/coop-lobby.mjs';",'class CoopLobby {constructor(ctx,env){this.ctx=ctx;this.env=env}}').replace(/from '(\.\.?\/[^']+)'/g,(_,p)=>`from '${new URL(p,url).href}'`);
const {ClanWarLobby}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ids=Array.from({length:5},(_,i)=>`${i+1}2345678-1234-1234-1234-123456789abc`);
function fixture(){
 const d1=new DatabaseSync(':memory:'),storage=new DatabaseSync(':memory:');d1.exec('PRAGMA foreign_keys=ON');d1.exec(readFileSync(new URL('../server/clans/migrations/0001-clans.sql',import.meta.url),'utf8'));
 for(const [id,tag]of [['one','UNO'],['two','DOS']])d1.prepare('INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES(?,?,?,?,?,0)').run('normal',id,'Clan '+tag,tag.toLowerCase(),tag);
 for(let i=0;i<4;i++)d1.prepare('INSERT INTO clan_members VALUES(?,?,?,?,0)').run('normal',ids[i],i<2?'one':'two',i%2?'member':'leader');
 const db={prepare(q){return {bind(...args){return {async all(){return {results:d1.prepare(q).all(...args)}}}}}}};let alarm=null;const ctx={storage:{sql:{exec(q,...args){const result=storage.prepare(q).all(...args);return {toArray:()=>result}}},setAlarm:async t=>alarm=t,deleteAlarm:async()=>alarm=null}};
 const rooms=new Map(),env={CLANS_DB:db,ROOMS:{getByName(name){if(!rooms.has(name))rooms.set(name,{async configureClanWar(spec){this.spec=spec;return {ok:true}},async clanWarResult(){return {status:'waiting'}}});return rooms.get(name)}}};const lobby=new ClanWarLobby(ctx,env);return {lobby,ctx,env,d1,storage,rooms,get alarm(){return alarm},close(){d1.close();storage.close()}};
}
test('only admin opens/starts, officers register exact clan rosters, countdown locks entries and public status hides IDs',async()=>{
 const f=fixture();try{
 assert.equal((await f.lobby.warRequest(ids[0],false,'normal',{action:'open',mode:'2v2'})).error,'war_admin_only');
 await f.lobby.warCommand(ids[0],true,'normal',{action:'open',mode:'2v2'});
 assert.equal((await f.lobby.warRequest(ids[1],false,'normal',{action:'register',roster:ids.slice(0,2)})).error,'war_officer_only');
 assert.equal((await f.lobby.warRequest(ids[0],false,'normal',{action:'register',roster:[ids[0],ids[2]]})).error,'war_members_only');
 await f.lobby.warCommand(ids[0],false,'normal',{action:'register',roster:ids.slice(0,2)});await f.lobby.warCommand(ids[2],false,'normal',{action:'register',roster:ids.slice(2,4)});
 const before=Date.now();const status=await f.lobby.warCommand(ids[0],true,'normal',{action:'start'});assert.ok(status.event.beginsAt>=before+WAR_COUNTDOWN);assert.equal(status.event.matches.length,1);assert.equal(await f.lobby.reservation(ids[0]),true);assert.equal(JSON.stringify(status).includes(ids[1]),false);
 assert.equal((await f.lobby.warRequest(ids[0],false,'normal',{action:'register',roster:ids.slice(0,2)})).error,'war_registration_closed');
 assert.equal((await f.lobby.warTicket({accountId:ids[4],eventId:status.event.id})).error,'war_not_assigned');
 }finally{f.close()}
});
test('presence freezes at start, incomplete teams fight, restart recovers event and absence is decided without bots',async()=>{
 const oldNow=Date.now;let now=1000000;Date.now=()=>now;const f=fixture();try{
 await f.lobby.warCommand(ids[0],true,'normal',{action:'open',mode:'2v2'});for(const i of [0,2])await f.lobby.warCommand(ids[i],false,'normal',{action:'register',roster:ids.slice(i,i+2)});
 await f.lobby.warCommand(ids[0],true,'normal',{action:'start'});now+=WAR_COUNTDOWN;
 for(const i of [0,2])await f.lobby.warCommand(ids[i],false,'normal',{action:'presence',active:true});
 await f.lobby.alarm();const spec=[...f.rooms.values()][0].spec;assert.equal(spec.roster.length,2);assert.equal(new Set(spec.roster.map(p=>p.team)).size,2);
 const restored=new ClanWarLobby(f.ctx,f.env),status=await restored.warCommand(ids[0],false,'normal',{action:'status'});assert.equal(status.event.phase,'active');assert.ok(status.assignment);assert.equal((await restored.warCommand(ids[1],false,'normal',{action:'status'})).assignment,null);
 // A new, independent fixture with neither team online is annulled.
 const absent=fixture();try{await absent.lobby.warCommand(ids[0],true,'normal',{action:'open',mode:'2v2'});for(const i of [0,2])await absent.lobby.warCommand(ids[i],false,'normal',{action:'register',roster:ids.slice(i,i+2)});await absent.lobby.warCommand(ids[0],true,'normal',{action:'start'});now+=WAR_COUNTDOWN;await absent.lobby.alarm();assert.equal(absent.lobby.event().matches[0].reason,'both_absent');assert.equal(absent.lobby.event().phase,'finished');assert.equal(absent.rooms.size,0)}finally{absent.close()}
 }finally{Date.now=oldNow;f.close()}
});
test('one active clan wins by absence; stale/AFK presence and removed members do not get a seat',async()=>{
 const oldNow=Date.now;let now=1000000;Date.now=()=>now;const f=fixture();try{
 await f.lobby.warCommand(ids[0],true,'normal',{action:'open',mode:'2v2'});for(const i of [0,2])await f.lobby.warCommand(ids[i],false,'normal',{action:'register',roster:ids.slice(i,i+2)});await f.lobby.warCommand(ids[0],true,'normal',{action:'start'});now+=WAR_COUNTDOWN;
 await f.lobby.warCommand(ids[0],false,'normal',{action:'presence',active:true});await f.lobby.warCommand(ids[2],false,'normal',{action:'presence',active:false});await f.lobby.warCommand(ids[3],false,'normal',{action:'presence',active:true});f.d1.prepare('DELETE FROM clan_members WHERE account_id=?').run(ids[3]);await f.lobby.alarm();const e=f.lobby.event(),m=e.matches[0];assert.equal(m.reason,'absence');assert.equal(m.winnerTeam,m.a==='one'?'a':'b');assert.equal(f.rooms.size,0);
 assert.equal(activeWarPilot({seenAt:now-26000,activeAt:now},now),false);assert.equal(activeWarPilot({seenAt:now,activeAt:now-91000},now),false);
 }finally{Date.now=oldNow;f.close()}
});
const playerBody=accountId=>({accountId,name:'Pilot',realm:'normal',clientVersion:5,shipId:'aurora',roster:{aurora:{maxHp:1000,maxShield:100,attack:100,defense:0,speed:200,maxEnergy:100}}});
async function combatFixture(){const s={players:[],events:[],duels:[],invites:[],cooperative:false,pvpMatch:{code:'ABCDEF',mode:'5v5',status:'waiting',createdAt:10000,bestOf:3,round:1,score:{a:0,b:0},clanWar:{eventId:'event',joinDeadline:20000,roster:[{accountId:ids[0],slot:0,team:'a'},{accountId:ids[2],slot:1,team:'b'}]}}},world={ctx:{storage:{setAlarm:async()=>{}}},worldSave(){}};await enterPvp(world,s,playerBody(ids[2]),'b',10000);await enterPvp(world,s,playerBody(ids[0]),'a',10000);for(const p of s.players)p.connected=true;return {s,world}}
test('locked war teams start below 5v5 capacity, reset hull/skills each round and win at two rounds',async()=>{
 const {s,world}=await combatFixture();assert.equal(s.players.find(p=>p.id==='a').team,'a');assert.equal((await enterPvp(world,s,playerBody(ids[4]),'outsider',10001)).error,'war_not_assigned');assert.equal(changeTeam(s,s.players[0],'a'),'war_team_locked');assert.equal(swapTeams(s,s.players[0],['a','b']),'war_team_locked');
 advancePvp(s,10001);assert.equal(s.pvpMatch.status,'countdown');advancePvp(s,15001);assert.equal(s.pvpMatch.status,'active');const a=s.players.find(p=>p.id==='a'),b=s.players.find(p=>p.id==='b');a.hp=2;a.skillReadyAt={fury:999999};b.hp=0;advancePvp(s,15002);assert.equal(s.pvpMatch.score.a,1);assert.equal(a.hp,a.profile.maxHp);assert.equal(a.skillReadyAt.fury,undefined);advancePvp(s,19002);b.hp=0;advancePvp(s,19003);assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.score.a,2);assert.equal(s.pvpMatch.winnerTeam,'a');
});
test('round timeout compares surviving players then normalized hull/shield; admin whitelist uses verified identity',async()=>{
 const p=(team,hp)=>({team,hp,shield:0,profile:{maxHp:100,maxShield:0}});assert.equal(warTimeWinner([p('a',20),p('b',10)]),'a');assert.equal(warTimeWinner([p('a',1),p('a',1),p('b',100)]),'a');assert.equal(warTimeWinner([p('a',100),p('b',100)]),null);
 assert.equal(await warAdmin(ids[0],{CHAT_ADMIN_IDS:ids[0]}),true);assert.equal(await warAdmin(ids[1],{CHAT_ADMIN_IDS:ids[0]}),false);
});
