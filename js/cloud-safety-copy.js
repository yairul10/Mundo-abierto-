import {validateProgress} from './cloud-save-client.js?v=483';
import {activeProfile,profileKey,checkpointProfile,WORKING_SAVE} from './account-storage.js?v=344';
export function cloudSafetyCopy(storage,owner=activeProfile(storage)){
 if(!owner?.startsWith('play:'))return null;
 for(const key of [profileKey(owner)+'.beforeCloudRestore','cosmosLegacy.beforeCloudRestore.v1']){
  try{const value=JSON.parse(storage.getItem(key)||'null');if(!value||typeof value.raw!=='string'||value.owner&&value.owner!==owner)continue;
   const progress=JSON.parse(value.raw);validateProgress(progress);return {...value,progress,unassigned:!value.owner,key};
  }catch{}
 }
 return null;
}
export function restoreCloudSafetyCopy(storage,owner,{allowUnassigned=false,expectedRaw}={}){
 if(activeProfile(storage)!==owner)throw Error('Cambió la cuenta. Reinicia antes de recuperar el respaldo.');
 const backup=cloudSafetyCopy(storage,owner);if(!backup)throw Error('No hay una copia anterior disponible para esta cuenta.');
 if(backup.unassigned&&!allowUnassigned)throw Error('Confirma que el respaldo antiguo pertenece a esta cuenta.');
 if(expectedRaw!==undefined&&backup.raw!==expectedRaw)throw Error('El respaldo cambió. Revisa sus datos antes de recuperarlo.');
 const current=checkpointProfile(storage,owner),rescueKey=profileKey(owner)+'.beforeSafetyRecovery';
 const rescue=JSON.stringify({schema:2,owner,createdAt:new Date().toISOString(),raw:current});storage.setItem(rescueKey,rescue);if(storage.getItem(rescueKey)!==rescue)throw Error('No se pudo verificar el respaldo de la partida actual.');
 try{storage.setItem(WORKING_SAVE,backup.raw);if(storage.getItem(WORKING_SAVE)!==backup.raw)throw Error('No se pudo verificar la recuperación.');checkpointProfile(storage,owner)}
 catch(error){try{if(current===null)storage.removeItem(WORKING_SAVE);else storage.setItem(WORKING_SAVE,current);checkpointProfile(storage,owner)}catch{}throw error}
 return backup.progress;
}
