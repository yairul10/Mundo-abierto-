export const LASER_BASE_SPEED=4000;
export const LASER_LEVEL_STEP=440;
export const LASER_MAX_LEVEL=5;
export function laserLevel(player){const n=Number(player?.upgrades?.laserSpeed);return Number.isFinite(n)?Math.max(0,Math.min(LASER_MAX_LEVEL,Math.floor(n))):0}
export const laserSpeed=player=>LASER_BASE_SPEED+LASER_LEVEL_STEP*laserLevel(player);
export function laserUpgradeCost(player){const level=laserLevel(player);return level>=LASER_MAX_LEVEL?null:{credits:[100000,200000,400000,800000,1500000][level],nuclei:5*2**level}}
export function buyLaserUpgrade(player,{isPvpBase=false,isDocked=false}={}){
 const cost=laserUpgradeCost(player);
 if(!isPvpBase||!isDocked||!cost||!Number.isFinite(Number(player.gold))||Number(player.gold)<cost.credits||!Number.isFinite(Number(player.loot?.nucleoNexo))||Number(player.loot.nucleoNexo)<cost.nuclei)return false;
 const level=laserLevel(player);player.gold-=cost.credits;player.loot.nucleoNexo-=cost.nuclei;player.upgrades||={};player.upgrades.laserSpeed=level+1;return true;
}
