// Canonical coefficients in the ship's home environment. Stable IDs preserve saves.
export const FLEET_BALANCE_VERSION=2;
export const HOME_STATS=Object.freeze({
 aurora:[1,1,1,1],agilbasica:[1,1,1,1.5],titan:[1.5,1,1,1],espectro:[1,1.5,1,1],
 bastion:[2,1.5,1,1.5],segadora:[1.5,2,1,1.5],centella:[1.5,1.5,1,2],
 egida:[2.1,1.6,1,1.6],azote:[1.6,2.1,1,1.6],vertigo:[1.6,1.6,1,2.1],
 obsidian:[2.2,2.2,1,2.2],adminpod:[15,1.6,1,1.7]
});
export const PVP_SHIPS=new Set(['egida','azote','vertigo','obsidian']);
const keys=['hp','attack','defense','speed'];
export const roundCoefficient=value=>Math.round((value+Number.EPSILON)*100)/100;
export function fleetMultipliers(id,environment='pve'){
 const stats=HOME_STATS[id]||HOME_STATS.aurora;
 const usesPvpStats=environment==='pvp'||environment==='cooperative'&&id!=='obsidian';
 const away=id!=='adminpod'&&(usesPvpStats!==PVP_SHIPS.has(id));
 return Object.fromEntries(keys.map((key,i)=>[key,key==='defense'?stats[i]:roundCoefficient(stats[i]*(away?.7:1))]));
}
// Only for recovering base stats in older saves that did not store them separately.
export const LEGACY_STATS=Object.freeze({aurora:[1,1,1,1],agilbasica:[.85,1,.75,1.75],titan:[1.8,.85,1.5,.75],espectro:[.7,1.35,.65,1.4],bastion:[2.5,1,2,.85],segadora:[1.1,1.85,.95,1.05],centella:[.95,1.1,.85,1.85],egida:[2.1,.6,1.6,.45],azote:[.7,1.45,.55,.65],vertigo:[.55,.7,.45,1.45],obsidian:[1.9,1.75,1.6,1.2],adminpod:[15,1.6,1,1.7]});
export function savedPveMultipliers(source,id){
 return source.fleetBalanceVersion===FLEET_BALANCE_VERSION?fleetMultipliers(id):Object.fromEntries(keys.map((key,i)=>[key,(LEGACY_STATS[id]||LEGACY_STATS.aurora)[i]]));
}
