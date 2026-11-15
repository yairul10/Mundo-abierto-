import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {levelAudit,levelReviewFlags} from '../server/hall-of-fame/audit.mjs';import {hallOfFameRoute} from '../server/hall-of-fame/route.mjs';
const migration=readFileSync(new URL('../server/hall-of-fame/migrations/0001-level-history.sql',import.meta.url),'utf8'),id='12345678-1234-1234-1234-123456789abc';
function fixture(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE players(id TEXT PRIMARY KEY,display_name TEXT);CREATE TABLE player_saves(player_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL)');sql.prepare('INSERT INTO players VALUES(?,?)').run(id,'Pilot');return {sql,db:{prepare(query){return {bind(...args){return {async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)||null}}}}}}}}
test('audit starts with an explicit baseline, records committed level changes and skips XP-only or clan payment saves',async()=>{
 const {sql,db}=fixture();try{
 sql.prepare("INSERT INTO player_saves VALUES(?,1,?,datetime('now','-2 minutes'))").run(id,JSON.stringify({level:100,xp:10,gold:500000,privatePayload:'never stored'}));sql.exec(migration);sql.exec(migration);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM level_history').get().n,1);assert.equal(sql.prepare('SELECT source FROM level_history').get().source,'baseline');
 const update=raw=>sql.prepare('UPDATE player_saves SET payload=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE player_id=?').run(typeof raw==='string'?raw:JSON.stringify(raw),id);
 update({level:100,xp:200,gold:300000});assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM level_history').get().n,1);
 update({level:110,xp:20});const flagged=await levelAudit(db);assert.equal(flagged.rows.length,1);assert.equal(flagged.rows[0].delta,10);assert.ok(flagged.rows[0].flags.includes('large_jump'));assert.ok(flagged.rows[0].flags.includes('rapid_gain'));assert.ok(flagged.rows[0].time>Date.now()-5000);
 update({level:111,xp:5});assert.equal((await levelAudit(db)).rows.length,1);
 update({level:90,xp:5});assert.ok((await levelAudit(db)).rows[0].flags.includes('level_decreased'));
 update({level:'fake',xp:5});assert.equal((await levelAudit(db)).rows[0].newLevel,null);assert.ok((await levelAudit(db)).rows[0].flags.includes('invalid_level'));
 const before=sql.prepare('SELECT COUNT(*) AS n FROM level_history').get().n;sql.exec('BEGIN');update({level:500,xp:10});sql.exec('ROLLBACK');assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM level_history').get().n,before);
 const all=await levelAudit(db,{pilot:id,flagged:false});assert.equal(all.rows.length,5);assert.equal(JSON.stringify(all).includes('privatePayload'),false);assert.equal((await levelAudit(db,{query:'NO SUCH PILOT'})).rows.length,0);
 sql.prepare('DELETE FROM players WHERE id=?').run(id);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM level_history').get().n,0);
 }finally{sql.close()}
});
test('new accounts, malformed levels, stable cursor pages and offline sync intervals are handled without automatic sanctions',async()=>{
 const {sql,db}=fixture();try{sql.exec(migration);sql.prepare("INSERT INTO player_saves VALUES(?,1,?,datetime('now','-3 days'))").run(id,'{"level":50,"xp":0}');for(let i=0;i<110;i++)sql.prepare("UPDATE player_saves SET payload=?,revision=revision+1,updated_at=datetime('now','-3 days') WHERE player_id=?").run(JSON.stringify({level:51+i,xp:0}),id);
 const page=await levelAudit(db,{flagged:false});assert.equal(page.rows.length,100);assert.ok(page.nextCursor);const old=await levelAudit(db,{flagged:false,before:page.nextCursor});assert.equal(old.rows.length,11);assert.equal(new Set([...page.rows,...old.rows].map(r=>r.id)).size,111);assert.equal(old.rows.at(-1).source,'created');
 assert.deepEqual(levelReviewFlags({oldLevel:100,newLevel:110,elapsedMs:3*86400000}),['large_jump']);assert.deepEqual(levelReviewFlags({oldLevel:1,newLevel:6,elapsedMs:1000}),[]);
 await assert.rejects(levelAudit(db,{pilot:'invalid'}),{code:'invalid_audit_query'});await assert.rejects(levelAudit(db,{before:1.5}),{code:'invalid_audit_query'});
 sql.prepare('UPDATE player_saves SET payload=?,revision=revision+1 WHERE player_id=?').run('not-json',id);assert.ok((await levelAudit(db)).rows[0].flags.includes('invalid_level'));
 }finally{sql.close()}
});
test('administrator authorization is enforced server-side before history reads; a forged admin flag grants nothing',async()=>{
 let reads=0;const env={CLANS_DB:{prepare(){reads++;throw Error('should not read history')}},API_LIMIT:{limit:async()=>({success:true})},PLAY_IDENTITY:{fetch:async()=>Response.json({authenticated:true,playerId:id})}};
 const req=new Request('https://test/hall-of-fame?tab=audit&admin=true',{headers:{Authorization:'Bearer token-valid-session'}});
 assert.equal((await hallOfFameRoute(req,env)).status,403);assert.equal(reads,0);
 const admin=await hallOfFameRoute(new Request('https://test/hall-of-fame?tab=audit&realm=test',{headers:{Authorization:'Bearer token-valid-session'}}),{...env,CHAT_ADMIN_IDS:id});assert.equal(admin.status,400);assert.equal(reads,0);
});
