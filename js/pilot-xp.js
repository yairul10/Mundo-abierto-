import {pveMultipliers} from './pvp-loadout.js?v=314';
export const pilotXpNeed=level=>100+(level-1)*65+15*Math.max(0,level-10)**2;
export function addPilotXp(pilot,amount){
 pilot.level=Math.max(1,Math.floor(Number(pilot.level)||1));pilot.xp=(Number(pilot.xp)||0)+amount;
 let gained=0;while(pilot.xp>=pilotXpNeed(pilot.level)){pilot.xp-=pilotXpNeed(pilot.level);pilot.level++;gained++;}
 if(!gained)return;
 pilot.maxEnergy=(Number(pilot.maxEnergy)||100)+5*gained;
 if(pilot.shipBaseStats){pilot.shipBaseStats.maxHp+=10*gained;pilot.shipBaseStats.attack+=2*gained;pilot.shipBaseStats.defense+=gained;const t=pveMultipliers(pilot.shipId),formation=pilot.droneFormation==='fortress'?1.15:1;for(const [key,m]of Object.entries({maxHp:t.hp,attack:t.attack,defense:t.defense,speed:t.speed})){const base=pilot.shipBaseStats[key];pilot[key]=base+Math.round(base*(m-1))}pilot.maxHp=Math.round(pilot.maxHp*formation)}else{pilot.maxHp=(Number(pilot.maxHp)||100)+10*gained;pilot.attack=(Number(pilot.attack)||10)+2*gained;pilot.defense=(Number(pilot.defense)||0)+gained}
 pilot.hp=pilot.maxHp;pilot.energy=pilot.maxEnergy;
}
