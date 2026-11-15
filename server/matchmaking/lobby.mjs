import {validPvpMode,pvpRoomName,PVP_MODES} from '../pvp/pvp-teams.mjs';
import {SEARCH_MS,NOTICE_MS,PRESENCE_MS,packTeams,matchPoints} from './rules.mjs';
const fail=code=>{throw Object.assign(Error(code),{code,status:409})};
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
export function initMatchmaking(ctx){
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS matchmaking_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS arena_points(account_id TEXT PRIMARY KEY,name TEXT NOT NULL,points INTEGER NOT NULL,wins INTEGER NOT NULL,matches INTEGER NOT NULL)');
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS arena_receipts(match_id TEXT NOT NULL,account_id TEXT NOT NULL,points INTEGER NOT NULL,place INTEGER,PRIMARY KEY(match_id,account_id))');
}
function state(ctx){initMatchmaking(ctx);return JSON.parse(ctx.storage.sql.exec('SELECT data FROM matchmaking_state WHERE id=1').toArray()[0]?.data||'{"parties":[],"queues":[],"matches":[],"presence":{}}')}
function save(ctx,s){ctx.storage.sql.exec('INSERT INTO matchmaking_state VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(s))}
export function score(ctx,actor){const row=ctx.storage.sql.exec('SELECT * FROM arena_points WHERE account_id=?',actor).toArray()[0];return row?{...row,position:row.points>0?ctx.storage.sql.exec('SELECT COUNT(*)+1 AS n FROM arena_points WHERE points>? OR (points=? AND account_id<?)',row.points,row.points,actor).toArray()[0].n:0}:{points:0,wins:0,matches:0,position:0}}
export async function matchmakingCommand(lobby,actor,name,realm,raw,now=Date.now()){
 const ctx=lobby.ctx,s=state(ctx),action=raw.action||'status';s.realm=realm;
 if(actor){if(raw.active!==false)s.presence[actor]=now;for(const p of s.parties)for(const m of p.members)if(m.id===actor)m.name=name;}
 const party=()=>s.parties.find(p=>p.members.some(m=>m.id===actor));
 const pending=id=>s.matches.find(m=>!m.settled&&m.roster.some(p=>p.accountId===id));
 const queued=p=>s.queues.find(q=>q.partyId===p?.id);
 const idle=p=>{if(queued(p)||p?.members.some(m=>pending(m.id)))fail('party_busy')};
 if(action==='create'){
  if(party()||pending(actor))fail('party_busy');let id;do{id=code()}while(s.parties.some(p=>p.id===id));
  s.parties.push({id,leader:actor,members:[{id:actor,name}],createdAt:now});
 }else if(action==='joinParty'){
  if(party()||pending(actor))fail('party_busy');const p=s.parties.find(p=>p.id===String(raw.code||'').trim().toUpperCase());if(!p)fail('party_not_found');idle(p);if(p.members.length>=5)fail('party_full');p.members.push({id:actor,name});
 }else if(action==='leaveParty'){
  const p=party();if(p){if(p.members.some(m=>pending(m.id)))fail('party_busy');s.queues=s.queues.filter(q=>q.partyId!==p.id);p.members=p.members.filter(m=>m.id!==actor);if(!p.members.length)s.parties=s.parties.filter(q=>q!==p);else if(p.leader===actor)p.leader=p.members[0].id;}
 }else if(action==='queue'){
  if(!validPvpMode(raw.mode))fail('invalid_mode');let p=party();if(!p){p={id:code(),leader:actor,members:[{id:actor,name}],createdAt:now};s.parties.push(p)}
  if(p.leader!==actor)fail('leader_only');idle(p);if(p.members.length>PVP_MODES[raw.mode].teamSize)fail('party_too_large');
  if(p.members.some(m=>now-(s.presence[m.id]||0)>PRESENCE_MS))fail('party_offline');
  if(s.queues.length>=500)fail('queue_full');s.queues.push({id:crypto.randomUUID(),partyId:p.id,mode:raw.mode,createdAt:now,deadline:now+SEARCH_MS,members:p.members.map(m=>({...m}))});
 }else if(action==='cancel'){
  const p=party();if(p&&p.leader!==actor)fail('leader_only');if(p?.members.some(m=>pending(m.id)))fail('match_assigned');s.queues=s.queues.filter(q=>q.partyId!==p?.id);
 }else if(!['status','tick'].includes(action))fail('invalid_action');
 // Queue presence expires when an app closes. Friends are never silently split apart.
 s.queues=s.queues.filter(q=>q.members.every(m=>now-(s.presence[m.id]||0)<=PRESENCE_MS));
 for(const mode of Object.keys(PVP_MODES)){
  for(let iteration=0;iteration<25;iteration++){
   const queue=s.queues.filter(q=>q.mode===mode).sort((a,b)=>a.createdAt-b.createdAt);if(!queue.length)break;
   const plan=packTeams(queue,mode);if(!plan.full&&now<queue[0].deadline)break;
   const m={id:crypto.randomUUID(),code:code(),realm,mode,roster:plan.roster,createdAt:now,startsAt:now+NOTICE_MS,joinDeadline:now+NOTICE_MS+35000,status:'configuring',settled:false};
   s.matches.push(m);s.queues=s.queues.filter(q=>!plan.selected.includes(q));save(ctx,s);await ctx.storage.setAlarm(now+5000);
  }
 }
 // Record assignments before RPC. Retries use the same match ID and roster.
 for(const m of s.matches.filter(m=>!m.settled)){
  const room=lobby.env.ROOMS.getByName(pvpRoomName(realm,m.code,m.mode));
  if(m.status==='configuring'){
   const result=await room.configureRankedMatch({...m,ranks:Object.fromEntries(m.roster.map(p=>[p.accountId,score(ctx,p.accountId)]))});if(!result?.ok)throw Error('match_configuration_failed');m.status='active';save(ctx,s);
  }
  const result=await room.rankedResult(m.id,now>m.createdAt+3600000);if(result?.status!=='finished')continue;
  ctx.storage.transactionSync(()=>{
   for(const row of result.players.filter(p=>!p.isBot)){
    const points=matchPoints(m.mode,row.place,result.winnerTeam===row.team,!!result.combatStartedAt&&row.participated&&result.reason!=='abandoned');
    const exists=ctx.storage.sql.exec('SELECT 1 FROM arena_receipts WHERE match_id=? AND account_id=?',m.id,row.accountId).toArray().length;if(exists)continue;
    ctx.storage.sql.exec('INSERT INTO arena_receipts VALUES(?,?,?,?)',m.id,row.accountId,points,row.place||null);
    ctx.storage.sql.exec('INSERT INTO arena_points VALUES(?,?,?,?,1) ON CONFLICT(account_id) DO UPDATE SET name=excluded.name,points=arena_points.points+excluded.points,wins=arena_points.wins+excluded.wins,matches=arena_points.matches+1',row.accountId,row.name,points,result.winnerTeam===row.team?1:0);
   }
   m.status='finished';m.settled=true;m.finishedAt=now;save(ctx,s);
  });
 }
 s.matches=s.matches.filter(m=>!m.settled||now-m.finishedAt<86400000);s.parties=s.parties.filter(p=>p.members.some(m=>pending(m.id)||now-(s.presence[m.id]||0)<1800000));
 const keep=new Set(s.parties.flatMap(p=>p.members.map(m=>m.id)));for(const id of Object.keys(s.presence))if(!keep.has(id))delete s.presence[id];save(ctx,s);
 if(s.queues.length||s.matches.some(m=>!m.settled))await ctx.storage.setAlarm(now+5000);
 const p=party(),assignment=pending(actor),queue=queued(p),latest=s.matches.filter(m=>m.settled&&m.roster.some(p=>p.accountId===actor)).at(-1);
 return {serverTime:now,pilotId:actor,party:p||null,queue:queue?{mode:queue.mode,deadline:queue.deadline,players:s.queues.filter(q=>q.mode===queue.mode).reduce((n,q)=>n+q.members.length,0),capacity:PVP_MODES[queue.mode].capacity}:null,assignment:assignment&&assignment.status!=='configuring'?{id:assignment.id,code:assignment.code,mode:assignment.mode,startsAt:assignment.startsAt}:null,rank:actor?score(ctx,actor):null,latest:latest?ctx.storage.sql.exec('SELECT points,place,match_id FROM arena_receipts WHERE match_id=? AND account_id=?',latest.id,actor).toArray()[0]||null:null,top:ctx.storage.sql.exec('SELECT name,points,wins,matches FROM arena_points ORDER BY points DESC,account_id LIMIT 100').toArray()};
}
export function hasMatchmaking(ctx){return !!ctx.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='matchmaking_state'").toArray().length}
