import {CoopLobby} from '../pvp/coop-lobby.mjs';
import {pvpRoomName} from '../pvp/pvp-teams.mjs';
import {WAR_COUNTDOWN,WAR_TRAVEL,activeWarPilot,shuffledTeams,warSize,warAssignment} from './rules.mjs';
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status})};
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
export class ClanWarLobby extends CoopLobby{
 constructor(ctx,env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS clan_wars(id TEXT PRIMARY KEY,data TEXT NOT NULL,created_at INTEGER NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS war_presence(account_id TEXT PRIMARY KEY,seen_at INTEGER NOT NULL,active_at INTEGER NOT NULL)')}
 event(){const row=this.ctx.storage.sql.exec('SELECT data FROM clan_wars ORDER BY created_at DESC,rowid DESC LIMIT 1').toArray()[0];return row?JSON.parse(row.data):null}
 save(e){this.ctx.storage.sql.exec('INSERT INTO clan_wars VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',e.id,JSON.stringify(e),e.createdAt)}
 async member(actor,realm){return (await this.env.CLANS_DB.prepare('SELECT m.clan_id,m.role,c.name,c.tag FROM clan_members m JOIN clans c ON c.realm=m.realm AND c.id=m.clan_id WHERE m.realm=? AND m.account_id=?').bind(realm,actor).all()).results[0]}
 async warCommand(actor,admin,realm,raw){
  const now=Date.now(),action=raw?.action||'status';let e=this.event();
  if(action==='presence')this.ctx.storage.sql.exec('INSERT INTO war_presence VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET seen_at=excluded.seen_at,active_at=excluded.active_at',actor,now,raw.active===true?now:0);
  if(['open','start','cancel'].includes(action)){
   if(!admin)fail('war_admin_only',403);
   if(action==='open'){
    if(e&&!['finished','cancelled'].includes(e.phase))fail('war_event_busy');if(!warSize(raw.mode))fail('invalid_mode',400);
    e={id:crypto.randomUUID(),realm,mode:raw.mode,phase:'registration',createdAt:now,teams:[],matches:[]};this.save(e);
    this.ctx.storage.sql.exec('DELETE FROM clan_wars WHERE id NOT IN(SELECT id FROM clan_wars ORDER BY created_at DESC,rowid DESC LIMIT 20)');
   }else if(action==='start'){
    if(e?.phase!=='registration'||e.teams.length<2)fail('war_need_teams');
    const teams=shuffledTeams(e.teams),previous=this.ctx.storage.sql.exec('SELECT data FROM clan_wars WHERE id<>? ORDER BY created_at DESC,rowid DESC LIMIT 1',e.id).toArray()[0];if(teams.length%2&&previous&&JSON.parse(previous.data).bye===teams.at(-1).clanId)[teams[0],teams[teams.length-1]]=[teams.at(-1),teams[0]];e.matches=[];for(let i=0;i+1<teams.length;i+=2)e.matches.push({code:code(),a:teams[i].clanId,b:teams[i+1].clanId,status:'scheduled'});e.bye=teams.length%2?teams.at(-1).clanId:null;e.phase='countdown';e.beginsAt=now+WAR_COUNTDOWN;this.save(e);await this.ctx.storage.setAlarm(e.beginsAt);
   }else{if(!e||!['registration','countdown'].includes(e.phase))fail('war_cannot_cancel');e.phase='cancelled';this.save(e);await this.ctx.storage.deleteAlarm()}
  }else if(['register','withdraw'].includes(action)){
   if(e?.phase!=='registration')fail('war_registration_closed');const eventId=e.id;
   const member=await this.member(actor,realm);if(!member||!['leader','officer'].includes(member.role))fail('war_officer_only',403);
   let roster=[];
   if(action==='register'){
    if(!Array.isArray(raw.roster)||raw.roster.length!==warSize(e.mode)||new Set(raw.roster).size!==raw.roster.length||raw.roster.some(id=>typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)))fail('war_invalid_roster',400);
    const rows=await this.env.CLANS_DB.prepare('SELECT account_id FROM clan_members WHERE realm=? AND clan_id=? AND account_id IN ('+raw.roster.map(()=>'?').join(',')+')').bind(realm,member.clan_id,...raw.roster).all();if(rows.results.length!==raw.roster.length)fail('war_members_only',403);roster=[...raw.roster];
   }
   // Re-read after D1 awaits so concurrent admin start or another registration cannot be overwritten.
   e=this.event();if(e.id!==eventId||e.phase!=='registration')fail('war_registration_closed');
   const previous=e.teams.find(t=>t.clanId===member.clan_id);if(!previous&&e.teams.length>=32)fail('war_event_full');e.teams=e.teams.filter(t=>t.clanId!==member.clan_id);
   if(action==='register')e.teams.push({clanId:member.clan_id,name:member.name,tag:member.tag,roster});this.save(e);
  }else if(!['status','presence'].includes(action))fail('war_invalid_action',400);
  e=this.event();if(e&&['countdown','active'].includes(e.phase)&&this.ctx.storage.getAlarm&&await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(e.phase==='countdown'?Math.max(Date.now()+1,e.beginsAt):Date.now()+1000);const own=e?.teams.find(t=>t.roster.includes(actor));
  const history=this.ctx.storage.sql.exec('SELECT data FROM clan_wars ORDER BY created_at DESC,rowid DESC LIMIT 10').toArray().map(r=>JSON.parse(r.data)).filter(x=>['finished','cancelled'].includes(x.phase));
  const visible=x=>x?{id:x.id,mode:x.mode,phase:x.phase,beginsAt:x.beginsAt||null,bye:x.bye||null,teams:x.teams.map(t=>({clanId:t.clanId,name:t.name,tag:t.tag,count:t.roster.length})),matches:x.matches.map(({code,allowed,...m})=>m)}:null;
  return {serverTime:now,admin,event:visible(e),enrolled:!!own,clanId:own?.clanId||null,assignment:e?.phase==='active'?warAssignment(e,actor):null,history:history.map(visible)};
 }
 async warRequest(actor,admin,realm,raw){try{return await this.warCommand(actor,admin,realm,raw)}catch(error){return {error:error.code||'war_unavailable',status:error.status||503}}}
 async reservation(actor){const e=this.event();return !!e&&e.phase==='countdown'&&e.teams.some(t=>t.roster.includes(actor))}
 async warTicket(body){const e=this.event(),assignment=warAssignment(e,body.accountId);if(e?.phase!=='active'||body.eventId!==e.id||!assignment) return {error:'war_not_assigned'};const ticket=await this.env.ROOMS.getByName(pvpRoomName(e.realm,assignment.code,e.mode)).enter({...body,pvpRoom:undefined,coopRoom:undefined});return {...ticket,arena:{code:assignment.code,mode:e.mode},war:{eventId:e.id}}}
 async alarm(){let e=this.event();if(!e||!['countdown','active'].includes(e.phase))return;const now=Date.now();
  try{
   if(e.phase==='countdown'){
    if(now<e.beginsAt){await this.ctx.storage.setAlarm(e.beginsAt);return}
    e.phase='active';e.endsAt=now+1800000;e.present=e.teams.flatMap(t=>t.roster).filter(id=>activeWarPilot(this.ctx.storage.sql.exec('SELECT seen_at AS seenAt,active_at AS activeAt FROM war_presence WHERE account_id=?',id).toArray()[0],now));this.save(e);
   }
    for(const match of e.matches){
     if(match.status!=='scheduled')continue;match.allowed=[];
     for(const [team,clanId]of [['a',match.a],['b',match.b]]){
      const registration=e.teams.find(t=>t.clanId===clanId),members=await this.env.CLANS_DB.prepare('SELECT account_id FROM clan_members WHERE realm=? AND clan_id=?').bind(e.realm,clanId).all(),valid=new Set(members.results.map(m=>m.account_id));
      for(const [i,accountId]of registration.roster.entries()){if(valid.has(accountId)&&e.present.includes(accountId))match.allowed.push({accountId,team,slot:i*2+(team==='b'?1:0)})}
     }
     const a=match.allowed.some(p=>p.team==='a'),b=match.allowed.some(p=>p.team==='b');
     if(!a||!b){match.status='finished';match.winnerTeam=a?'a':b?'b':null;match.reason=a||b?'absence':'both_absent';this.save(e);continue}
     match.joinDeadline=now+WAR_TRAVEL;
     const configured=await this.env.ROOMS.getByName(pvpRoomName(e.realm,match.code,e.mode)).configureClanWar({code:match.code,mode:e.mode,realm:e.realm,eventId:e.id,roster:match.allowed,joinDeadline:match.joinDeadline,clans:e.teams.filter(t=>[match.a,match.b].includes(t.clanId)).map(t=>({id:t.clanId,name:t.name,tag:t.tag}))});if(!configured.ok){match.code=code();this.save(e);continue}match.status='active';this.save(e);
    }
    this.save(e);
   for(const m of e.matches.filter(m=>m.status==='active')){const result=await this.env.ROOMS.getByName(pvpRoomName(e.realm,m.code,e.mode)).clanWarResult(e.id,now>=e.endsAt);if(result?.status==='finished'){Object.assign(m,{status:'finished',winnerTeam:result.winnerTeam,reason:result.reason,score:result.score});this.save(e)}}
   if(e.matches.every(m=>m.status==='finished')){e.phase='finished';e.finishedAt=now;this.save(e)}else await this.ctx.storage.setAlarm(now+5000);
  }catch{console.error(JSON.stringify({event:'clan_war_retry'}));await this.ctx.storage.setAlarm(Date.now()+5000)}
 }
}
