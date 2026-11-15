import {clanWeek} from '../clans/missions.mjs';
export const CLAN_WAR_WIN_POINTS=100;
// Only the coordinator's authoritative room result is accepted; no public award route.
export async function awardClanWarPoints(db,event,match){
 if(match.status!=='finished'||!['a','b'].includes(match.winnerTeam)||!['destroyed','time','surrender','disconnect'].includes(match.reason))return;
 if(!(match.combatStartedAt>0)&&!(match.score?.[match.winnerTeam]>=2))return;
 const clan=match.winnerTeam==='a'?match.a:match.b,time=match.finishedAt;
 if(!['normal','test'].includes(event.realm)||!Number.isSafeInteger(time))return;
 await db.batch([db.prepare(`INSERT OR IGNORE INTO clan_war_points(realm,event_id,match_code,clan_id,week,points,finished_at)
  SELECT ?,?,?,id,?,100,? FROM clans WHERE realm=? AND id=?`).bind(event.realm,event.id,match.code,clanWeek(time),time,event.realm,clan)]);
}
