const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status})};
const manager="EXISTS(SELECT 1 FROM clan_members actor WHERE actor.realm=? AND actor.clan_id=? AND actor.account_id=? AND actor.role IN ('leader','officer'))";
export async function clanMembership(db,realm,actor,raw,now=Date.now()){
 const actions=['join','request','cancelRequest','approve','reject','invite','acceptInvite','declineInvite','cancelInvite','leave'];
 if(!actions.includes(raw?.action)||!/^[-A-Za-z0-9_]{1,64}$/.test(raw?.clanId||''))fail('invalid_clan_action',400);
 db=db.withSession?db.withSession('first-primary'):db;
 const {action,clanId}=raw,admin=['approve','reject','invite','cancelInvite'].includes(action),target=admin?raw.targetId:actor;
 if(typeof target!=='string'||!/^[a-f0-9-]{36}$/i.test(target))fail('invalid_pilot',400);
 if(admin){const me=await db.prepare("SELECT role FROM clan_members WHERE realm=? AND clan_id=? AND account_id=?").bind(realm,clanId,actor).first();if(!['leader','officer'].includes(me?.role))fail('clan_forbidden',403);}
 const binds=[realm,clanId,actor],member=()=>db.prepare('SELECT clan_id,role FROM clan_members WHERE realm=? AND account_id=?').bind(realm,target).first();
 try{
  if(action==='leave'){
   const result=await db.prepare("DELETE FROM clan_members WHERE realm=? AND clan_id=? AND account_id=? AND role<>'leader'").bind(realm,clanId,actor).run();
   if(!result.meta.changes&&(await member())?.role==='leader')fail('leader_cannot_leave');return {left:true};
  }
  if(['cancelRequest','reject'].includes(action)){
   await db.prepare('DELETE FROM clan_requests WHERE realm=? AND clan_id=? AND account_id=?'+(admin?' AND '+manager:'')).bind(realm,clanId,target,...(admin?binds:[])).run();return {cancelled:true};
  }
  if(['declineInvite','cancelInvite'].includes(action)){
   await db.prepare('DELETE FROM clan_invitations WHERE realm=? AND clan_id=? AND account_id=?'+(admin?' AND '+manager:'')).bind(realm,clanId,target,...(admin?binds:[])).run();return {cancelled:true};
  }
  if(action==='invite'){
   if(target===actor)fail('cannot_invite_self',400);
   await db.batch([
    db.prepare('DELETE FROM clan_invitations WHERE realm=? AND clan_id=? AND expires_at<=?').bind(realm,clanId,now),
    db.prepare("INSERT INTO clan_invitations(realm,clan_id,account_id,invited_by,created_at,expires_at) SELECT ?,?,?,?,?,? WHERE "+manager+" AND EXISTS(SELECT 1 FROM player_saves WHERE player_id=?) AND NOT EXISTS(SELECT 1 FROM clan_members WHERE realm=? AND account_id=?) AND NOT EXISTS(SELECT 1 FROM clan_invitations WHERE realm=? AND clan_id=? AND account_id=?) AND (SELECT count(*) FROM clan_members WHERE realm=? AND clan_id=?)<20").bind(realm,clanId,target,actor,now,now+7*86400000,...binds,target,realm,target,realm,clanId,target,realm,clanId)
   ]);
   const invite=await db.prepare('SELECT account_id FROM clan_invitations WHERE realm=? AND clan_id=? AND account_id=? AND expires_at>?').bind(realm,clanId,target,now).first();if(!invite)fail('pilot_unavailable');return {invited:true};
  }
  if(action==='request'){
   await db.prepare("INSERT INTO clan_requests SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM clans WHERE realm=? AND id=? AND admission='request') AND NOT EXISTS(SELECT 1 FROM clan_members WHERE realm=? AND account_id=?) AND NOT EXISTS(SELECT 1 FROM clan_requests WHERE realm=? AND clan_id=? AND account_id=?) AND (SELECT count(*) FROM clan_members WHERE realm=? AND clan_id=?)<20").bind(realm,clanId,actor,now,realm,clanId,realm,actor,realm,clanId,actor,realm,clanId).run();
   const pending=await db.prepare('SELECT account_id FROM clan_requests WHERE realm=? AND clan_id=? AND account_id=?').bind(realm,clanId,actor).first();if(!pending)fail('clan_unavailable');return {requested:true};
  }
  let condition,extra=[];
  if(action==='join')condition="EXISTS(SELECT 1 FROM clans WHERE realm=? AND id=? AND admission='open')",extra=[realm,clanId];
  else if(action==='approve')condition=manager+' AND EXISTS(SELECT 1 FROM clan_requests WHERE realm=? AND clan_id=? AND account_id=?)',extra=[...binds,realm,clanId,target];
  else condition="EXISTS(SELECT 1 FROM clan_invitations i JOIN clan_members inviter ON inviter.realm=i.realm AND inviter.clan_id=i.clan_id AND inviter.account_id=i.invited_by AND inviter.role IN ('leader','officer') WHERE i.realm=? AND i.clan_id=? AND i.account_id=? AND i.expires_at>?)",extra=[realm,clanId,actor,now];
  await db.prepare("INSERT INTO clan_members(realm,clan_id,account_id,role,joined_at) SELECT ?,?,?,'member',? WHERE "+condition+' AND NOT EXISTS(SELECT 1 FROM clan_members WHERE realm=? AND account_id=?)').bind(realm,clanId,target,now,...extra,realm,target).run();
  const current=await member();if(current?.clan_id===clanId)return {joined:true};if(current)fail('already_in_clan');fail('clan_unavailable');
 }catch(error){if(error.code&&error.status)throw error;const message=String(error.message)+' '+String(error.cause?.message||'');for(const code of ['clan_full','clan_request_limit','clan_invitation_limit'])if(message.includes(code))fail(code);if(message.includes('clan_members.realm, clan_members.account_id'))fail('already_in_clan');throw error;}
}
