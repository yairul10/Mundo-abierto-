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

export const PRECISION_BOOSTER=Object.freeze({id:'precision',name:'Precisión PvP',icon:'🎯',price:300000,benefit:'Velocidad de láseres ×3 y misiles ×2',seconds:600});
export function combatBoosterTimers(raw={}){return {...damageBoosterTimers(raw),precision:Math.max(0,Math.min(86400,Number(raw?.precision)||0))}}
export const projectileMultiplier=(timers,missile=false)=>Number(timers?.precision)>0?(missile?2:3):1;
export function tickCombatBoosters(timers,seconds){
 const expired=tickDamageBoosters(timers,seconds);if(!Number.isFinite(seconds)||seconds<=0)return expired;
 if(!timers)return expired;const old=Number(timers.precision)||0;timers.precision=Math.max(0,old-seconds);return expired||old>0&&!timers.precision;
}
