// Cosmetic companion and its specialization are independent from the eight support drones.
export const PET_VARIANTS=Object.freeze({normal:{name:'Obsidiana',file:'pet-obsidian.glb',benefit:'Daño y recolección normales'},blue:{name:'Azul · Recolección',file:'pet-blue.glb',benefit:'+50 % de alcance de recolección',mission:'pet-blue-nexus'},red:{name:'Roja · Combate',file:'pet-red.glb',benefit:'Doble daño de la mascota',mission:'pet-red-nexus'}});
export function petVariantUnlocked(pilot,id){const entry=PET_VARIANTS[id];return !!entry&&(!entry.mission||Array.isArray(pilot?.quests?.pvpMissions?.completed)&&pilot.quests.pvpMissions.completed.includes(entry.mission));}
export function selectedPetVariant(pilot){const id=pilot?.quests?.petVariant;return pilot?.explorerDrone&&petVariantUnlocked(pilot,id)?id:'normal';}
export const petRangeMultiplier=id=>id==='blue'?1.5:1;
export const petDamageMultiplier=id=>id==='red'?2:1;

export const petBaseRange=level=>450+Math.max(1,Math.min(10,Math.floor(Number(level)||1)))*100;
export const petCollectionRange=(level,id)=>petBaseRange(level)*petRangeMultiplier(id);
