export const LASERS=Object.freeze({
 basic:{name:'Láser estándar',price:0,multiplier:1,color:'#70dfff'},
 pulse:{name:'Láser de pulsos',price:25000,multiplier:1.25,color:'#ba97ff'},
 plasma:{name:'Láser de plasma',price:100000,multiplier:1.5,color:'#ffba68'}
});
const quantity=value=>Number.isSafeInteger(value)?Math.max(0,Math.min(10,value)):0;
export function laserLoadout(source={}){
 const raw=source.lasers||{},owned={pulse:quantity(raw.owned?.pulse),plasma:quantity(raw.owned?.plasma)},used={pulse:0,plasma:0};
 function slot(id){
  if(typeof id!=='string'||id==='basic'||!Object.hasOwn(owned,id)||used[id]>=owned[id])return 'basic';
  used[id]++;return id;
 }
 return {owned,ship:Array.from({length:2},(_,i)=>slot(raw.ship?.[i])),drones:Array.from({length:8},(_,i)=>slot(raw.drones?.[i]))};
}
export function normalizeLasers(player){player.lasers=laserLoadout(player)}
export function equippedLaser(player,target,index){
 const id=player.lasers?.[target]?.[index];
 return Object.hasOwn(LASERS,id)?LASERS[id]:LASERS.basic;
}
export function availableLasers(player,id){
 if(id==='basic')return Infinity;
 const loadout=laserLoadout(player);
 return (loadout.owned[id]||0)-[...loadout.ship,...loadout.drones].filter(value=>value===id).length;
}
export function buyLaser(player,id){
 const laser=LASERS[id];
 if(!laser||!laser.price||!Number.isFinite(player.gold)||player.gold<laser.price)return false;
 normalizeLasers(player);
 if(player.lasers.owned[id]>=10)return false;
 player.gold-=laser.price;player.lasers.owned[id]++;return true;
}
export function equipLaser(player,target,index,id){
 const slots=target==='ship'?2:target==='drones'?Math.max(0,Math.min(8,Math.floor(Number(player.droneCount)||0))):0;
 if(!Number.isInteger(index)||index<0||index>=slots||!Object.hasOwn(LASERS,id))return false;
 normalizeLasers(player);
 if(player.lasers[target][index]===id)return false;
 if(availableLasers(player,id)<1)return false;
 player.lasers[target][index]=id;return true;
}
