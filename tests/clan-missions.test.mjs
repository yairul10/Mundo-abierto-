import {awardClanWarPoints} from '../server/clan-wars/points.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {clanWeek,WEEK_MS,clanMissions,clanRanking,recordClanMissionEvents} from '../server/clans/missions.mjs';
import {initClanMissionOutbox,queueClanMissionEvents,flushClanMissionOutbox} from '../server/clans/mission-outbox.mjs';
const actor='12345678-1234-1234-1234-123456789abc',other='22345678-1234-1234-1234-123456789abc',week=clanWeek(Date.UTC(2026,10,14));
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of ['0001-clans.sql','0006-clan-missions.sql','0007-clan-war-points.sql'])sql.exec(readFileSync(new URL('../server/clans/migrations/'+f,import.meta.url),'utf8'));
 const db={prepare(q){return {bind(...args){return {q,args,async all(){return {results:sql.prepare(q).all(...args)}}}}}},async batch(ss){sql.exec('BEGIN');try{const out=ss.map(s=>({results:sql.prepare(s.q).all(...s.args)}));sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
 for(const [realm,id,tag]of [['normal','one','UNO'],['normal','two','DOS'],['test','one','TEST']])sql.prepare('INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES(?,?,?,?,?,?)').run(realm,id,'Clan '+tag,tag.toLowerCase(),tag,week-100);
 for(const [realm,id,role]of [['normal',actor,'leader'],['normal',other,'member'],['test',actor,'leader']])sql.prepare('INSERT INTO clan_members VALUES(?,?,?,?,?)').run(realm,id,'one',role,week);
 const event=(id,kind='raider',accountId=actor,time=week+1000,realm='normal')=>({eventId:id,kind,accountId,time,realm});
 return {sql,db,event};
}
test('weeks reset at Monday UTC, same boss counts once per clan and every damaging member records a contribution',async()=>{
 const f=fixture();try{
 assert.equal(clanWeek(Date.UTC(2026,10,16)),Date.UTC(2026,10,16));assert.equal(clanWeek(week+WEEK_MS-1),week);
 await recordClanMissionEvents(f.db,[f.event('boss','colossusPro'),f.event('boss','colossusPro',other)]);
 await recordClanMissionEvents(f.db,[f.event('boss','colossusPro')]);
 const state=await clanMissions(f.db,'normal',actor,week+2000);assert.equal(state.missions[0].progress,1);assert.equal(state.missions[1].progress,1);assert.equal(state.contributors.length,2);assert.equal(state.contributors[0].kills,1);
 assert.equal((await clanMissions(f.db,'test',actor,week+2000)).missions[0].progress,0);assert.equal((await clanMissions(f.db,'normal',actor,week+WEEK_MS)).missions[0].progress,0);
 }finally{f.sql.close()}
});
test('mission thresholds grant fixed points once and rank clans deterministically without client claims',async()=>{
 const f=fixture();try{
 const events=Array.from({length:105},(_,i)=>f.event('e'+i,i<10?'colossusPro':i<15?'granTitanPro':i<18?'infernoPro':'raider'));
 for(let i=0;i<events.length;i+=50)await recordClanMissionEvents(f.db,events.slice(i,i+50));
 const ranking=await clanRanking(f.db,'normal',week+2000);assert.equal(ranking.ranking[0].points,1000);assert.equal(ranking.ranking[0].kills,105);assert.equal(ranking.ranking[1].points,0);
 await recordClanMissionEvents(f.db,[f.event('extra','nexo')]);assert.equal((await clanRanking(f.db,'normal',week+2000)).ranking[0].points,1000);
 assert.equal((await clanRanking(f.db,'test',week+2000)).ranking[0].points,0);
 assert.equal((await clanMissions(f.db,'normal','outsider',week+2000)).clan,null);
 }finally{f.sql.close()}
});
test('delayed receipt cannot move credit to a newly joined clan; leaving preserves earned clan points; disband cascades',async()=>{
 const f=fixture();try{
 await recordClanMissionEvents(f.db,[f.event('earned')]);f.sql.prepare("DELETE FROM clan_members WHERE realm='normal' AND account_id=?").run(actor);
 f.sql.prepare("INSERT INTO clan_members VALUES('normal',?,'two','leader',?)").run(actor,week+3000);
 await recordClanMissionEvents(f.db,[f.event('delayed')]);assert.equal((await clanMissions(f.db,'normal',actor,week+4000)).missions[0].progress,0);
 assert.equal((await clanRanking(f.db,'normal',week+4000)).ranking.find(c=>c.id==='one').kills,1);
 await recordClanMissionEvents(f.db,[f.event('new','raider',actor,week+4000)]);assert.equal((await clanMissions(f.db,'normal',actor,week+5000)).missions[0].progress,1);
 f.sql.prepare("DELETE FROM clans WHERE realm='normal' AND id='one'").run();assert.equal(f.sql.prepare("SELECT count(*) n FROM clan_mission_events WHERE clan_id='one'").get().n,0);
 }finally{f.sql.close()}
});
test('durable outbox excludes practice/bots/guests/admin/zero damage and retries failed or duplicate delivery',async()=>{
 const f=fixture(),sql=new DatabaseSync(':memory:'),ctx={storage:{sql:{exec(q,...args){const result=sql.prepare(q).all(...args);return {toArray:()=>result}}},transactionSync(fn){sql.exec('BEGIN');try{fn();sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}}};
 try{initClanMissionOutbox(ctx);const p={id:'pilot',accountId:actor,realm:'normal',profile:{shipId:'obsidian'}};
 const state={cooperative:true,players:[p]},reward={id:'r',bossId:'boss',playerId:'pilot',enemyKind:'colossusPro',damage:1};
 for(const flags of [{isBot:true},{testGuest:true},{profile:{shipId:'adminpod'}}])queueClanMissionEvents(ctx,{...state,players:[{...p,...flags}]},[reward],week+1000);
 queueClanMissionEvents(ctx,{...state,pvpMatch:{}},[reward],week+1000);queueClanMissionEvents(ctx,state,[{...reward,damage:0}],week+1000);assert.equal(sql.prepare('SELECT count(*) n FROM clan_mission_outbox').get().n,0);
 queueClanMissionEvents(ctx,state,[reward],week+1000);await assert.rejects(flushClanMissionOutbox(ctx,{batch:async()=>{throw Error('offline')},prepare:f.db.prepare}));assert.equal(sql.prepare('SELECT count(*) n FROM clan_mission_outbox').get().n,1);
 await flushClanMissionOutbox(ctx,f.db);queueClanMissionEvents(ctx,state,[reward],week+1000);await flushClanMissionOutbox(ctx,f.db);assert.equal((await clanMissions(f.db,'normal',actor,week+2000)).missions[0].progress,1);
 }finally{f.sql.close();sql.close()}
});

test('war wins add 100 once, combine with missions and use the finish week; absence, draws and losers earn nothing',async()=>{
 const f=fixture();try{
 const event={id:'event',realm:'normal'},match={code:'ABCDEF',a:'one',b:'two',status:'finished',winnerTeam:'a',reason:'destroyed',score:{a:2,b:1},finishedAt:week+10000};
 await awardClanWarPoints(f.db,event,match);await awardClanWarPoints(f.db,event,match);
 let ranking=await clanRanking(f.db,'normal',week+11000);assert.equal(ranking.ranking[0].points,100);assert.equal(ranking.ranking[0].warWins,1);assert.equal(ranking.ranking.find(c=>c.id==='two').points,0);
 for(const [i,reason]of ['absence','both_absent','war_time_limit','abandoned'].entries())await awardClanWarPoints(f.db,event,{...match,code:'bad'+i,reason});
 await awardClanWarPoints(f.db,event,{...match,code:'draw',winnerTeam:null});await awardClanWarPoints(f.db,event,{...match,code:'not-played',reason:'disconnect',score:{a:0,b:0}});
 assert.equal((await clanRanking(f.db,'normal',week+11000)).ranking[0].points,100);
 for(let i=0;i<100;i+=50)await recordClanMissionEvents(f.db,Array.from({length:50},(_,j)=>f.event('kill'+(i+j))));
 assert.equal((await clanRanking(f.db,'normal',week+11000)).ranking[0].points,200);
 assert.equal((await clanRanking(f.db,'test',week+11000)).ranking[0].points,0);assert.equal((await clanRanking(f.db,'normal',week+WEEK_MS)).ranking[0].points,0);
 await awardClanWarPoints(f.db,{...event,id:'next'}, {...match,finishedAt:week+WEEK_MS+1});assert.equal((await clanRanking(f.db,'normal',week+WEEK_MS+2)).ranking[0].points,100);
 }finally{f.sql.close()}
});
