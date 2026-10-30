// One-time level-60 objectives. Progress comes only from fresh boss receipts.
export const PVP_MISSIONS=Object.freeze([
 {id:'pvp-first-colossus',realm:'pvp',level:60,title:'Desafío PvP · Coloso Pro',reward:100000,xp:30000,enemyKind:'colossusPro',objectives:[{event:'pvpColossus',sector:'pvp',goal:1,label:'Participa en la derrota de un Coloso Pro en el mapa PvP'}]},
 {id:'pvp-first-titan',realm:'pvp',level:60,title:'Desafío PvP · Gran Titán Pro',reward:200000,xp:60000,enemyKind:'granTitanPro',objectives:[{event:'pvpGranTitan',sector:'pvp',goal:1,label:'Participa en la derrota de un Gran Titán Pro en el mapa PvP'}]}
]);
export function awardPvpMission(pilot,receipt){
 const m=PVP_MISSIONS.find(m=>m.enemyKind===receipt.enemyKind);
 if(!m||!(Number(pilot.level)>=m.level)||!Number.isFinite(receipt.damage)||receipt.damage<=0||!Number.isFinite(receipt.totalDamage)||receipt.totalDamage<=0||receipt.damage>receipt.totalDamage||typeof receipt.bossId!=='string'||!receipt.bossId)return null;
 pilot.quests||={};const state=pilot.quests.pvpMissions||={completed:[]};
 state.completed=Array.isArray(state.completed)?state.completed:[];
 if(state.completed.includes(m.id))return null;
 state.completed.push(m.id);return m;
}
