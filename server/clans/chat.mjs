import {censorChat} from '../pvp/chat-language.mjs';
const fail=(code,status=403)=>{throw Object.assign(new Error(code),{code,status})};
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id);
export async function clanChat(db,realm,actor,raw,now=Date.now()){
 if(!validId(raw?.clanId))fail('invalid_clan',400);
 const clan=raw.clanId,action=raw.action;
 if(!['history','send','delete'].includes(action))fail('invalid_chat_action',400);
 const session=typeof db.withSession==='function'?db.withSession('first-primary'):db;
 const statement=(query,...args)=>session.prepare(query).bind(...args);
 if(action==='history'){
  const [membership,history]=await session.batch([
   statement('SELECT role FROM clan_members WHERE realm=? AND clan_id=? AND account_id=?',realm,clan,actor),
   statement(`SELECT c.id,c.author,c.text,c.created_at FROM clan_chat_messages c
    JOIN clan_members m ON m.realm=c.realm AND m.clan_id=c.clan_id AND m.account_id=?
    WHERE c.realm=? AND c.clan_id=? AND c.created_at>? ORDER BY c.created_at DESC,c.id DESC LIMIT 50`,actor,realm,clan,now-86400000)
  ]);
  if(!membership.results.length)fail('clan_chat_forbidden');
  return {clanId:clan,role:membership.results[0].role,messages:history.results.reverse().map(m=>({id:m.id,author:m.author,name:'Piloto #'+m.author.replaceAll('-','').slice(-6),text:censorChat(m.text),time:m.created_at}))};
 }
 if(typeof raw.id!=='string'||!/^[a-f0-9-]{36}$/i.test(raw.id))fail('invalid_message',400);
 if(action==='delete'){
  const result=await statement(`UPDATE clan_chat_messages SET text='[Mensaje eliminado]' WHERE realm=? AND clan_id=? AND id=?
   AND EXISTS(SELECT 1 FROM clan_members m WHERE m.realm=? AND m.clan_id=? AND m.account_id=? AND (m.role IN ('leader','officer') OR m.account_id=clan_chat_messages.author))
   RETURNING id`,realm,clan,raw.id,realm,clan,actor).all();
  if(!result.results.length)fail('clan_chat_forbidden');return {deleted:true};
 }
 if(raw.rulesVersion!==1)fail('chat_rules_required',400);
 if(typeof raw.text!=='string'||raw.text.length>240)fail('invalid_chat_text',400);
 const text=raw.text.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu,' ').trim();
 if(!text||text.length>240||/(?:https?:\/\/|www\.)/i.test(text))fail('invalid_chat_text',400);
 // Membership, duplicate identity and cooldown are evaluated by one atomic SQL statement.
 const inserted=await statement(`INSERT INTO clan_chat_messages(realm,clan_id,id,author,text,created_at)
  SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM clan_members WHERE realm=? AND clan_id=? AND account_id=?)
  AND NOT EXISTS(SELECT 1 FROM clan_chat_messages WHERE realm=? AND author=? AND created_at>?)
  ON CONFLICT(realm,clan_id,id) DO NOTHING RETURNING id`,realm,clan,raw.id,actor,censorChat(text),now,realm,clan,actor,realm,actor,now-2000).all();
 if(!inserted.results.length){
  const [membership,receipt]=await session.batch([
   statement('SELECT 1 FROM clan_members WHERE realm=? AND clan_id=? AND account_id=?',realm,clan,actor),
   statement('SELECT author,text FROM clan_chat_messages WHERE realm=? AND clan_id=? AND id=?',realm,clan,raw.id)
  ]);
  if(!membership.results.length)fail('clan_chat_forbidden');
  if(receipt.results[0]?.author!==actor)fail('chat_cooldown',429);
  if(receipt.results[0].text!==censorChat(text)&&receipt.results[0].text!=='[Mensaje eliminado]')fail('message_conflict',409);
 }
 await statement(`DELETE FROM clan_chat_messages WHERE realm=? AND clan_id=? AND id NOT IN
  (SELECT id FROM clan_chat_messages WHERE realm=? AND clan_id=? ORDER BY created_at DESC,id DESC LIMIT 200)`,realm,clan,realm,clan).run();
 return {sent:true,id:raw.id};
}
