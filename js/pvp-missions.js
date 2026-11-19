// One-time level-60 objectives. Progress comes only from fresh boss receipts.
export const DRONE_MISSION_ID='coop-drone-pearl';
export const DRONE_MISSION=Object.freeze({id:DRONE_MISSION_ID,realm:'pvp',level:100,title:'Diseño de dron · Perla violeta',reward:0,xp:0,cores:0,skin:'pearl',objectives:[{event:'infernoPro',sector:'pvp',goal:50,label:'Derrota 50 Infernos Pro'},{event:'granTitanPro',sector:'pvp',goal:40,label:'Derrota 40 Grandes Titanes Pro'}]});
export const PVP_MISSIONS=Object.freeze([
 DRONE_MISSION,
 {id:'pet-blue-titan-nexo',realm:'pvp',level:110,title:'Mascota · Dron Azul',reward:0,xp:0,cores:0,pet:'blue',objectives:[{event:'nexo',sector:'pvp',goal:20,label:'Participa en la derrota de 20 Titanes del Nexo'}]},
 {id:'pet-red-titan-nexo',realm:'pvp',level:115,title:'Mascota · Dron Rojo',reward:0,xp:0,cores:0,pet:'red',objectives:[{event:'nexo',sector:'pvp',goal:20,label:'Derrota 20 Titanes del Nexo después de completar la misión azul'}]},
 {id:'pvp-first-colossus',realm:'pvp',level:60,title:'Desafío cooperativo · Coloso Pro',reward:100000,xp:30000,cores:1,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:1,label:'Participa en la derrota de un Coloso Pro en el mapa Cooperativo'}]},
 {id:'pvp-first-titan',realm:'pvp',level:60,title:'Desafío cooperativo · Gran Titán Pro',reward:200000,xp:60000,cores:1,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:1,label:'Participa en la derrota de un Gran Titán Pro en el mapa Cooperativo'}]},
 {id:'pvp-five-colossi',realm:'pvp',level:60,title:'Cazador cooperativo · 5 Colosos Pro',reward:0,xp:0,cores:3,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Colosos Pro en el mapa Cooperativo'}]},
 {id:'pvp-five-titans',realm:'pvp',level:60,title:'Cazador cooperativo · 5 Grandes Titanes Pro',reward:0,xp:0,cores:3,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Grandes Titanes Pro en el mapa Cooperativo'}]}
]);
export function awardPvpMission(pilot,receipt){
 const matching=PVP_MISSIONS.filter(m=>m.enemyKind===receipt?.enemyKind&&Number(pilot.level)>=m.level);
 if(!matching.length||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage||typeof receipt.bossId!=='string'||!receipt.bossId)return [];
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};state.completed=Array.isArray(state.completed)?state.completed:[];state.progress||={};state.bosses=Array.isArray(state.bosses)?state.bosses:[];
 const mission=matching.find(m=>!state.completed.includes(m.id)&&(Number(state.progress[m.id])||0)<m.objectives[0].goal);
 if(!mission||state.bosses.includes(receipt.bossId))return [];
 state.bosses.push(receipt.bossId);const goal=mission.objectives[0].goal;
 state.progress[mission.id]=Math.min(goal,Math.max(0,Math.floor(Number(state.progress[mission.id])||0))+1);
 if(state.progress[mission.id]>=goal){state.completed.push(mission.id);return [mission]}return [];
}
export function settlePvpMissionCores(pilot){
 const state=pilot.quests?.pvpMissions;if(!state||!Array.isArray(state.completed))return 0;
 const claimed=new Set(Array.isArray(state.coreRewards)?state.coreRewards:[]);let added=0;
 for(const m of PVP_MISSIONS)if(state.completed?.includes(m.id)&&!claimed.has(m.id)){added+=m.cores;claimed.add(m.id)}
 if(added){pilot.loot||={};pilot.loot.nucleoNexo=(Number(pilot.loot.nucleoNexo)||0)+added;state.coreRewards=[...claimed]}
 return added;
}
export function missionPrize(m){return [m.pet==='blue'&&'Diseño de mascota Dron Azul',m.pet==='red'&&'Diseño de mascota Dron Rojo',m.skin&&'Diseño de dron Perla violeta · +30 % de daño de drones de apoyo',m.reward&&m.reward.toLocaleString('es')+' créditos',m.xp&&m.xp.toLocaleString('es')+' XP',m.cores&&m.cores+' núcleo'+(m.cores===1?'':'s')+' del Nexo'].filter(Boolean).join(' · ')}


