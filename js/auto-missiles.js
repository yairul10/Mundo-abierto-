export const AUTO_MISSILE_PRICE=200000;
function change(player,values,persist){
 const previous=Object.fromEntries(Object.keys(values).map(key=>[key,{owned:Object.hasOwn(player,key),value:player[key]}]));
 Object.assign(player,values);
 try{if(persist()!==false)return true}catch{}
 for(const [key,old] of Object.entries(previous)){if(old.owned)player[key]=old.value;else delete player[key]}
 return false;
}
export function buyAutoMissiles(player,persist=()=>true){
 if(player.autoMissilesOwned===true||!Number.isFinite(player.gold)||player.gold<AUTO_MISSILE_PRICE)return false;
 return change(player,{gold:player.gold-AUTO_MISSILE_PRICE,autoMissilesOwned:true,autoMissilesEnabled:true},persist);
}
export function toggleAutoMissiles(player,persist=()=>true){
 if(player.autoMissilesOwned!==true)return false;
 return change(player,{autoMissilesEnabled:player.autoMissilesEnabled!==true},persist);
}
// Called only after a laser shot. Manual missile rules remain authoritative.
export function shouldAutoMissile(player,{target,remaining=0,blocked=false}={}){
 return player.autoMissilesOwned===true&&player.autoMissilesEnabled===true&&!blocked&&remaining<=0&&!!target&&!target.dead&&target.hp>0&&target.mesh?.visible===true;
}
