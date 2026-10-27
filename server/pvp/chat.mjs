export const CHAT_RULES_VERSION=1;
const initialized=new WeakSet();
const rows=(ctx,q,...args)=>ctx.storage.sql.exec(q,...args).toArray();
export function initChat(ctx){
 if(initialized.has(ctx))return;
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,author TEXT NOT NULL,name TEXT NOT NULL,text TEXT NOT NULL,time INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0)');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chat_reports(id TEXT PRIMARY KEY,reporter TEXT NOT NULL,message_id TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT \'open\',UNIQUE(reporter,message_id))');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chat_blocks(owner TEXT NOT NULL,target TEXT NOT NULL,PRIMARY KEY(owner,target))');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chat_sanctions(target TEXT PRIMARY KEY,until INTEGER NOT NULL,reason TEXT NOT NULL)');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chat_audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,time INTEGER NOT NULL)');
 ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS chat_message_time ON chat_messages(time)');
 initialized.add(ctx);
}
const reply=(ws,data)=>ws.send(JSON.stringify(data));
function broadcast(ctx,data,author){for(const peer of ctx.getWebSockets()){const id=peer.deserializeAttachment()?.id;if(!id)continue;if(author&&rows(ctx,'SELECT 1 FROM chat_blocks WHERE owner=? AND target=?',id,author).length)continue;try{reply(peer,data)}catch{}}}
export async function handleChat(ctx,env,ws,p,m){
 if(typeof m.type!=='string'||!m.type.startsWith('chat'))return false;
 initChat(ctx);const now=Date.now(),a=ws.deserializeAttachment();
 const adminAllowed=String(env.CHAT_ADMIN_IDS||'').split(',').map(id=>id.trim()).includes(p.id);
 const error=error=>{reply(ws,{type:'chatError',error});return true};
 if(m.type==='chatAdminAuth'){
  if(now-(a.chatAuthAt||0)<5000)return error('Espera antes de volver a intentar.');a.chatAuthAt=now;ws.serializeAttachment(a);
  if(!adminAllowed)return error('Esta cuenta no tiene permisos de administrador.');
  if(!env.CHAT_ADMIN_KEY||typeof m.key!=='string'||m.key.length>256)return error('Administración no disponible.');
  const digest=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
  const x=await digest(m.key),y=await digest(env.CHAT_ADMIN_KEY);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  if(diff)return error('Clave incorrecta.');a.chatAdmin=true;ws.serializeAttachment(a);reply(ws,{type:'chatAdminReady'});return true;
 }
 if(m.type==='chatAdminList'||m.type==='chatModerate'){
  if(!a.chatAdmin||!adminAllowed||!env.CHAT_ADMIN_KEY)return error('Sin permisos.');
  if(m.type==='chatModerate'){
   const r=rows(ctx,'SELECT r.*,m.author,m.name,m.text FROM chat_reports r JOIN chat_messages m ON m.id=r.message_id WHERE r.id=?',String(m.reportId||''))[0];
   if(!r)return error('Reporte no encontrado.');
   if(!['dismiss','delete','muteHour','muteDay','banChat','unmute'].includes(m.action))return error('Acción inválida.');
   ctx.storage.transactionSync(()=>{
    if(m.action==='delete')ctx.storage.sql.exec('UPDATE chat_messages SET deleted=1 WHERE id=?',r.message_id);
    if(['muteHour','muteDay','banChat'].includes(m.action))ctx.storage.sql.exec('INSERT INTO chat_sanctions VALUES(?,?,?) ON CONFLICT(target) DO UPDATE SET until=excluded.until,reason=excluded.reason',r.author,m.action==='banChat'?Number.MAX_SAFE_INTEGER:now+(m.action==='muteHour'?3600000:86400000),r.reason);
    if(m.action==='unmute')ctx.storage.sql.exec('DELETE FROM chat_sanctions WHERE target=?',r.author);
    ctx.storage.sql.exec('UPDATE chat_reports SET status=? WHERE id=?',m.action,r.id);
    ctx.storage.sql.exec('INSERT INTO chat_audit VALUES(?,?,?,?,?)',crypto.randomUUID(),p.id,m.action,r.author,now);
   });
   if(m.action==='delete')broadcast(ctx,{type:'chatDeleted',id:r.message_id});
  }
  reply(ws,{type:'chatReports',reports:rows(ctx,'SELECT r.*,m.author,m.name,m.text,m.time FROM chat_reports r JOIN chat_messages m ON m.id=r.message_id ORDER BY m.time DESC LIMIT 100')});return true;
 }
 if(m.type==='chatHistory'){
  const messages=rows(ctx,'SELECT id,author,name,text,time FROM chat_messages WHERE deleted=0 AND time>? AND author NOT IN (SELECT target FROM chat_blocks WHERE owner=?) ORDER BY time DESC LIMIT 50',now-86400000,p.id).reverse();
  reply(ws,{type:'chatHistory',messages,blocks:rows(ctx,'SELECT target FROM chat_blocks WHERE owner=?',p.id).map(r=>r.target)});return true;
 }
 if(m.type==='chatBlock'){
  if(typeof m.target!=='string'||m.target.length>64||m.target===p.id)return error('Jugador inválido.');
  if(m.block===false)ctx.storage.sql.exec('DELETE FROM chat_blocks WHERE owner=? AND target=?',p.id,m.target);
  else{if(rows(ctx,'SELECT target FROM chat_blocks WHERE owner=?',p.id).length>=200)return error('Límite de bloqueos alcanzado.');ctx.storage.sql.exec('INSERT OR IGNORE INTO chat_blocks VALUES(?,?)',p.id,m.target)}
  reply(ws,{type:'chatBlocked',target:m.target,block:m.block!==false});return true;
 }
 if(m.type==='chatReport'){
  const reason=String(m.reason||'').trim().slice(0,200),id=String(m.id||'');
  if(!reason||!rows(ctx,'SELECT id FROM chat_messages WHERE id=?',id).length)return error('Elige un mensaje y un motivo.');
  if(rows(ctx,'SELECT id FROM chat_reports WHERE reporter=? AND message_id=?',p.id,id).length)return error('Ya reportaste este mensaje.');
  if(now-(a.chatReportAt||0)<10000)return error('Espera unos segundos entre reportes.');a.chatReportAt=now;ws.serializeAttachment(a);
  ctx.storage.sql.exec('INSERT OR IGNORE INTO chat_reports(id,reporter,message_id,reason) VALUES(?,?,?,?)',crypto.randomUUID(),p.id,id,reason);reply(ws,{type:'chatNotice',text:'Reporte guardado para revisión.'});return true;
 }
 if(m.type==='chatSend'){
  if(!env.CHAT_ADMIN_KEY||!String(env.CHAT_ADMIN_IDS||'').trim())return error('Chat pendiente de activar por el administrador.');
  if(m.rulesVersion!==CHAT_RULES_VERSION)return error('Acepta las reglas del chat.');
  const sanction=rows(ctx,'SELECT until FROM chat_sanctions WHERE target=?',p.id)[0];if(sanction?.until>now)return error('Tu cuenta está silenciada en este chat.');
  if(now-(a.chatSentAt||0)<2000)return error('Espera 2 segundos entre mensajes.');
  if(typeof m.text!=='string'||m.text.length>240)return error('Máximo 240 caracteres.');
  const text=m.text.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu,' ').trim();if(!text)return error('Escribe un mensaje.');
  if(/(?:https?:\/\/|www\.)/i.test(text))return error('No se permiten enlaces.');
  a.chatSentAt=now;ws.serializeAttachment(a);const message={id:crypto.randomUUID(),author:p.id,name:p.name,text,time:now};
  ctx.storage.sql.exec('INSERT INTO chat_messages(id,author,name,text,time) VALUES(?,?,?,?,?)',message.id,p.id,p.name,text,now);
  // Keep reported evidence, but bound unreported history to the last 500 messages.
  ctx.storage.sql.exec('DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY time DESC LIMIT 500) AND id NOT IN (SELECT message_id FROM chat_reports)');
  broadcast(ctx,{type:'chatMessage',message},p.id);return true;
 }
 return error('Acción de chat inválida.');
}
