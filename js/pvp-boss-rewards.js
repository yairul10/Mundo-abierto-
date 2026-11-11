import {recordAction} from './activity-journal.js?v=436';
import {awardPvpMission,settlePvpMissionCores} from './pvp-missions.js?v=350';
import {addPilotXp} from './pilot-xp.js?v=356';
const REWARD_ENEMIES=Object.freeze({colossusPro:'Coloso Pro',granTitanPro:'Gran Titán Pro',infernoPro:'Inferno Pro',nexo:'Titán del Nexo',raider:'Asaltante Pro',sentinel:'Guardián Pro',destroyer:'Destructor Pro',catapult:'Catapulta Pro',harpooner:'Arponero Pro',stalker:'Acechador Pro'});
const REWARD_MATERIALS=Object.freeze({chatarra:'chatarra',aleacion:'aleación',nucleo:'núcleos de energía',reliquia:'componentes ancestrales',nucleoNexo:'núcleos del Nexo'});
function journalReceipt(pilot,r,materials){
 const enemy=REWARD_ENEMIES[r.enemyKind]||'Enemigo cooperativo',xp=Number.isSafeInteger(r.xp)&&r.xp>0&&r.xp<=15000000?r.xp:0;
 const resources=Object.entries(materials).filter(([,value])=>value>0).map(([key,value])=>value.toLocaleString('es')+' '+REWARD_MATERIALS[key]);
 const contribution=Number.isFinite(r.damage)&&Number.isFinite(r.totalDamage)&&r.totalDamage>0?Math.max(0,Math.min(1,r.damage/r.totalDamage)):null;
 const text='Cooperativo · '+enemy+' · +'+r.amount.toLocaleString('es')+' créditos · +'+xp.toLocaleString('es')+' XP'+(resources.length?' · '+resources.join(', '):'')+(contribution===null?'':' · Daño: '+Math.round(contribution*100)+'%');
 recordAction(pilot,'cooperative',text,{sector:'cooperative',enemy:r.enemyKind||null,enemyName:enemy,receiptId:r.id,bossId:r.bossId||null,credits:r.amount,xp,materials,damage:r.damage||0,totalDamage:r.totalDamage||0,contribution});
}
// Persist the credits and receipt IDs together before acknowledging the server.
export function applyBossReceipts(source,receipts){
 const pilot=JSON.parse(JSON.stringify(source)),seen=new Set(Array.isArray(pilot.pvpBossReceipts)?pilot.pvpBossReceipts:[]),ids=[];let added=0,addedXp=0;const missions=[];
 for(const r of Array.isArray(receipts)?receipts:[]){
  if(!r||typeof r.id!=='string'||r.id.length>100||!Number.isSafeInteger(r.amount)||r.amount<0||r.amount>1100000||r.amount===0&&!(Number.isSafeInteger(r.xp)&&r.xp>0&&r.xp<=15000000))continue;
  const materials=r.materials||{};if(typeof materials!=='object'||Array.isArray(materials)||Object.entries(materials).some(([key,value])=>!['chatarra','aleacion','nucleo','reliquia','nucleoNexo'].includes(key)||!Number.isSafeInteger(value)||value<0||value>10000))continue;
  ids.push(r.id);if(seen.has(r.id))continue;seen.add(r.id);for(const mission of awardPvpMission(pilot,r)){added+=mission.reward;addedXp+=mission.xp;missions.push(mission);recordAction(pilot,'mission','Misión cooperativa: '+mission.title+' · +'+mission.reward.toLocaleString('es')+' créditos · +'+mission.xp.toLocaleString('es')+' XP',{sector:'cooperative',mission:mission.id,credits:mission.reward,xp:mission.xp})}added+=r.amount;if(Number.isSafeInteger(r.xp)&&r.xp>0&&r.xp<=15000000)addedXp+=r.xp;for(const [key,value]of Object.entries(materials)){pilot.loot||={};pilot.loot[key]=(Number(pilot.loot[key])||0)+value;}journalReceipt(pilot,r,materials);
 }
 const missionCores=ids.length?settlePvpMissionCores(pilot):0;if(missionCores)recordAction(pilot,'mission','Bonus de misiones cooperativas · +'+missionCores+' núcleos del Nexo',{sector:'cooperative',materials:{nucleoNexo:missionCores}});pilot.gold=(Number.isFinite(pilot.gold)?pilot.gold:0)+added;if(addedXp)addPilotXp(pilot,addedXp);pilot.pvpBossReceipts=[...seen];return {pilot,ids,added,addedXp,missions,missionCores};
}
export function saveBossReceipts(storage,key,source,receipts,serialize=p=>p){
 const result=applyBossReceipts(source,receipts);if(!result.ids.length)return result;
 // A failed write must leave the in-memory pilot unchanged and return no ACK.
 storage.setItem(key,JSON.stringify(serialize(result.pilot)));return result;
}
