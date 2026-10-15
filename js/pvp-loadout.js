import {ASSEMBLED_SHIPS} from './assembled-ships.js?v=210';
const SHIPS={aurora:{hp:1,attack:1,defense:1,speed:1},titan:{hp:1.8,attack:.85,defense:1.5,speed:.75},espectro:{hp:.7,attack:1.35,defense:.65,speed:1.4},...ASSEMBLED_SHIPS};
const number=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
export function readOfflinePilot(storage){try{const key=storage.getItem('mundoAbierto.qaActive')==='1'?'mundoAbierto.qaPlayer':'mundoAbierto.player';return JSON.parse(storage.getItem(key)||'{}')||{}}catch{return {}}}
export function offlineRoster(source={}){
 const owned=Object.keys(SHIPS).filter(id=>id==='aurora'||source.ownedShips?.[id]===true),selected=owned.includes(source.shipId)?source.shipId:'aurora';
 const formation=Number(source.droneCount)>0&&source.formations?.[source.droneFormation]===true?source.droneFormation:'fan',hpFactor=formation==='fortress'?1.15:1;
 const base=source.shipBaseStats||Object.fromEntries(['maxHp','attack','defense','speed'].map((key,i)=>{const mult=SHIPS[selected][['hp','attack','defense','speed'][i]],fallback=[100,10,5,220][i];return [key,Math.max(key==='defense'?0:1,Math.round(number(source[key],fallback)/(key==='maxHp'?hpFactor:1)/mult))]}));
 const profiles=Object.fromEntries(owned.map(id=>{const ship=SHIPS[id],stat=(key,mult,fallback)=>{const b=number(base[key],fallback);return b+Math.round(b*(mult-1))};const maxHp=Math.round(stat('maxHp',ship.hp,100)*hpFactor);return [id,{shipId:id,maxHp,hp:maxHp,maxEnergy:number(source.maxEnergy,100),energy:number(source.maxEnergy,100),attack:stat('attack',ship.attack,10),defense:stat('defense',ship.defense,5),speed:stat('speed',ship.speed,220),level:number(source.level,1),droneCount:source.droneCount||0,droneFormation:formation,explorerDrone:!!source.explorerDrone,explorerRangeLevel:source.explorerRangeLevel||1,repairRobot:!!source.repairRobot,repairRobotLevel:source.repairRobotLevel||0,upgrades:source.upgrades||{},shipSpecializations:{[id]:source.shipSpecializations?.[id]||{}},boosters:{damage:source.boosters?.damage>0,resistance:source.boosters?.resistance>0}}]}));
 return {selected,profiles,base};
}
export function initialPvpPilot(source={}){
 const copy=JSON.parse(JSON.stringify(source)),roster=offlineRoster(copy),q=roster.profiles[roster.selected];
 return {...copy,...q,name:copy.name||'Invitado',shipId:roster.selected,x:0,y:0,z:120,quests:{},shipBaseStats:roster.base,ownedShips:Object.fromEntries(Object.keys(roster.profiles).map(id=>[id,true])),shipSpecializations:copy.shipSpecializations||{},formations:copy.formations||{fan:true},droneFormation:q.droneFormation,boosters:{},loot:copy.loot||{},gold:copy.gold||0,xp:copy.xp||0};
}
