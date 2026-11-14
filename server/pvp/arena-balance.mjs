// Applied only to arena entrants, after ordinary cooperative profiles are derived.
export function applyArenaHull(p){
 if(!p.profile||p.profile.arenaHullMultiplier===2)return;
 p.profile.maxHp*=2;p.hp*=2;p.profile.hp=p.hp;p.profile.arenaHullMultiplier=2;
}
export const practiceDamageScale=p=>p?.isBot?.8:1;