// Award only verified boss participation, after level 100; boss IDs guard duplicates.
export function awardDroneMission(pilot,receipt){
 if(Number(pilot.level)<100||!receipt||!['infernoPro','granTitanPro'].includes(receipt.enemyKind)||typeof receipt.bossId!=='string'||!receipt.bossId||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage)return [];
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};state.completed=Array.isArray(state.completed)?state.completed:[];if(state.completed.includes(DRONE_MISSION_ID))return [];
 state.droneBosses=Array.isArray(state.droneBosses)?state.droneBosses:[];if(state.droneBosses.includes(receipt.bossId))return [];
 state.droneBosses.push(receipt.bossId);state.droneProgress=Array.isArray(state.droneProgress)?state.droneProgress:[0,0];const i=receipt.enemyKind==='infernoPro'?0:1;state.droneProgress=DRONE_MISSION.objectives.map((o,n)=>Math.max(0,Math.min(o.goal,Math.floor(Number(state.droneProgress[n])||0))));state.droneProgress[i]=Math.min(DRONE_MISSION.objectives[i].goal,state.droneProgress[i]+1);
 if(state.droneProgress.every((n,j)=>n>=DRONE_MISSION.objectives[j].goal)){state.completed.push(DRONE_MISSION_ID);return [DRONE_MISSION]}return [];
}

// Allocate each verified Nexo to the first unlocked unfinished pet mission.
export function awardBluePetMission(pilot,receipt){
 if(receipt?.enemyKind!=='nexo'||typeof receipt.bossId!=='string'||!receipt.bossId||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage)return [];
 const existing=pilot.quests?.pvpMissions;
 const mission=PVP_MISSIONS.find(m=>m.pet&&Number(pilot.level)>=m.level&&!existing?.completed?.includes(m.id));
 if(!mission)return [];
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};state.completed=Array.isArray(state.completed)?state.completed:[];
 state.petNexoBosses=Array.isArray(state.petNexoBosses)?state.petNexoBosses:[];if(state.petNexoBosses.includes(receipt.bossId))return [];
 state.petNexoBosses.push(receipt.bossId);state.progress||={};const goal=mission.objectives[0].goal;
 state.progress[mission.id]=Math.min(goal,Math.max(0,Math.floor(Number(state.progress[mission.id])||0))+1);
 if(state.progress[mission.id]===goal){state.completed.push(mission.id);return [mission]}return [];
}

// Preserve the old displayed one-kill legacy progress once, without crediting new defeats twice.
function migrateExclusiveKills(pilot){
 const state=pilot.quests?.pvpMissions;if(!state||state.exclusiveKillsV1)return;
 state.progress||={};
 for(const m of PVP_MISSIONS.filter(m=>m.enemyKind&&m.objectives[0].goal>1)){
  const first=PVP_MISSIONS.find(o=>o.enemyKind===m.enemyKind&&o.objectives[0].goal===1);
  if(state.completed?.includes(first?.id))state.progress[m.id]=Math.max(1,Math.floor(Number(state.progress[m.id])||0));
 }
 state.exclusiveKillsV1=true;
}
// One receipt is allocated to the lowest-level eligible mission with an unfinished matching objective.
export function awardExclusiveBossMission(pilot,receipt){
 if(!receipt||typeof receipt.bossId!=='string'||!receipt.bossId||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage)return [];
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};state.completed=Array.isArray(state.completed)?state.completed:[];
 migrateExclusiveKills(pilot);
 if(['bosses','droneBosses','petNexoBosses','exclusiveBosses'].some(k=>Array.isArray(state[k])&&state[k].includes(receipt.bossId)))return [];
 const eligible=PVP_MISSIONS.filter(m=>{
  if(Number(pilot.level)<m.level||state.completed.includes(m.id))return false;
  if(m.pet)return receipt.enemyKind==='nexo'&&(Number(state.progress?.[m.id])||0)<m.objectives[0].goal;
  if(m.skin){const i=m.objectives.findIndex(o=>o.event===receipt.enemyKind);return i>=0&&(Number(state.droneProgress?.[i])||0)<m.objectives[i].goal}
  return m.enemyKind===receipt.enemyKind&&(Number(state.progress?.[m.id])||0)<m.objectives[0].goal;
 }).sort((a,b)=>a.level-b.level);
 const mission=eligible[0];if(!mission)return [];
 let awards=mission.pet?awardBluePetMission(pilot,receipt):mission.skin?awardDroneMission(pilot,receipt):awardPvpMission(pilot,receipt);
 state.exclusiveBosses=Array.isArray(state.exclusiveBosses)?state.exclusiveBosses:[];state.exclusiveBosses.push(receipt.bossId);
 return awards;
}
