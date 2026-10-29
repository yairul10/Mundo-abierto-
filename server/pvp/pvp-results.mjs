export const KILL_WINDOW=5*60*60*1000;
export function xpForLevel(level){const l=Math.max(1,Math.min(10000,Math.floor(Number(level)||1)));return 100+(l-1)*65+15*Math.max(0,l-10)**2}
export function qualifies(winner,victim){const level=Math.floor(winner.profile.level),other=Math.floor(victim.profile.level);return other>=(level>=200?150:Math.ceil(level*.6))}
export function awardKill(s,winner,victim,now,deathId){
 if(!winner||winner.profile.shipId==='adminpod'||victim.profile.shipId==='adminpod'||victim.lastDamageNoRewards||winner.id===victim.id||!qualifies(winner,victim))return null;
 s.killHistory=(s.killHistory||[]).filter(k=>k.time>now-KILL_WINDOW);
 if(s.killHistory.filter(k=>k.winner===winner.id&&k.victim===victim.id).length>=3)return null;
 const xp=Math.max(1,Math.round(xpForLevel(winner.profile.level)*.01));
 const entry={id:deathId,winner:winner.id,victim:victim.id,xp,time:now,name:winner.name};s.killHistory.push(entry);(s.pendingKills||=[]).push(entry);
 s.bossRewards||=[];s.bossRewards.push({id:'pvp:'+deathId,playerId:winner.id,amount:0,xp,damage:0,totalDamage:0,bossId:'pvp:'+deathId,materials:{}});return entry;
}
export function initResults(ctx){ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS pvp_results(id TEXT PRIMARY KEY,winner TEXT NOT NULL,victim TEXT NOT NULL,xp INTEGER NOT NULL,time INTEGER NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS pvp_ranking(player_id TEXT PRIMARY KEY,name TEXT NOT NULL,kills INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0)');ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS pvp_rank_kills ON pvp_ranking(kills DESC,player_id)');ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS pvp_rank_xp ON pvp_ranking(xp DESC,player_id)');ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS pvp_pair_time ON pvp_results(winner,victim,time)')}
export function persistResults(ctx,s){for(const k of s.pendingKills||[]){const exists=ctx.storage.sql.exec('SELECT id FROM pvp_results WHERE id=?',k.id).toArray().length;if(exists)continue;ctx.storage.sql.exec('INSERT INTO pvp_results VALUES(?,?,?,?,?)',k.id,k.winner,k.victim,k.xp,k.time);ctx.storage.sql.exec('INSERT INTO pvp_ranking VALUES(?,?,1,?) ON CONFLICT(player_id) DO UPDATE SET name=excluded.name,kills=kills+1,xp=xp+excluded.xp',k.winner,k.name,k.xp)}}
export function rankings(ctx,id){const sql=ctx.storage.sql;const rank=key=>{
 const top=sql.exec(`SELECT player_id,name,kills,xp FROM pvp_ranking ORDER BY ${key} DESC,player_id ASC LIMIT 100`).toArray().map((row,i)=>({...row,position:i+1}));
 const own=sql.exec('SELECT player_id,name,kills,xp FROM pvp_ranking WHERE player_id=?',id).toArray()[0];
 const mine=own?{...own,position:sql.exec(`SELECT COUNT(*)+1 AS position FROM pvp_ranking WHERE ${key}>? OR (${key}=? AND player_id<?)`,own[key],own[key],id).toArray()[0].position}:null;return {top,mine};};return {type:'rankings',kills:rank('kills'),xp:rank('xp')};}

// Server-owned ranks for live nameplates. Never trust client-supplied progress.
export function pilotRanks(ctx,ids){
 const result={};for(const id of ids){
  const row=ctx.storage.sql.exec('SELECT player_id,kills FROM pvp_ranking WHERE player_id=?',id).toArray()[0];
  result[id]=row&&row.kills>0?{kills:row.kills,position:ctx.storage.sql.exec('SELECT COUNT(*)+1 AS position FROM pvp_ranking WHERE kills>? OR (kills=? AND player_id<?)',row.kills,row.kills,id).toArray()[0].position}:{kills:0,position:0};
 }return result;
}
