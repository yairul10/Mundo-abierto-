// Apply authenticated account grants to the latest local save; never restore an older cloud payload.
export function applyAccountGrants(storage,grants,key='mundoAbierto.player'){
 if(!Array.isArray(grants)||!grants.includes('obsidian'))return false;
 const raw=storage.getItem(key);if(!raw)return false;
 const save=JSON.parse(raw);if(!save||typeof save!=='object'||Array.isArray(save))return false;
 if(save.ownedShips?.obsidian===true)return false;
 const backup='cosmosLegacy.beforeAccountGrant.v1';storage.setItem(backup,raw);
 if(storage.getItem(backup)!==raw)throw Error('No se pudo respaldar el progreso antes del desbloqueo');
 const updated=JSON.stringify({...save,ownedShips:{...save.ownedShips,obsidian:true}});
 storage.setItem(key,updated);if(storage.getItem(key)!==updated)throw Error('No se pudo guardar el desbloqueo');return true;
}
