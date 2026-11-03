import {shieldCapacity,shieldLevel} from './shield-system.js?v=364';
import {fleetMultipliers,savedPveMultipliers,FLEET_BALANCE_VERSION} from './fleet-balance.js?v=355';
import {ASSEMBLED_SHIPS} from './assembled-ships.js?v=358';
const SHIPS=Object.fromEntries(['agilbasica','aurora','titan','espectro',...Object.keys(ASSEMBLED_SHIPS)].map(id=>[id,{...ASSEMBLED_SHIPS[id]}]));
const number=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
export function readOfflinePilot(storage){try{const test=typeof window!=='undefined'&&window.MUNDO_PLAY_MODE?window.MUNDO_PLAY_MODE.mode==='test':storage.getItem('mundoAbierto.qaActive')==='1';const key=test?'mundoAbierto.qaPlayer':'mundoAbierto.player';return JSON.parse(storage.getItem(key)||'{}')||{}}catch{return {}}}
export function offlineRoster(source={}){
 const owned=Object.keys(SHIPS).filter(id=>id==='aurora'||source.ownedShips?.[id]===true),selected=owned.includes(source.shipId)?source.shipId:'aurora';
 const formation=Number(source.droneCount)>0&&source.formations?.[source.droneFormation]===true?source.droneFormation:'fan',hpFactor=formation==='fortress'?1.15:1;
 const base=source.shipBaseStats||Object.fromEntries(['maxHp','attack','defense','speed'].map((key,i)=>{const mult=savedPveMultipliers(source,selected)[['hp','attack','defense','speed'][i]],fallback=[100,10,5,220][i];return [key,Math.max(key==='defense'?0:1,Math.round(number(source[key],fallback)/(key==='maxHp'?hpFactor:1)/mult))]}));
 const profiles=Object.fromEntries(owned.map(id=>{const ship=pveMultipliers(id),stat=(key,mult,fallback)=>{const b=number(base[key],fallback);return b+Math.round(b*(mult-1))};const maxHp=Math.round(stat('maxHp',ship.hp,100)*hpFactor);return [id,{shieldLevel:shieldLevel(source),maxShield:shieldCapacity({...source,shipId:id}),shield:(source.maxShield>0?Math.max(0,Math.min(1,(Number(source.shield)||0)/source.maxShield)):0)*shieldCapacity({...source,shipId:id}),shipId:id,fleetBalanceVersion:FLEET_BALANCE_VERSION,maxHp,hp:maxHp,maxEnergy:number(source.maxEnergy,100),energy:number(source.maxEnergy,100),attack:stat('attack',ship.attack,10),defense:stat('defense',ship.defense,5),speed:stat('speed',ship.speed,220),level:number(source.level,1),droneCount:source.droneCount||0,ownedFormations:Object.keys(source.formations||{fan:true}).filter(id=>id==='fan'||source.formations[id]===true),droneFormation:formation,explorerDrone:!!source.explorerDrone,explorerRangeLevel:source.explorerRangeLevel||1,repairRobot:!!source.repairRobot,repairRobotLevel:source.repairRobotLevel||0,upgrades:source.upgrades||{},shipSpecializations:{[id]:source.shipSpecializations?.[id]||{}},boosters:{damage:source.boosters?.damage>0,resistance:source.boosters?.resistance>0}}]}));
 return {selected,profiles,base};
}
export function initialPvpPilot(source={}){
 const copy=JSON.parse(JSON.stringify(source)),roster=offlineRoster(copy),q=roster.profiles[roster.selected];
 return {...copy,...q,fleetBalanceVersion:FLEET_BALANCE_VERSION,name:copy.name||'Invitado',shipId:roster.selected,x:0,y:0,z:120,quests:{},shipBaseStats:roster.base,ownedShips:Object.fromEntries(Object.keys(roster.profiles).map(id=>[id,true])),shipSpecializations:copy.shipSpecializations||{},formations:copy.formations||{fan:true},droneFormation:q.droneFormation,boosters:{},loot:copy.loot||{},gold:copy.gold||0,xp:copy.xp||0};
}

// Build a transient arena roster from saved base stats; never persist arena modifiers.
export function pvpMultipliers(id){return fleetMultipliers(id,'pvp')}

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
export function pveMultipliers(id){return fleetMultipliers(id,'pve')}


