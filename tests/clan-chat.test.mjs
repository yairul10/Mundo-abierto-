import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {clanChat} from '../server/clans/chat.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of ['0001-clans.sql','0005-clan-chat.sql'])sql.exec(readFileSync(new URL('../server/clans/migrations/'+file,import.meta.url),'utf8'));
 const db={prepare(q){return {bind(...args){return {q,args,async all(){return {results:sql.prepare(q).all(...args)}},async run(){return {meta:sql.prepare(q).run(...args)}}}}}},async batch(statements){sql.exec('BEGIN');try{const out=statements.map(s=>({results:sql.prepare(s.q).all(...s.args)}));sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
 for(const [realm,id,tag]of [['normal','one','UNO'],['normal','two','DOS'],['test','one','TEST']])sql.prepare('INSERT INTO clans(realm,id,name,name_key,tag,created_at) VALUES(?,?,?,?,?,0)').run(realm,id,'Clan '+tag,tag.toLowerCase(),tag);
 for(const [realm,actor,clan,role]of [['normal','lead','one','leader'],['normal','member','one','member'],['normal','officer','one','officer'],['normal','other','two','leader'],['test','lead','one','leader']])sql.prepare('INSERT INTO clan_members VALUES(?,?,?,?,0)').run(realm,actor,clan,role);
 return {db,sql};
}
const message=(text='Hola',id=crypto.randomUUID())=>({action:'send',clanId:'one',id,text,rulesVersion:1});
const forbidden=p=>assert.rejects(p,e=>e.code==='clan_chat_forbidden');
test('private chat isolates clans and realms, rejects forged membership and revokes access immediately',async()=>{
 const f=fixture();try{await clanChat(f.db,'normal','lead',message(),10000);
 const read={action:'history',clanId:'one'};
 assert.equal((await clanChat(f.db,'normal','member',read,10001)).messages[0].text,'Hola');
 assert.equal((await clanChat(f.db,'test','lead',read,10001)).messages.length,0);
 await forbidden(clanChat(f.db,'normal','other',read));await forbidden(clanChat(f.db,'normal','outsider',message()));
 f.sql.prepare("DELETE FROM clan_members WHERE realm='normal' AND account_id='member'").run();
 await forbidden(clanChat(f.db,'normal','member',read));await forbidden(clanChat(f.db,'normal','member',message()));
 f.sql.prepare("INSERT INTO clan_members VALUES('normal','member','two','member',0)").run();await forbidden(clanChat(f.db,'normal','member',read));
 }finally{f.sql.close()}
});
test('send is idempotent, cooldown survives deletion and membership changes, moderation checks current role',async()=>{
 const f=fixture();try{const raw=message();await clanChat(f.db,'normal','member',raw,10000);await clanChat(f.db,'normal','member',raw,10001);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM clan_chat_messages').get().n,1);
 await assert.rejects(clanChat(f.db,'normal','member',message(),10001),e=>e.code==='chat_cooldown');
 await forbidden(clanChat(f.db,'normal','member',{action:'delete',clanId:'one',id:crypto.randomUUID()}));
 await clanChat(f.db,'normal','lead',message('Otro'),10002);
 const otherId=f.sql.prepare("SELECT id FROM clan_chat_messages WHERE author='lead'").get().id;
 await forbidden(clanChat(f.db,'normal','member',{action:'delete',clanId:'one',id:otherId}));
 await clanChat(f.db,'normal','officer',{action:'delete',clanId:'one',id:raw.id});
 await assert.rejects(clanChat(f.db,'normal','member',message(),10003),e=>e.code==='chat_cooldown');
 assert.equal((await clanChat(f.db,'normal','lead',{action:'history',clanId:'one'},10003)).messages[0].text,'[Mensaje eliminado]');
 f.sql.prepare("UPDATE clan_members SET role='member' WHERE account_id='officer'").run();await forbidden(clanChat(f.db,'normal','officer',{action:'delete',clanId:'one',id:otherId}));
 }finally{f.sql.close()}
});
test('chat validates content and rules, bounds history/storage and cascades on disband',async()=>{
 const f=fixture();try{
 for(const raw of [message(''),message('x'.repeat(241)),message('www.example.com'),{...message(),rulesVersion:0},{...message(),action:'forged'}])await assert.rejects(clanChat(f.db,'normal','lead',raw),e=>e.status===400);
 for(let i=0;i<205;i++)await clanChat(f.db,'normal','lead',message('Mensaje '+i),10000+i*2001);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM clan_chat_messages').get().n,200);
 const history=await clanChat(f.db,'normal','member',{action:'history',clanId:'one'},500000);assert.equal(history.messages.length,50);assert.equal(history.messages.at(-1).text,'Mensaje 204');
 assert.equal((await clanChat(f.db,'normal','lead',{action:'history',clanId:'one'},90000000)).messages.length,0);
 f.sql.prepare("DELETE FROM clans WHERE realm='normal' AND id='one'").run();assert.equal(f.sql.prepare('SELECT count(*) n FROM clan_chat_messages').get().n,0);
 }finally{f.sql.close()}
});
