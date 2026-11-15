import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {levelRanking} from '../server/hall-of-fame/levels.mjs';import {hallOfFameRoute} from '../server/hall-of-fame/route.mjs';
function fixture(){const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE players(id TEXT PRIMARY KEY,display_name TEXT);CREATE TABLE player_saves(player_id TEXT PRIMARY KEY,payload TEXT)');return {sql,db:{prepare(query){return {bind(...args){return {async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)||null}}}}}}}}
test('level leaderboard orders level then XP, returns own position beyond top100, and never exposes cloud payloads or IDs',async()=>{
 const {sql,db}=fixture();try{for(let i=0;i<105;i++){const id='account-'+String(i).padStart(3,'0');sql.prepare('INSERT INTO players VALUES(?,?)').run(id,i===0?'<img onerror=x>':'Pilot '+i);sql.prepare('INSERT INTO player_saves VALUES(?,?)').run(id,JSON.stringify({level:200-i,xp:10,privateSecret:'never disclose'}))}
 sql.prepare('INSERT INTO players VALUES(?,?)').run('tie','Tie');sql.prepare('INSERT INTO player_saves VALUES(?,?)').run('tie',JSON.stringify({level:200,xp:100}));
 for(const [id,payload]of [['bad','not json'],['string','{"level":"999"}'],['high','{"level":999999}'],['fraction','{"level":4.5}']]){sql.prepare('INSERT INTO players VALUES(?,?)').run(id,id);sql.prepare('INSERT INTO player_saves VALUES(?,?)').run(id,payload)}
 const data=await levelRanking(db,'account-104');assert.equal(data.ranking.length,100);assert.equal(data.ranking[0].name,'Tie');assert.equal(data.ranking[1].name,'<img onerror=x>');assert.equal(data.mine.position,106);assert.equal(data.mine.own,true);assert.equal(JSON.stringify(data).includes('privateSecret'),false);assert.equal(JSON.stringify(data).includes('account-'),false);
 const testData=await levelRanking({prepare(){throw Error('must not read normal saves')}},'account-104','test');assert.equal(testData.available,false);assert.deepEqual(testData.ranking,[]);
 }finally{sql.close()}
});
test('Hall routes require verified Google identity, validate tabs and isolate rank standings by realm',async()=>{
 const actor='12345678-1234-1234-1234-123456789abc',calls=[];
 const env={CLANS_DB:{},API_LIMIT:{limit:async()=>({success:true})},TEST_GUEST_ACCESS:'true',PLAY_IDENTITY:{fetch:async()=>Response.json({authenticated:true,playerId:actor})},LOBBIES:{getByName(name){calls.push(name);return {hallRanking:async id=>{assert.equal(id,actor);return {ranking:[{name:'Pilot',points:50,position:1}],mine:{points:50,position:1},limit:100}}}}}};
 const req=(query='',auth='Bearer valid-session-token',method='GET')=>new Request('https://test/hall-of-fame'+query,{method,headers:auth?{Authorization:auth}:{}});
 assert.equal((await hallOfFameRoute(req('?tab=ranks',''),env)).status,401);assert.equal((await hallOfFameRoute(req('?tab=unknown'),env)).status,400);assert.equal((await hallOfFameRoute(req('?realm=other'),env)).status,400);assert.equal((await hallOfFameRoute(req('','Bearer token-valid-123','POST'),env)).status,405);
 assert.equal((await hallOfFameRoute(req('?tab=ranks&realm=test'),{...env,TEST_SERVER_ENABLED:'false'})).status,403);
 const result=await hallOfFameRoute(req('?tab=ranks&realm=test&accountId=forged'),env);assert.equal(result.status,200);assert.equal(result.body.ranking[0].points,50);assert.deepEqual(calls,['ranked-directory-test']);
 assert.equal((await hallOfFameRoute(req('?tab=levels&realm=test','Bearer test-guest-'+'a'.repeat(64)),env)).status,403);
});
