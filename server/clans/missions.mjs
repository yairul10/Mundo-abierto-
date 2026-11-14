export const WEEK_MS=7*86400000;
// Monday 00:00 UTC. Week keys never depend on a device clock or language.
export function clanWeek(now=Date.now()){return Math.floor((now-345600000)/WEEK_MS)*WEEK_MS+345600000}
export const CLAN_MISSIONS=Object.freeze([
 {id:'enemies',title:'Patrulla cooperativa',goal:100,points:100},
 {id:'colossus',title:'Derrotar Colosos Pro',goal:10,points:200},
 {id:'titan',title:'Derrotar Titanes',goal:5,points:300},
 {id:'inferno',title:'Derrotar Infernos Pro',goal:3,points:400}
]);
const kinds=new Set(['colossusPro','granTitanPro','nexo','infernoPro','raider','sentinel','destroyer','catapult','harpooner','stalker']);
// Called only with receipts produced by the authoritative simulation, never request JSON.
export async function recordClanMissionEvents(db,events){
 const valid=events.filter(e=>['normal','test'].includes(e.realm)&&kinds.has(e.kind)&&/^[a-f0-9-]{36}$/i.test(e.accountId)&&typeof e.eventId==='string'&&e.eventId.length<=160&&Number.isSafeInteger(e.time)).slice(0,50);
 if(!valid.length)return;
 await db.batch(valid.map(e=>db.prepare(`INSERT OR IGNORE INTO clan_mission_events(realm,event_id,account_id,clan_id,week,kind,occurred_at)
  SELECT ?,?,m.account_id,m.clan_id,?,?,? FROM clan_members m
  WHERE m.realm=? AND m.account_id=? AND m.joined_at<=?`).bind(e.realm,e.eventId,clanWeek(e.time),e.kind,e.time,e.realm,e.accountId,e.time)));
}
const totalsSQL=`SELECT clan_id,COUNT(DISTINCT event_id) AS enemies,
 COUNT(DISTINCT CASE WHEN kind='colossusPro' THEN event_id END) AS colossus,
 COUNT(DISTINCT CASE WHEN kind IN ('granTitanPro','nexo') THEN event_id END) AS titan,
 COUNT(DISTINCT CASE WHEN kind='infernoPro' THEN event_id END) AS inferno
 FROM clan_mission_events WHERE realm=? AND week=? GROUP BY clan_id`;
const scoreSQL=CLAN_MISSIONS.map(m=>`CASE WHEN COALESCE(t.${m.id},0)>=${m.goal} THEN ${m.points} ELSE 0 END`).join('+');
export async function clanRanking(db,realm,now=Date.now()){
 const week=clanWeek(now),session=db.withSession?db.withSession('first-primary'):db;
 const result=await session.prepare(`SELECT c.id,c.name,c.tag,(${scoreSQL}) AS points,COALESCE(t.enemies,0) AS kills
 FROM clans c LEFT JOIN (${totalsSQL}) t ON t.clan_id=c.id WHERE c.realm=?
 ORDER BY points DESC,kills DESC,c.created_at,c.id LIMIT 50`).bind(realm,week,realm).all();
 return {week,endsAt:week+WEEK_MS,ranking:result.results.map((r,i)=>({...r,position:i+1})),limit:50};
}
export async function clanMissions(db,realm,actor,now=Date.now()){
 const week=clanWeek(now),session=db.withSession?db.withSession('first-primary'):db;
 const [memberships,totals,contributions]=await session.batch([
  session.prepare('SELECT c.id,c.name,c.tag FROM clan_members m JOIN clans c ON c.realm=m.realm AND c.id=m.clan_id WHERE m.realm=? AND m.account_id=?').bind(realm,actor),
  session.prepare(`SELECT t.* FROM (${totalsSQL}) t JOIN clan_members m ON m.clan_id=t.clan_id WHERE m.realm=? AND m.account_id=?`).bind(realm,week,realm,actor),
  session.prepare(`SELECT e.account_id,COUNT(DISTINCT e.event_id) AS kills FROM clan_mission_events e
   JOIN clan_members m ON m.realm=e.realm AND m.clan_id=e.clan_id AND m.account_id=?
   WHERE e.realm=? AND e.week=? GROUP BY e.account_id ORDER BY kills DESC,e.account_id LIMIT 100`).bind(actor,realm,week)
 ]);
 const clan=memberships.results[0]||null,counts=totals.results[0]||{};
 return {week,endsAt:week+WEEK_MS,clan,missions:clan?CLAN_MISSIONS.map(m=>({...m,progress:Math.min(m.goal,counts[m.id]||0),completed:(counts[m.id]||0)>=m.goal})):[],contributors:clan?contributions.results:[]};
}
