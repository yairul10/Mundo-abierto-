export const DAMAGE_BOOSTERS=Object.freeze([
 {id:'damage2',name:'Potencia X2',icon:'X2',price:100000,benefit:'Doble daño de láseres de nave y drones',seconds:300,multiplier:2},
 {id:'damage3',name:'Potencia X3',icon:'X3',price:500000,benefit:'Triple daño de láseres de nave y drones',seconds:300,multiplier:3}
]);
export function damageBoosterTimers(raw={}){
 return Object.fromEntries(DAMAGE_BOOSTERS.map(b=>[b.id,Math.max(0,Math.min(86400,Number(raw?.[b.id])||0))]));
}
export function activeDamageBooster(timers){
 return [...DAMAGE_BOOSTERS].reverse().find(b=>Number(timers?.[b.id])>0)||null;
}
export function damageBoosterMultiplier(timers){return activeDamageBooster(timers)?.multiplier||1}
export function tickDamageBoosters(timers,seconds){
 if(!Number.isFinite(seconds)||seconds<=0)return false;
 let remaining=seconds,expired=false;
 for(const booster of [...DAMAGE_BOOSTERS].reverse()){
  const old=Number(timers?.[booster.id])||0;
  if(old<=0||remaining<=0)continue;
  const spent=Math.min(old,remaining);timers[booster.id]=old-spent;remaining-=spent;
  if(!timers[booster.id])expired=true;
 }
 return expired;
}
