import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleChat,initChat} from './chat.mjs';
function fixture(db=new DatabaseSync(':memory:')){
 const sockets=[];const ctx={getWebSockets:()=>sockets,storage:{sql:{exec(q,...args){const result=db.prepare(q).all(...args);return {toArray:()=>result}}},transactionSync(fn){db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}};
 function socket(id){let a={id};const out=[];const ws={out,send:v=>out.push(JSON.parse(v)),deserializeAttachment:()=>a,serializeAttachment:v=>a=v};sockets.push(ws);return ws}
 initChat(ctx);return {db,ctx,socket};
}
test('chat validates messages, persists reports/blocks, authorizes moderation and replays deletions safely',async()=>{
 const {db,ctx,socket}=fixture(),alice=socket('alice'),bob=socket('bob'),admin=socket('admin'),env={CHAT_ADMIN_KEY:'test-secret-only',CHAT_ADMIN_IDS:'admin'};
 const call=(ws,m)=>handleChat(ctx,env,ws,{id:ws.deserializeAttachment().id,name:'<b>Piloto</b>'},m);
 try{
  await call(alice,{type:'chatSend',text:'Hola'});assert.equal(alice.out.at(-1).type,'chatError');
  await call(alice,{type:'chatSend',text:'Hola equipo',rulesVersion:1});const msg=bob.out.at(-1).message;assert(msg.id);assert.equal(msg.author,'alice');
  await call(alice,{type:'chatSend',text:'Spam',rulesVersion:1});assert.equal(alice.out.at(-1).type,'chatError');
  await call(bob,{type:'chatBlock',target:'alice'});await call(bob,{type:'chatHistory'});assert.deepEqual(bob.out.at(-1).messages,[]);assert.deepEqual(bob.out.at(-1).blocks,['alice']);
  await call(bob,{type:'chatReport',id:msg.id,reason:'Acoso'});assert.equal(bob.out.at(-1).type,'chatNotice');
  await call(bob,{type:'chatAdminAuth',key:env.CHAT_ADMIN_KEY});assert.equal(bob.out.at(-1).type,'chatError');
  await call(bob,{type:'chatAdminList'});assert.equal(bob.out.at(-1).type,'chatError');
  await call(admin,{type:'chatAdminAuth',key:env.CHAT_ADMIN_KEY});assert.equal(admin.out.at(-1).type,'chatAdminReady');
  await call(admin,{type:'chatAdminList'});const report=admin.out.at(-1).reports[0];assert.equal(report.text,'Hola equipo');
  await call(admin,{type:'chatModerate',reportId:report.id,action:'banChat'});alice.deserializeAttachment().chatSentAt=0;
  await call(alice,{type:'chatSend',text:'Intento después del ban',rulesVersion:1});assert.match(alice.out.at(-1).error,/silenciada/);
  await call(admin,{type:'chatModerate',reportId:report.id,action:'delete'});assert.equal(alice.out.findLast(x=>x.type==='chatDeleted').id,msg.id);
  const restored=fixture(db),returning=restored.socket('alice');await handleChat(restored.ctx,env,returning,{id:'alice',name:'Nuevo nombre'},{type:'chatSend',text:'Reconexión',rulesVersion:1});assert.match(returning.out.at(-1).error,/silenciada/);
  await handleChat(restored.ctx,env,returning,{id:'alice'},{type:'chatHistory'});assert.deepEqual(returning.out.at(-1).messages,[]);
  await call(admin,{type:'chatModerate',reportId:report.id,action:'unmute'});await call(alice,{type:'chatSend',text:'Permitido otra vez',rulesVersion:1});assert.equal(alice.out.at(-1).type,'chatMessage');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat_audit').get().n,3);
 }finally{db.close()}
});
test('no admin secret means no moderation access; links and oversized messages rejected',async()=>{
 const {db,ctx,socket}=fixture(),ws=socket('pilot'),p={id:'pilot',name:'Piloto'};
 try{
  for(const m of [{type:'chatAdminAuth',key:'anything'},{type:'chatSend',text:'https://spam.test',rulesVersion:1},{type:'chatSend',text:'a'.repeat(241),rulesVersion:1}]){await handleChat(ctx,{},ws,p,m);assert.equal(ws.out.at(-1).type,'chatError')}
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n,0);
 }finally{db.close()}
});
test('public text is censored while reports retain original evidence; translation caches filtered text',async()=>{
 const {db,ctx,socket}=fixture(),a=socket('alice'),b=socket('bob'),admin=socket('admin');let calls=0;
 const env={CHAT_ADMIN_IDS:'admin',CHAT_ADMIN_KEY:'fixture',CHAT_TRANSLATION_ENABLED:'true',AI:{run:async(model,input)=>{calls++;assert.equal(model,'@cf/meta/m2m100-1.2b');assert.equal(input.text,'Hola ***');assert.equal(input.source_lang,'es');assert.equal(input.target_lang,'en');return {translated_text:'Hello shit'}}}};
 const call=(ws,m)=>handleChat(ctx,env,ws,{id:ws.deserializeAttachment().id,name:'Piloto'},m);
 try{
  await call(a,{type:'chatSend',text:'Hola mierda',language:'es',rulesVersion:1});const message=b.out.at(-1).message;assert.equal(message.text,'Hola ***');assert.equal(message.language,'es');
  await call(b,{type:'chatTranslate',id:message.id,language:'en'});assert.equal(b.out.at(-1).text,'Hello ***');assert.equal(calls,1);
  b.deserializeAttachment().chatTranslationAt=0;await call(b,{type:'chatTranslate',id:message.id,language:'en'});assert.equal(calls,1);
  await call(b,{type:'chatHistory'});assert.equal(b.out.at(-1).messages[0].text,'Hola ***');
  await call(b,{type:'chatReport',id:message.id,reason:'Insultos'});await call(admin,{type:'chatAdminAuth',key:'fixture'});await call(admin,{type:'chatAdminList'});assert.equal(admin.out.at(-1).reports[0].text,'Hola mierda');
  await call(b,{type:'chatBlock',target:'alice'});b.deserializeAttachment().chatTranslationAt=0;const before=b.out.length;await call(b,{type:'chatTranslate',id:message.id,language:'en'});assert.equal(b.out.length,before);assert.equal(calls,1);
 }finally{db.close()}
});
test('translation survives provider failure and refuses deleted messages after async translation',async()=>{
 const {db,ctx,socket}=fixture(),a=socket('a'),b=socket('b');let resolve;
 const env={CHAT_ADMIN_IDS:'admin',CHAT_ADMIN_KEY:'fixture',CHAT_TRANSLATION_ENABLED:'true',AI:{run:()=>new Promise(r=>resolve=r)}};
 const call=(ws,m)=>handleChat(ctx,env,ws,{id:ws.deserializeAttachment().id,name:'Piloto'},m);
 try{
  await call(a,{type:'chatSend',text:'Hola',language:'es',rulesVersion:1});const id=b.out.at(-1).message.id;
  const pending=call(b,{type:'chatTranslate',id,language:'en'});db.prepare('UPDATE chat_messages SET deleted=1 WHERE id=?').run(id);resolve({translated_text:'Hello'});await pending;assert.equal(b.out.at(-1).type,'chatTranslationUnavailable');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat_translations').get().n,0);
  db.prepare('UPDATE chat_messages SET deleted=0 WHERE id=?').run(id);b.deserializeAttachment().chatTranslationAt=0;env.AI.run=async()=>{throw Error('provider unavailable')};await call(b,{type:'chatTranslate',id,language:'en'});assert.equal(b.out.at(-1).type,'chatTranslationUnavailable');
  b.deserializeAttachment().chatTranslationAt=0;env.CHAT_TRANSLATION_ENABLED='false';await call(b,{type:'chatTranslate',id,language:'en'});assert.equal(b.out.at(-1).type,'chatTranslationUnavailable');
  env.CHAT_TRANSLATION_ENABLED='true';db.prepare('UPDATE chat_translation_budget SET used=1000').run();b.deserializeAttachment().chatTranslationAt=0;env.AI.run=()=>{throw Error('must not call provider')};await call(b,{type:'chatTranslate',id,language:'en'});assert.equal(b.out.at(-1).type,'chatTranslationUnavailable');
 }finally{db.close()}
});
