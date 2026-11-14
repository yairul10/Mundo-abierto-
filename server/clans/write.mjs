import {CLAN_RULES} from './store.mjs';
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status})};
export function clanInput(raw){
 const name=String(raw?.name||'').normalize('NFKC').trim().replace(/\s+/g,' '),tag=String(raw?.tag||'').normalize('NFKC').trim().toUpperCase(),description=String(raw?.description||'').trim(),admission=raw?.admission||'request';
 if(name.length<3||name.length>24||!/^[\p{L}\p{N} _'-]+$/u.test(name))fail('invalid_clan_name',400);
 if(!/^[A-Z0-9]{2,5}$/.test(tag))fail('invalid_clan_tag',400);
 if(description.length>240||/[\u0000-\u0008\u000b-\u001f]/.test(description))fail('invalid_clan_description',400);
 if(!CLAN_RULES.admissions.includes(admission))fail('invalid_admission',400);
 return {name,nameKey:name.toLocaleLowerCase('es'),tag,description,admission};
}
async function receipt(db,realm,accountId,operationId){
 const row=await db.prepare('SELECT r.account_id,r.clan_id,p.expected_revision FROM clan_creation_receipts r JOIN clan_creation_payments p ON p.realm=r.realm AND p.operation_id=r.operation_id WHERE r.realm=? AND r.operation_id=?').bind(realm,operationId).first();
 if(!row)return null;if(row.account_id!==accountId)fail('operation_conflict');
 const saved=await db.prepare('SELECT revision FROM player_saves WHERE player_id=?').bind(accountId).first();
 return {created:true,clanId:row.clan_id,operationId,cost:CLAN_RULES.creationCost,revision:row.expected_revision+1,currentRevision:saved?.revision};
}
export async function createClan(db,realm,accountId,raw,now=Date.now()){
 if(realm!=='normal')fail('clan_creation_normal_only',400);
 if(!/^[a-f0-9-]{36}$/i.test(raw?.operationId||'')||!Number.isSafeInteger(raw?.revision)||raw.revision<0)fail('invalid_operation',400);
 db=db.withSession?db.withSession('first-primary'):db;
 const previous=await receipt(db,realm,accountId,raw.operationId);if(previous)return previous;
 const clan=clanInput(raw),id=crypto.randomUUID();
 try{await db.batch([
  db.prepare('INSERT INTO clans(realm,id,name,name_key,tag,description,admission,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(realm,id,clan.name,clan.nameKey,clan.tag,clan.description,clan.admission,now),
  db.prepare("INSERT INTO clan_members(realm,account_id,clan_id,role,joined_at) VALUES(?,?,?,'leader',?)").bind(realm,accountId,id,now),
  db.prepare('INSERT INTO clan_creation_payments VALUES(?,?,?,?)').bind(realm,raw.operationId,accountId,raw.revision),
  db.prepare('INSERT INTO clan_creation_receipts VALUES(?,?,?,?,?,?)').bind(realm,raw.operationId,accountId,id,CLAN_RULES.creationCost,now)
 ])}catch(error){
  const retry=await receipt(db,realm,accountId,raw.operationId);if(retry)return retry;
  const message=String(error?.cause?.message||'')+' '+String(error.message);
  for(const code of ['clan_revision_conflict','clan_insufficient_credits'])if(message.includes(code))fail(code);
  if(message.includes('clans.realm, clans.name_key'))fail('clan_name_taken');if(message.includes('clans.realm, clans.tag'))fail('clan_tag_taken');
  if(message.includes('clan_members.realm, clan_members.account_id'))fail('already_in_clan');throw error;
 }
 return receipt(db,realm,accountId,raw.operationId);
}
export async function editClan(db,realm,accountId,raw){
 if(typeof raw?.id!=='string'||raw.id.length>64||!Number.isSafeInteger(raw?.revision))fail('invalid_clan',400);
 const description=String(raw.description||'').trim(),admission=raw.admission;
 if(description.length>240)fail('invalid_clan_description',400);if(!CLAN_RULES.admissions.includes(admission))fail('invalid_admission',400);
 const result=await db.prepare("UPDATE clans SET description=?,admission=?,revision=revision+1 WHERE realm=? AND id=? AND revision=? AND EXISTS(SELECT 1 FROM clan_members m WHERE m.realm=clans.realm AND m.clan_id=clans.id AND m.account_id=? AND m.role='leader')").bind(description,admission,realm,raw.id,raw.revision,accountId).run();
 if(result.meta.changes!==1)fail('clan_edit_conflict');return {updated:true};
}
