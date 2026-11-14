const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status})};
export async function clanAdmin(db,realm,actor,raw,now=Date.now()){
 if(!['promote','demote','kick','transfer','disband'].includes(raw?.action)||!/^[-A-Za-z0-9_]{1,64}$/.test(raw?.clanId||'')||!/^[a-f0-9-]{36}$/i.test(raw?.operationId||''))fail('invalid_clan_action',400);
 const {action,clanId,operationId}=raw,targetId=action==='disband'?'':raw.targetId;
 if(action!=='disband'&&!/^[a-f0-9-]{36}$/i.test(targetId||''))fail('invalid_pilot',400);
 db=db.withSession?db.withSession('first-primary'):db;
 async function prior(){const row=await db.prepare('SELECT actor_id,clan_id,target_id,action FROM clan_admin_actions WHERE realm=? AND operation_id=?').bind(realm,operationId).first();if(!row)return null;if(row.actor_id!==actor||row.clan_id!==clanId||row.target_id!==targetId||row.action!==action)fail('operation_conflict');return {completed:true,action,clanId};}
 const existing=await prior();if(existing)return existing;
 try{await db.prepare('INSERT INTO clan_admin_actions VALUES(?,?,?,?,?,?,?)').bind(realm,operationId,clanId,actor,targetId,action,now).run()}
 catch(error){const replay=await prior();if(replay)return replay;const message=String(error.message)+' '+String(error.cause?.message||'');for(const code of ['clan_forbidden','clan_target_unavailable','clan_role_changed'])if(message.includes(code))fail(code,code==='clan_forbidden'?403:409);throw error;}
 return {completed:true,action,clanId};
}
