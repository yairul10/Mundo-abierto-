import {recordClanMissionEvents} from './missions.mjs';
export function initClanMissionOutbox(ctx){ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS clan_mission_outbox(id TEXT PRIMARY KEY,event TEXT NOT NULL)')}
export function queueClanMissionEvents(ctx,s,rewards,now){
 if(s.pvpMatch||s.cooperative!==true)return;
 for(const r of rewards){
  const p=s.players.find(p=>p.id===r.playerId);
  if(!p||p.isBot||p.testGuest||p.profile?.shipId==='adminpod'||!(r.damage>0)||!p.accountId||!r.enemyKind)continue;
  const event={realm:p.realm==='test'?'test':'normal',accountId:p.accountId,eventId:r.bossId,kind:r.enemyKind,time:s.events?.find(e=>e.type==='bossDefeated'&&e.id===r.bossId)?.time||now};
  ctx.storage.sql.exec('INSERT OR IGNORE INTO clan_mission_outbox VALUES(?,?)',r.id,JSON.stringify(event));
 }
}
export async function flushClanMissionOutbox(ctx,db){
 if(!db)return false;
 const rows=ctx.storage.sql.exec('SELECT id,event FROM clan_mission_outbox ORDER BY rowid LIMIT 50').toArray();if(!rows.length)return false;
 await recordClanMissionEvents(db,rows.map(r=>JSON.parse(r.event)));
 ctx.storage.transactionSync(()=>{for(const r of rows)ctx.storage.sql.exec('DELETE FROM clan_mission_outbox WHERE id=?',r.id)});
 return ctx.storage.sql.exec('SELECT 1 FROM clan_mission_outbox LIMIT 1').toArray().length>0;
}
