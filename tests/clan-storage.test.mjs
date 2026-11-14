import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {clanAccountState,clanPermissions,CLAN_RULES,searchClans,publicClan} from '../server/clans/store.mjs';
import {clanRoute} from '../server/clans/route.mjs';
const schema=readFileSync(new URL('../server/clans/migrations/0001-clans.sql',import.meta.url),'utf8');
function database(path=':memory:'){
 const sql=new DatabaseSync(path);sql.exec('PRAGMA foreign_keys=ON');sql.exec(schema);
 const db={prepare(query){return {bind(...args){return {query,args,async all(){return {results:sql.prepare(query).all(...args)}}}}}},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>({results:sql.prepare(s.query).all(...s.args)}));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const clan=(id,realm='normal')=>sql.prepare('INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES(?,?,?,?,?,?)').run(realm,id,'Clan '+id,('clan '+id).toLowerCase(),id.toUpperCase(),1);
 const member=(id,clanId,role='member',realm='normal')=>sql.prepare('INSERT INTO clan_members VALUES(?,?,?,?,?)').run(realm,id,clanId,role,1);
 return {sql,db,clan,member};
}
test('clans persist across reopening, migration is repeatable and test membership is isolated',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cosmos-clans-'));let f;
 try{const path=join(dir,'clans.sqlite');f=database(path);f.clan('COS');f.clan('COS','test');f.member('pilot','COS','leader');f.member('pilot','COS','member','test');f.sql.close();f=database(path);
 assert.equal((await clanAccountState(f.db,'normal','pilot')).clan.role,'leader');assert.equal((await clanAccountState(f.db,'test','pilot')).clan.role,'member');
 assert.equal((await clanAccountState(f.db,'normal','stranger')).clan,null);
 }finally{f?.sql.close();rmSync(dir,{recursive:true,force:true})}
});
test('database enforces capacity, one clan per account, roles, tag uniqueness and references',()=>{
 const f=database();try{f.clan('COS');f.clan('DOS');f.member('leader','COS','leader');assert.throws(()=>f.member('otherLeader','COS','leader'));assert.throws(()=>f.member('leader','DOS'));
 assert.throws(()=>f.member('bad','COS','admin'));assert.throws(()=>f.member('missing','XXX'));for(let i=0;i<19;i++)f.member('p'+i,'COS');assert.throws(()=>f.member('extra','COS'),/clan_full/);
 f.member('moving','DOS');assert.throws(()=>f.sql.prepare("UPDATE clan_members SET clan_id='COS' WHERE account_id='moving'").run(),/clan_full/);
 assert.throws(()=>f.sql.prepare("INSERT INTO clans VALUES('normal','dupe','Other','other','COS','','request',1,1)").run());
 }finally{f.sql.close()}
});
test('requests are visible to their account and clan officers; expired invitations stay private',async()=>{
 const f=database();try{f.clan('COS');f.member('lead','COS','leader');f.member('officer','COS','officer');f.member('member','COS');
 f.sql.prepare('INSERT INTO clan_requests VALUES(?,?,?,?)').run('normal','COS','applicant',1);
 f.sql.prepare('INSERT INTO clan_invitations VALUES(?,?,?,?,?,?)').run('normal','COS','invited','lead',1,100);
 assert.equal((await clanAccountState(f.db,'normal','member',10)).pendingRequests.length,0);
 assert.equal((await clanAccountState(f.db,'normal','officer',10)).pendingRequests.length,1);
 assert.equal((await clanAccountState(f.db,'normal','applicant',10)).requests.length,1);
 assert.equal((await clanAccountState(f.db,'normal','invited',10)).invitations.length,1);
 assert.equal((await clanAccountState(f.db,'normal','invited',101)).invitations.length,0);
 assert.equal((await clanAccountState(f.db,'normal','stranger',10)).invitations.length,0);
 assert.equal(clanPermissions('officer').manageRoles,false);assert.equal(clanPermissions('member').manageAdmissions,false);assert.equal(CLAN_RULES.creationCost,200000);
 f.sql.prepare("DELETE FROM clans WHERE id='COS'").run();assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_members').get().n,0);
 }finally{f.sql.close()}
});
test('clan reads require Google identity, ignore forged account/role and reject mutation routes',async()=>{
 const f=database();try{f.clan('COS');f.member('verified','COS','leader');const id='12345678-1234-1234-1234-123456789abc';
 f.sql.prepare('UPDATE clan_members SET account_id=?').run(id);
 const env={CLANS_DB:f.db,PLAY_IDENTITY:{fetch:async()=>Response.json({authenticated:true,playerId:id})}};
 const req=(url='/clans/me',method='GET',auth='Bearer valid-session-123')=>new Request('https://test'+url,{method,headers:auth?{Authorization:auth}:{}});
 assert.equal((await clanRoute(req('/clans/me','GET',''),env)).status,401);
 const result=await clanRoute(req('/clans/me?accountId=forged&role=member'),env);assert.equal(result.body.clan.role,'leader');
 assert.equal((await clanRoute(req('/clans/me?realm=other'),env)).status,400);
 assert.equal((await clanRoute(req('/clans/me','POST'),env)).status,405);
 assert.equal((await clanRoute(req('/clans/create','POST'),env)).status,400);
 const guest={...env,TEST_GUEST_ACCESS:'true',TEST_SERVER_ENABLED:'true'};assert.equal((await clanRoute(req('/clans/me?realm=test','GET','Bearer test-guest-'+'a'.repeat(64)),guest)).status,403);
 }finally{f.sql.close()}
});

test('clan directory searches names and tags literally, isolates realms and hides private requests',async()=>{
 const f=database();try{f.clan('COS');f.clan('TEST','test');f.member('lead123456','COS','leader');
 assert.equal((await searchClans(f.db,'normal','cos')).clans[0].memberCount,1);
 assert.equal((await searchClans(f.db,'normal','clan cos')).clans[0].tag,'COS');
 assert.equal((await searchClans(f.db,'normal',"%' OR 1=1 --")).clans.length,0);
 assert.equal((await searchClans(f.db,'normal','test')).clans.length,0);
 const detail=await publicClan(f.db,'normal','COS');assert.equal(detail.members[0].role,'leader');assert.equal(detail.members[0].pilot,'Piloto #123456');assert.equal(detail.members[0].account_id,undefined);
 assert.equal(await publicClan(f.db,'test','COS'),null);
 const id='12345678-1234-1234-1234-123456789abc',env={CLANS_DB:f.db,PLAY_IDENTITY:{fetch:async()=>Response.json({authenticated:true,playerId:id})}};
 const req=url=>new Request('https://test'+url,{headers:{Authorization:'Bearer valid-session-123'}});
 assert.equal((await clanRoute(req('/clans/search?q=COS'),env)).body.clans.length,1);
 assert.equal((await clanRoute(req('/clans/detail?id=missing'),env)).status,404);
 assert.equal((await clanRoute(req('/clans/search?q='+'x'.repeat(41)),env)).status,400);
 assert.equal((await clanRoute(req('/clans/detail?id=../COS'),env)).status,400);
 }finally{f.sql.close()}
});
