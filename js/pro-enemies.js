// One optional, neutral elite per normal enemy type and sector. Bosses are unchanged.
export const PRO_TYPES_BY_SECTOR=Object.freeze({aurora:['scout','raider'],belt:['sentinel','destroyer'],ember:['destroyer','devastator'],graveyard:['catapult','harpooner','stalker']});
export const proMultiplier=enemy=>enemy?.pro?2:1;
export const farmEnemyKey=enemy=>enemy.type+(enemy.pro?'Pro':'');
export const proPopulation=()=>Object.entries(PRO_TYPES_BY_SECTOR).flatMap(([proSector,types])=>types.map(type=>({type,pro:true,proSector})));
export function addProFarmChoices(maps){for(const [sector,types]of Object.entries(PRO_TYPES_BY_SECTOR))for(const type of types)maps[sector].enemies[type+'Pro']=maps[sector].enemies[type]+' Pro';return maps}
