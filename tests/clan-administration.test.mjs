import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {clanAdmin} from '../server/clans/admin.mjs';import {clanMembership} from '../server/clans/membership.mjs';
const pilot=n=>n.toString(16).padStart(8,'0')+'-1111-1111-1111-111111111111';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;');for(const file of ['0001-clans.sql','0004-clan-administration.sql'])sql.exec(readFileSync(new URL('../server/clans/migrations/'+file,import.meta.url),'utf8'));
 const statement=(query,args)=>({async first(){return sql.prepare(query).get(...args)||null},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}}),db={prepare:query=>({bind:(...args)=>statement(query,args)})};
 sql.prepare("INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES('normal','one','Clan Uno','clan uno','UNO',1)").run();for(const [n,role]of [[1,'leader'],[2,'officer'],[3,'member'],[4,'member']])sql.prepare("INSERT INTO clan_members VALUES('normal',?,'one',?,1)").run(pilot(n),role);
 const act=(n,action,target,op=crypto.randomUUID())=>clanAdmin(db,'normal',pilot(n),{clanId:'one',action,targetId:target?pilot(target):undefined,operationId:op});
 return {sql,db,act,role:n=>sql.prepare("SELECT role FROM clan_members WHERE realm='normal' AND account_id=?").get(pilot(n))?.role};
}
test('only the leader promotes/demotes and officers can only expel ordinary members',async()=>{
 const f=setup();try{await assert.rejects(f.act(3,'promote',4),e=>e.status===403);await assert.rejects(f.act(2,'promote',3),e=>e.status===403);
 await f.act(1,'promote',3);assert.equal(f.role(3),'officer');await assert.rejects(f.act(2,'kick',3),e=>e.status===403);await f.act(1,'demote',3);assert.equal(f.role(3),'member');await f.act(2,'kick',3);assert.equal(f.role(3),undefined);
 await assert.rejects(f.act(1,'kick',1));await assert.rejects(f.act(2,'kick',1));await f.act(1,'kick',2);assert.equal(f.role(2),undefined);
 }finally{f.sql.close()}
});
test('leadership transfer is atomic, persists a replayable receipt and allows the former leader to leave',async()=>{
 const f=setup(),op=crypto.randomUUID();try{await f.act(1,'transfer',3,op);assert.equal(f.role(1),'officer');assert.equal(f.role(3),'leader');assert.equal(f.sql.prepare("SELECT count(*) AS n FROM clan_members WHERE role='leader'").get().n,1);
 await f.act(1,'transfer',3,op);await assert.rejects(f.act(1,'transfer',4),e=>e.status===403);await assert.rejects(f.act(2,'transfer',3,op),e=>e.code==='operation_conflict');
 await clanMembership(f.db,'normal',pilot(1),{action:'leave',clanId:'one'});assert.equal(f.role(1),undefined);
 }finally{f.sql.close()}
});
test('failed transfers roll back both roles and two simultaneous transfers cannot create two leaders',async()=>{
 const f=setup();try{f.sql.exec("CREATE TRIGGER fail_transfer BEFORE UPDATE OF role ON clan_members WHEN NEW.role='leader' BEGIN SELECT RAISE(ABORT,'test_failure'); END;");await assert.rejects(f.act(1,'transfer',3));assert.equal(f.role(1),'leader');assert.equal(f.role(3),'member');assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_admin_actions').get().n,0);f.sql.exec('DROP TRIGGER fail_transfer');
 const outcomes=await Promise.allSettled([f.act(1,'transfer',3),f.act(1,'transfer',4)]);assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);assert.equal(f.sql.prepare("SELECT count(*) AS n FROM clan_members WHERE role='leader'").get().n,1);
 }finally{f.sql.close()}
});
test('dissolution is leader-only, removes related records, preserves payment receipts and safely replays',async()=>{
 const f=setup(),op=crypto.randomUUID();try{f.sql.prepare("INSERT INTO clan_requests VALUES('normal','one','applicant',1)").run();f.sql.prepare("INSERT INTO clan_invitations VALUES('normal','one','invited',?,1,9999999999999)").run(pilot(1));f.sql.prepare("INSERT INTO clan_creation_receipts VALUES('normal','payment',?,'one',200000,1)").run(pilot(1));
 await assert.rejects(f.act(2,'disband'),e=>e.status===403);await f.act(1,'disband',undefined,op);await f.act(1,'disband',undefined,op);
 for(const table of ['clans','clan_members','clan_requests','clan_invitations'])assert.equal(f.sql.prepare('SELECT count(*) AS n FROM '+table).get().n,0);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_creation_receipts').get().n,1);
 }finally{f.sql.close()}
});
