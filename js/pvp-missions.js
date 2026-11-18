// One-time level-60 objectives. Progress comes only from fresh boss receipts.
export const DRONE_MISSION_ID='coop-drone-pearl';
export const DRONE_MISSION=Object.freeze({id:DRONE_MISSION_ID,realm:'pvp',level:100,title:'Diseño de dron · Perla violeta',reward:0,xp:0,cores:0,skin:'pearl',objectives:[{event:'infernoPro',sector:'pvp',goal:50,label:'Derrota 50 Infernos Pro'},{event:'granTitanPro',sector:'pvp',goal:40,label:'Derrota 40 Grandes Titanes Pro'}]});
export const PET_BLUE_MISSION=Object.freeze({id:'pet-blue-nexus',realm:'pvp',level:110,title:'Mascota azul · Recolección',reward:0,xp:0,cores:0,petVariant:'blue',enemyKind:'nexo',objectives:[{event:'nexo',sector:'pvp',goal:20,label:'Participa en la derrota de 20 Titanes del Nexo'}]});
export const PET_RED_MISSION=Object.freeze({id:'pet-red-nexus',realm:'pvp',level:115,title:'Mascota roja · Combate',reward:0,xp:0,cores:0,petVariant:'red',enemyKind:'nexo',objectives:[{event:'nexo',sector:'pvp',goal:20,label:'Participa en la derrota de 20 Titanes del Nexo'}]});
export const PVP_MISSIONS=Object.freeze([
 DRONE_MISSION,
 PET_BLUE_MISSION,
 PET_RED_MISSION,
 {id:'pvp-first-colossus',realm:'pvp',level:60,title:'Desafío cooperativo · Coloso Pro',reward:100000,xp:30000,cores:1,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:1,label:'Participa en la derrota de un Coloso Pro en el mapa Cooperativo'}]},
 {id:'pvp-first-titan',realm:'pvp',level:60,title:'Desafío cooperativo · Gran Titán Pro',reward:200000,xp:60000,cores:1,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:1,label:'Participa en la derrota de un Gran Titán Pro en el mapa Cooperativo'}]},
 {id:'pvp-five-colossi',realm:'pvp',level:60,title:'Cazador cooperativo · 5 Colosos Pro',reward:0,xp:0,cores:3,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Colosos Pro en el mapa Cooperativo'}]},
 {id:'pvp-five-titans',realm:'pvp',level:60,title:'Cazador cooperativo · 5 Grandes Titanes Pro',reward:0,xp:0,cores:3,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:5,label:'Participa en la derrota de 5 Grandes Titanes Pro en el mapa Cooperativo'}]}
]);
// A cooperative boss receipt advances only the mission selected by this pilot.
export function awardPvpMission(pilot,receipt){
 const id=pilot.quests?.board?.activeMission,m=PVP_MISSIONS.find(x=>x.id===id);
 if(!m||Number(pilot.level)<m.level||!receipt||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage||typeof receipt.bossId!=='string'||!receipt.bossId)return [];
 const index=m.objectives.findIndex(o=>(m.enemyKind||o.event)===receipt.enemyKind);if(index<0)return [];
 const state=pilot.quests.pvpMissions||={completed:[]};state.completed=Array.isArray(state.completed)?state.completed:[];if(state.completed.includes(id))return [];
 state.bosses=Array.isArray(state.bosses)?state.bosses:[];state.droneBosses=Array.isArray(state.droneBosses)?state.droneBosses:[];state.countedBosses=Array.isArray(state.countedBosses)?state.countedBosses:[];
 if(state.bosses.includes(receipt.bossId)||state.droneBosses.includes(receipt.bossId)||state.countedBosses.includes(receipt.bossId))return [];
 state.countedBosses.push(receipt.bossId);state.progress=state.progress&&typeof state.progress==='object'?state.progress:{};
 const values=m.skin?(Array.isArray(state.droneProgress)?state.droneProgress:[]):[Number(state.progress[id])||0];
 const progress=m.objectives.map((o,i)=>Math.min(o.goal,Math.max(0,Math.floor(Number(values[i])||0))));progress[index]=Math.min(m.objectives[index].goal,progress[index]+1);
 if(m.skin)state.droneProgress=progress;else state.progress[id]=progress[0];
 if(m.objectives.every((o,i)=>progress[i]>=o.goal)){state.completed.push(id);pilot.quests.board.activeMission=null;return [m]}return [];
}
export function settlePvpMissionCores(pilot){
 const state=pilot.quests?.pvpMissions;if(!state||!Array.isArray(state.completed))return 0;
 const claimed=new Set(Array.isArray(state.coreRewards)?state.coreRewards:[]);let added=0;
 for(const m of PVP_MISSIONS)if(state.completed?.includes(m.id)&&!claimed.has(m.id)){added+=m.cores;claimed.add(m.id)}
 if(added){pilot.loot||={};pilot.loot.nucleoNexo=(Number(pilot.loot.nucleoNexo)||0)+added;state.coreRewards=[...claimed]}
 return added;
}
export function missionPrize(m){return [m.skin&&'Diseño de dron Perla violeta · +30 % de daño de drones de apoyo',m.petVariant==='blue'&&'Mascota azul · +50 % de alcance de recolección',m.petVariant==='red'&&'Mascota roja · doble daño de mascota',m.reward&&m.reward.toLocaleString('es')+' créditos',m.xp&&m.xp.toLocaleString('es')+' XP',m.cores&&m.cores+' núcleo'+(m.cores===1?'':'s')+' del Nexo'].filter(Boolean).join(' · ')}


