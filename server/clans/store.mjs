export const CLAN_RULES=Object.freeze({capacity:20,creationCost:200000,roles:['leader','officer','member'],admissions:['open','request','invite']});
export const clanPermissions=role=>({manageAdmissions:role==='leader'||role==='officer',editClan:role==='leader',manageRoles:role==='leader',transferLeadership:role==='leader',disband:role==='leader'});
// Reads derive the actor's membership from the verified account, never a supplied role or clan ID.
export async function clanAccountState(db,realm,accountId,now=Date.now()){
 db=db.withSession?db.withSession('first-primary'):db;
 const [memberships,invites,requests]=await db.batch([
  db.prepare('SELECT c.*,m.role,m.joined_at FROM clan_members m JOIN clans c ON c.realm=m.realm AND c.id=m.clan_id WHERE m.realm=? AND m.account_id=?').bind(realm,accountId),
  db.prepare('SELECT i.clan_id,c.name,c.tag,i.invited_by,i.created_at,i.expires_at FROM clan_invitations i JOIN clans c ON c.realm=i.realm AND c.id=i.clan_id WHERE i.realm=? AND i.account_id=? AND i.expires_at>? ORDER BY i.created_at DESC LIMIT 50').bind(realm,accountId,now),
  db.prepare('SELECT r.clan_id,c.name,c.tag,r.created_at FROM clan_requests r JOIN clans c ON c.realm=r.realm AND c.id=r.clan_id WHERE r.realm=? AND r.account_id=? ORDER BY r.created_at DESC LIMIT 50').bind(realm,accountId)
 ]);
 const row=memberships.results[0];
 if(!row)return {rules:CLAN_RULES,clan:null,permissions:clanPermissions(null),invitations:invites.results,requests:requests.results};
 const clan={id:row.id,name:row.name,tag:row.tag,description:row.description,admission:row.admission,createdAt:row.created_at,revision:row.revision,role:row.role};
 const permissions=clanPermissions(row.role);
 const [members,pending]=await db.batch([
  db.prepare('SELECT account_id,role,joined_at FROM clan_members WHERE realm=? AND clan_id=? ORDER BY joined_at,account_id LIMIT 20').bind(realm,row.id),
  db.prepare("SELECT r.account_id,r.created_at FROM clan_requests r WHERE r.realm=? AND r.clan_id=? AND EXISTS(SELECT 1 FROM clan_members m WHERE m.realm=r.realm AND m.clan_id=r.clan_id AND m.account_id=? AND m.role IN ('leader','officer')) ORDER BY r.created_at LIMIT 100").bind(realm,row.id,accountId)
 ]);
 return {rules:CLAN_RULES,clan:{...clan,members:members.results},permissions,invitations:invites.results,requests:requests.results,pendingRequests:pending.results};
}

export async function searchClans(db,realm,query=''){
 db=db.withSession?db.withSession('first-primary'):db;
 const q=String(query).normalize('NFKC').trim().toLocaleLowerCase('es');
 const data=await db.prepare("SELECT c.id,c.name,c.tag,c.description,c.admission,(SELECT count(*) FROM clan_members m WHERE m.realm=c.realm AND m.clan_id=c.id) AS member_count FROM clans c WHERE c.realm=? AND (?='' OR instr(c.name_key,?)>0 OR instr(lower(c.tag),?)>0) ORDER BY c.name_key,c.id LIMIT 20").bind(realm,q,q,q).all();
 return {clans:data.results.map(row=>({id:row.id,name:row.name,tag:row.tag,description:row.description,admission:row.admission,memberCount:row.member_count})),limit:20};
}
export async function publicClan(db,realm,id){
 db=db.withSession?db.withSession('first-primary'):db;
 const [clans,members]=await db.batch([
  db.prepare('SELECT id,name,tag,description,admission,created_at FROM clans WHERE realm=? AND id=?').bind(realm,id),
  db.prepare("SELECT account_id,role,joined_at FROM clan_members WHERE realm=? AND clan_id=? ORDER BY CASE role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,joined_at,account_id LIMIT 20").bind(realm,id)
 ]);
 const row=clans.results[0];if(!row)return null;
 return {id:row.id,name:row.name,tag:row.tag,description:row.description,admission:row.admission,createdAt:row.created_at,memberCount:members.results.length,members:members.results.map(p=>({pilot:'Piloto #'+p.account_id.replaceAll('-','').slice(-6),role:p.role,joinedAt:p.joined_at}))};
}
