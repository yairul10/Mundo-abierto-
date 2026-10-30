// One-time level-60 objectives. Progress comes only from fresh boss receipts.
export const PVP_MISSIONS=Object.freeze([
 {id:'pvp-first-colossus',realm:'pvp',level:60,title:'Desafío PvP · Coloso Pro',reward:100000,xp:30000,cores:1,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:1,label:'Participa en la derrota de un Coloso Pro en el mapa PvP'}]},
 {id:'pvp-first-titan',realm:'pvp',level:60,title:'Desafío PvP · Gran Titán Pro',reward:200000,xp:60000,cores:1,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:1,label:'Participa en la derrota de un Gran Titán Pro en el mapa PvP'}]},
 {id:'pvp-five-colossi',realm:'pvp',level:60,title:'Cazador PvP · 5 Colosos Pro',reward:0,xp:0,cores:3,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Colosos Pro en el mapa PvP'}]},
 {id:'pvp-five-titans',realm:'pvp',level:60,title:'Cazador PvP · 5 Grandes Titanes Pro',reward:0,xp:0,cores:3,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Grandes Titanes Pro en el mapa PvP'}]}
]);
export function awardPvpMission(pilot,receipt){
 const matching=PVP_MISSIONS.filter(m=>m.enemyKind===receipt.enemyKind&&Number(pilot.level)>=m.level);
 if(!matching.length||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage||typeof receipt.bossId!=='string'||!receipt.bossId)return [];
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};
 state.completed=Array.isArray(state.completed)?state.completed:[];if(matching.every(m=>state.completed.includes(m.id)))return [];state.progress||={};state.bosses=Array.isArray(state.bosses)?state.bosses:[];
 if(state.bosses.includes(receipt.bossId))return [];
 state.bosses.push(receipt.bossId);const before=new Set(state.completed),awards=[];
 for(const m of matching){
  if(before.has(m.id)){state.progress[m.id]=m.objectives[0].goal;continue}
  const goal=m.objectives[0].goal;
  // Earlier releases recorded a completed single-boss mission, without counters.
  const legacyFirst=PVP_MISSIONS.find(o=>o.enemyKind===m.enemyKind&&o.objectives[0].goal===1);
  const initial=goal>1&&before.has(legacyFirst.id)?1:0;
  state.progress[m.id]=Math.min(goal,Math.max(initial,Math.floor(Number(state.progress[m.id])||0))+1);
  if(state.progress[m.id]>=goal){state.completed.push(m.id);awards.push(m)}
 }
 return awards;
}
export function settlePvpMissionCores(pilot){
 const state=pilot.quests?.pvpMissions;if(!state||!Array.isArray(state.completed))return 0;
 const claimed=new Set(Array.isArray(state.coreRewards)?state.coreRewards:[]);let added=0;
 for(const m of PVP_MISSIONS)if(state.completed?.includes(m.id)&&!claimed.has(m.id)){added+=m.cores;claimed.add(m.id)}
 if(added){pilot.loot||={};pilot.loot.nucleoNexo=(Number(pilot.loot.nucleoNexo)||0)+added;state.coreRewards=[...claimed]}
 return added;
}
export function missionPrize(m){return [m.reward&&m.reward.toLocaleString('es')+' créditos',m.xp&&m.xp.toLocaleString('es')+' XP',m.cores&&m.cores+' núcleo'+(m.cores===1?'':'s')+' del Nexo'].filter(Boolean).join(' · ')}
