import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {clanMembership} from '../server/clans/membership.mjs';
const pilot=n=>n.toString(16).padStart(8,'0')+'-1111-1111-1111-111111111111';
function setup(admission='open'){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE player_saves(player_id TEXT PRIMARY KEY);');for(const file of ['0001-clans.sql','0003-clan-membership.sql'])sql.exec(readFileSync(new URL('../server/clans/migrations/'+file,import.meta.url),'utf8'));
 const statement=(query,args)=>({query,args,async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}});
 const db={prepare:query=>({bind:(...args)=>statement(query,args)}),async batch(statements){sql.exec('BEGIN');try{const r=statements.map(s=>({results:sql.prepare(s.query).all(...s.args)}));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
 sql.prepare("INSERT INTO clans(realm,id,name,name_key,tag,admission,created_at) VALUES('normal','one','Clan Uno','clan uno','UNO',?,1)").run(admission);
 sql.prepare("INSERT INTO clan_members VALUES('normal',?,'one','leader',1)").run(pilot(1));for(let i=1;i<=30;i++)sql.prepare('INSERT INTO player_saves VALUES(?)').run(pilot(i));
 return {sql,db,act:(n,action,extra={})=>clanMembership(db,'normal',pilot(n),{action,clanId:'one',...extra}),count:()=>sql.prepare('SELECT count(*) AS n FROM clan_members').get().n};
}
test('open join is idempotent, keeps one membership and admits only one of two pilots competing for the last slot',async()=>{
 const f=setup();try{await f.act(2,'join');await f.act(2,'join');assert.equal(f.count(),2);
 for(let n=3;n<=19;n++)await f.act(n,'join');const results=await Promise.allSettled([f.act(20,'join'),f.act(21,'join')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.count(),20);
 await f.act(2,'leave');assert.equal(f.count(),19);await assert.rejects(f.act(1,'leave'),e=>e.code==='leader_cannot_leave');
 }finally{f.sql.close()}
});
test('request-only clans require approval, reject unauthorized managers and clean pending records after admission',async()=>{
 const f=setup('request');try{await assert.rejects(f.act(2,'join'));await f.act(2,'request');await f.act(2,'request');assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_requests').get().n,1);
 await assert.rejects(f.act(3,'approve',{targetId:pilot(2)}),e=>e.status===403);
 await f.act(1,'approve',{targetId:pilot(2)});assert.equal(f.count(),2);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_requests').get().n,0);
 await f.act(3,'request');await f.act(3,'cancelRequest');assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_requests').get().n,0);
 await f.act(4,'request');await f.act(1,'reject',{targetId:pilot(4)});assert.equal(f.count(),2);
 }finally{f.sql.close()}
});
test('private invitations only admit the recipient, expire after seven days and can be declined or cancelled',async()=>{
 const f=setup('invite');try{await assert.rejects(f.act(2,'request'));await f.act(1,'invite',{targetId:pilot(2)});await assert.rejects(f.act(3,'acceptInvite',{targetId:pilot(2)}));
 await f.act(2,'acceptInvite');await f.act(2,'acceptInvite');assert.equal(f.count(),2);
 await f.act(1,'invite',{targetId:pilot(3)});await f.act(3,'declineInvite');await assert.rejects(f.act(3,'acceptInvite'));
 await f.act(1,'invite',{targetId:pilot(4)});await f.act(1,'cancelInvite',{targetId:pilot(4)});await assert.rejects(f.act(4,'acceptInvite'));
 await f.act(1,'invite',{targetId:pilot(5)});f.sql.prepare('UPDATE clan_invitations SET created_at=1,expires_at=2').run();await assert.rejects(f.act(5,'acceptInvite'));
 }finally{f.sql.close()}
});
test('officers can approve but ordinary members cannot invite, and membership in a second clan is blocked',async()=>{
 const f=setup();try{await f.act(2,'join');f.sql.prepare("UPDATE clan_members SET role='officer' WHERE account_id=?").run(pilot(2));await f.act(2,'invite',{targetId:pilot(3)});await f.act(3,'acceptInvite');await assert.rejects(f.act(3,'invite',{targetId:pilot(4)}),e=>e.status===403);
 f.sql.prepare("INSERT INTO clans(realm,id,name,name_key,tag,admission,created_at) VALUES('normal','two','Clan Dos','clan dos','DOS','open',1)").run();await assert.rejects(clanMembership(f.db,'normal',pilot(3),{action:'join',clanId:'two'}),e=>e.code==='already_in_clan');assert.equal(f.count(),3);
 await assert.rejects(clanMembership(f.db,'test',pilot(4),{action:'join',clanId:'one'}));
 }finally{f.sql.close()}
});
