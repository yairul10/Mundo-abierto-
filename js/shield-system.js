// Keep the server mirror byte-identical; shield-system.test.mjs verifies parity.
export const SHIELD_MAX_LEVEL=5;
export const SHIELD_PRICES=Object.freeze([5000,10000,20000,40000,80000]);
export const SHIELD_PER_LEVEL=Object.freeze({aurora:25,agilbasica:25,titan:40,espectro:20,bastion:100,segadora:50,centella:60,egida:120,azote:60,vertigo:75,obsidian:150,adminpod:250});
const finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,finite(n)));
export const shieldLevel=p=>Math.floor(clamp(p?.upgrades?.shieldGenerator??p?.shieldLevel,0,SHIELD_MAX_LEVEL));
export const shieldCapacity=(p,multiplier=1)=>(SHIELD_PER_LEVEL[p?.shipId]??25)*shieldLevel(p)*multiplier;
export function syncShield(p,{pvp=false,fill=false}={}){
 const max=shieldCapacity(p,pvp?20:1),old=Math.max(0,finite(p.maxShield)),ratio=old>0?clamp(p.shield,0,old)/old:0;
 p.maxShield=max;p.shield=fill?max:Math.max(0,Math.min(max,old===max?finite(p.shield):max*ratio));return max;
}
export function applyShieldDamage(p,amount,now){
 const damage=Math.max(0,finite(amount));if(damage<=0||p.hp<=0)return {absorbed:0,hullDamage:0,total:0};
 const max=Math.max(0,finite(p.profile?.maxShield??p.maxShield)),available=clamp(p.shield,0,max),absorbed=Math.min(available,damage),hullDamage=Math.min(Math.max(0,finite(p.hp)),damage-absorbed);
 p.shield=available-absorbed;p.hp=Math.max(0,p.hp-hullDamage);p.shieldLastHit=now;
 return {absorbed,hullDamage,total:absorbed+hullDamage};
}
export function regenerateShield(p,dt,now,bonus=1){
 if(p.hp<=0)return;
 const max=Math.max(0,finite(p.profile?.maxShield??p.maxShield));p.shield=clamp(p.shield,0,max);
 const last=finite(p.shieldLastHit,-1e15),seconds=Math.min(Math.max(0,finite(dt)),Math.max(0,(now-last-5000)/1000));
 p.shield=Math.min(max,p.shield+max*.1*seconds*Math.max(0,finite(bonus,1)));
}
export const shieldUpgradeCost=p=>SHIELD_PRICES[shieldLevel(p)]??null;
export function buyShieldUpgrade(p,{docked=false}={}){
 const cost=shieldUpgradeCost(p);if(!docked||cost===null||!Number.isFinite(Number(p.gold))||p.gold<cost)return false;
 const level=shieldLevel(p);p.gold-=cost;p.upgrades||={};p.upgrades.shieldGenerator=level+1;syncShield(p,{fill:true});return true;
}
