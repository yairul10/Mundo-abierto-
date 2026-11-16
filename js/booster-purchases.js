import {DAMAGE_BOOSTERS,PRECISION_BOOSTER} from './damage-boosters.js?v=478';
const DURATIONS=Object.freeze(Object.fromEntries([...DAMAGE_BOOSTERS,PRECISION_BOOSTER].map(b=>[b.id,b.seconds])));
const MAX_PURCHASES=1000000000;
export function boosterPurchaseCounts(raw){
 return Object.fromEntries(Object.keys(DURATIONS).map(id=>[id,Number.isSafeInteger(raw?.[id])&&raw[id]>=0&&raw[id]<=MAX_PURCHASES?raw[id]:0]));
}
export function recordBoosterPurchase(p,id){
 if(!Object.hasOwn(DURATIONS,id))return true;
 const counts=boosterPurchaseCounts(p.boosterPurchases);
 if(counts[id]>=MAX_PURCHASES)return false;
 counts[id]++;p.boosterPurchases=counts;return true;
}
// Purchase counters travel with the saved pilot. Only new purchases add time:
// ordinary progress updates, stale rosters and duplicate messages cannot refill it.
export function syncPurchasedBoosters(p,source){
 const incoming=boosterPurchaseCounts(source.boosterPurchases),seen=boosterPurchaseCounts(p.boosterPurchases);
 const live=p.profile?.boosters,keepLive=!!live&&!p.hangar;
 const boosters={...source.boosters,...(keepLive?live:{})};
 for(const [id,seconds]of Object.entries(DURATIONS)){
  if(keepLive&&incoming[id]>seen[id])boosters[id]=Math.min(86400,Math.max(0,Number(live[id])||0)+(incoming[id]-seen[id])*seconds);
  seen[id]=Math.max(seen[id],incoming[id]);
 }
 p.boosterPurchases=seen;
 return {...source,boosters};
}
