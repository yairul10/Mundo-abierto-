import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createClan,editClan} from '../server/clans/write.mjs';
const op='11111111-1111-1111-1111-111111111111',fields={name:'Clan Cosmos',tag:'COS',description:'Hola',admission:'request',revision:1,operationId:op};
function setup(gold=500000){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE player_saves(player_id TEXT PRIMARY KEY,payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT);');
 for(const name of ['0001-clans.sql','0002-clan-payments.sql'])sql.exec(readFileSync(new URL('../server/clans/migrations/'+name,import.meta.url),'utf8'));
 sql.prepare('INSERT INTO player_saves VALUES(?,?,1,CURRENT_TIMESTAMP)').run('pilot',JSON.stringify({gold,level:1}));
 const prepare=query=>({bind(...args){return {query,args,async first(){return sql.prepare(query).get(...args)||null},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}}}});
 const db={prepare,async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(s=>({results:sql.prepare(s.query).all(...s.args)}));sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
 return {db,sql,save:()=>{const row=sql.prepare("SELECT * FROM player_saves WHERE player_id='pilot'").get();return {...row,progress:JSON.parse(row.payload)}},count:()=>sql.prepare('SELECT count(*) AS n FROM clans').get().n};
}
test('creating a clan atomically charges 200k, assigns its leader and replays the same receipt without charging twice',async()=>{
 const f=setup();try{const [a,b]=await Promise.all([createClan(f.db,'normal','pilot',fields),createClan(f.db,'normal','pilot',fields)]);assert.equal(a.clanId,b.clanId);assert.equal(f.count(),1);assert.equal(f.save().progress.gold,300000);assert.equal(f.save().revision,2);assert.equal(f.save().progress.clanPurchases[op],1);assert.equal(f.sql.prepare('SELECT role FROM clan_members').get().role,'leader');assert.equal((await createClan(f.db,'normal','pilot',fields)).clanId,a.clanId);assert.equal(f.save().progress.gold,300000);
 await assert.rejects(createClan(f.db,'normal','other',fields),e=>e.code==='operation_conflict');
 }finally{f.sql.close()}
});
test('insufficient balance, stale cloud revision and invalid inputs roll back every record without a debit',async()=>{
 for(const [gold,input,code]of [[100,fields,'clan_insufficient_credits'],[500000,{...fields,revision:0},'clan_revision_conflict'],[500000,{...fields,name:'<script>'},'invalid_clan_name'],[500000,{...fields,tag:'TOOLONG'},'invalid_clan_tag']]){const f=setup(gold);try{await assert.rejects(createClan(f.db,'normal','pilot',input),e=>e.code===code);assert.equal(f.count(),0);assert.equal(f.save().progress.gold,gold);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM clan_members').get().n,0);}finally{f.sql.close()}}
});
test('only the leader edits settings; name collisions and duplicate membership cannot trigger additional charges',async()=>{
 const f=setup(1000000);try{const first=await createClan(f.db,'normal','pilot',fields);
 await assert.rejects(createClan(f.db,'normal','pilot',{...fields,name:'Another',tag:'NEW',operationId:crypto.randomUUID(),revision:2}),e=>e.code==='already_in_clan');assert.equal(f.save().progress.gold,800000);
 await assert.rejects(createClan(f.db,'normal','other',{...fields,tag:'DUP',operationId:crypto.randomUUID()}),e=>e.code==='clan_name_taken');
 await assert.rejects(editClan(f.db,'normal','other',{id:first.clanId,revision:1,description:'Hijack',admission:'open'}));
 await editClan(f.db,'normal','pilot',{id:first.clanId,revision:1,description:'Nuevo texto',admission:'invite'});assert.equal(f.sql.prepare('SELECT description FROM clans').get().description,'Nuevo texto');assert.equal(f.save().progress.gold,800000);
 await assert.rejects(createClan(f.db,'test','pilot',fields),e=>e.code==='clan_creation_normal_only');
 }finally{f.sql.close()}
});
