import {ASSEMBLED_SHIPS} from './assembled-ships.js?v=337';
const SHIPS={aurora:{hp:1,attack:1,defense:1,speed:1},titan:{hp:1.8,attack:.85,defense:1.5,speed:.75},espectro:{hp:.7,attack:1.35,defense:.65,speed:1.4},...ASSEMBLED_SHIPS};
const number=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
export function readOfflinePilot(storage){try{const test=typeof window!=='undefined'&&window.MUNDO_PLAY_MODE?window.MUNDO_PLAY_MODE.mode==='test':storage.getItem('mundoAbierto.qaActive')==='1';const key=test?'mundoAbierto.qaPlayer':'mundoAbierto.player';return JSON.parse(storage.getItem(key)||'{}')||{}}catch{return {}}}
export function offlineRoster(source={}){
 const owned=Object.keys(SHIPS).filter(id=>id==='aurora'||source.ownedShips?.[id]===true),selected=owned.includes(source.shipId)?source.shipId:'aurora';
 const formation=Number(source.droneCount)>0&&source.formations?.[source.droneFormation]===true?source.droneFormation:'fan',hpFactor=formation==='fortress'?1.15:1;
 const base=source.shipBaseStats||Object.fromEntries(['maxHp','attack','defense','speed'].map((key,i)=>{const mult=pveMultipliers(selected)[['hp','attack','defense','speed'][i]],fallback=[100,10,5,220][i];return [key,Math.max(key==='defense'?0:1,Math.round(number(source[key],fallback)/(key==='maxHp'?hpFactor:1)/mult))]}));
 const profiles=Object.fromEntries(owned.map(id=>{const ship=pveMultipliers(id),stat=(key,mult,fallback)=>{const b=number(base[key],fallback);return b+Math.round(b*(mult-1))};const maxHp=Math.round(stat('maxHp',ship.hp,100)*hpFactor);return [id,{shipId:id,maxHp,hp:maxHp,maxEnergy:number(source.maxEnergy,100),energy:number(source.maxEnergy,100),attack:stat('attack',ship.attack,10),defense:stat('defense',ship.defense,5),speed:stat('speed',ship.speed,220),level:number(source.level,1),droneCount:source.droneCount||0,ownedFormations:Object.keys(source.formations||{fan:true}).filter(id=>id==='fan'||source.formations[id]===true),droneFormation:formation,explorerDrone:!!source.explorerDrone,explorerRangeLevel:source.explorerRangeLevel||1,repairRobot:!!source.repairRobot,repairRobotLevel:source.repairRobotLevel||0,upgrades:source.upgrades||{},shipSpecializations:{[id]:source.shipSpecializations?.[id]||{}},boosters:{damage:source.boosters?.damage>0,resistance:source.boosters?.resistance>0}}]}));
 return {selected,profiles,base};
}
export function initialPvpPilot(source={}){
 const copy=JSON.parse(JSON.stringify(source)),roster=offlineRoster(copy),q=roster.profiles[roster.selected];
 return {...copy,...q,name:copy.name||'Invitado',shipId:roster.selected,x:0,y:0,z:120,quests:{},shipBaseStats:roster.base,ownedShips:Object.fromEntries(Object.keys(roster.profiles).map(id=>[id,true])),shipSpecializations:copy.shipSpecializations||{},formations:copy.formations||{fan:true},droneFormation:q.droneFormation,boosters:{},loot:copy.loot||{},gold:copy.gold||0,xp:copy.xp||0};
}

// Build a transient arena roster from saved base stats; never persist arena modifiers.
export function pvpMultipliers(id){
 const ship=SHIPS[id]||SHIPS.aurora,offset=ship.adminOnly||ship.pvePenalty?0:id==='obsidian'?.5:-.5;
 return Object.fromEntries(['hp','attack','defense','speed'].map(key=>[key,Number((ship[key]+offset).toFixed(2))]));
}
export function pvpRoster(source={}){
 const roster=offlineRoster(source);
 for(const [id,q]of Object.entries(roster.profiles)){
  const ship=pvpMultipliers(id),formation=q.droneFormation==='fortress'?1.15:1;
  for(const [key,mult]of Object.entries({maxHp:ship.hp,attack:ship.attack,defense:ship.defense,speed:ship.speed})){
   const base=Number(roster.base[key])||0;q[key]=Math.max(key==='defense'?0:1,base+Math.round(base*(mult-1)));
  }
  q.maxHp=Math.round(q.maxHp*formation);q.hp=q.maxHp;
 }
 return roster;
}

// Permanent saves carry PvE stats; arena values are always rebuilt from base stats.
export function pveMultipliers(id){
 const ship=SHIPS[id]||SHIPS.aurora;
 return Object.fromEntries(['hp','attack','defense','speed'].map(key=>[key,Number((ship[key]-(ship.pvePenalty||0)).toFixed(2))]));
}
