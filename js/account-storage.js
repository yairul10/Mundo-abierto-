// The legacy working key remains compatible with the game; each owner has a
// separate durable slot. Switching is journaled and always checkpoints first.
export const WORKING_SAVE='mundoAbierto.player';
export const ACTIVE_PROFILE='cosmosLegacy.activeProfile.v2';
const GUEST='cosmosLegacy.guestProfile.v2',PREFIX='cosmosLegacy.profile.v2.',JOURNAL='cosmosLegacy.profileSwitch.v2',LEGACY='cosmosLegacy.unassignedProgress.v2';
const valid=owner=>typeof owner==='string'&&/^(guest|play):[A-Za-z0-9_-]{1,256}$/.test(owner);
const json=(storage,key,fallback=null)=>{const raw=storage.getItem(key);if(raw===null)return fallback;try{return JSON.parse(raw)}catch{throw Error('No se pudo leer el respaldo local: '+key)}};
export function checkedWrite(storage,key,value){storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error('No se pudo verificar el guardado local')}
export const profileKey=owner=>{if(!valid(owner))throw Error('Identidad local inválida');return PREFIX+owner};
export const activeProfile=storage=>{const owner=storage.getItem(ACTIVE_PROFILE);return valid(owner)?owner:null};
export const playProfile=id=>{const owner='play:'+id;profileKey(owner);return owner};
export const profileMeta=(storage,owner)=>json(storage,profileKey(owner)+'.meta',{});
export function setProfileMeta(storage,owner,patch){const value={...profileMeta(storage,owner),...patch};checkedWrite(storage,profileKey(owner)+'.meta',JSON.stringify(value));return value}
export function checkpointProfile(storage,expected=activeProfile(storage)){
 const owner=activeProfile(storage);if(!owner||owner!==expected)throw Error('La cuenta cambió. Reinicia para abrir su partida.');
 const raw=storage.getItem(WORKING_SAVE);if(raw!==null)checkedWrite(storage,profileKey(owner),raw);return raw;
}
function restoreJournal(storage){const j=json(storage,JOURNAL);if(!j)return;if(!valid(j.owner))throw Error('Respaldo de cambio de cuenta inválido');if(j.raw===null)storage.removeItem(WORKING_SAVE);else checkedWrite(storage,WORKING_SAVE,j.raw);checkedWrite(storage,ACTIVE_PROFILE,j.owner);storage.removeItem(JOURNAL)}
export function ensureProfiles(storage){
 restoreJournal(storage);let owner=activeProfile(storage);
 if(!owner){
  const raw=storage.getItem(WORKING_SAVE);if(raw!==null&&storage.getItem(LEGACY)===null)checkedWrite(storage,LEGACY,JSON.stringify({createdAt:Date.now(),raw}));
  let guest=storage.getItem(GUEST);if(!valid(guest)||!guest.startsWith('guest:')){guest='guest:'+crypto.randomUUID();checkedWrite(storage,GUEST,guest)}
  checkedWrite(storage,ACTIVE_PROFILE,guest);owner=guest;
  setProfileMeta(storage,owner,{kind:'guest',displayName:'Invitado',unassignedLegacy:raw!==null});
 }
 const guest=storage.getItem(GUEST);
 if(owner.startsWith('play:')&&profileMeta(storage,owner).linkedGuest===guest){
  // A linked guest becomes a backup, never a reusable unowned inventory.
  const fresh='guest:'+crypto.randomUUID();setProfileMeta(storage,fresh,{kind:'guest',displayName:'Invitado'});checkedWrite(storage,GUEST,fresh);
 }
 checkpointProfile(storage,owner);return owner;
}
export function switchProfile(storage,target,{raw=undefined,meta={}}={}){
 profileKey(target);const previous=ensureProfiles(storage),oldRaw=checkpointProfile(storage,previous),next=raw===undefined?storage.getItem(profileKey(target)):raw;
 // Copy imports to their own slot before exposing them as the active game.
 if(next!==null)checkedWrite(storage,profileKey(target),next);
 setProfileMeta(storage,target,meta);checkedWrite(storage,JOURNAL,JSON.stringify({owner:previous,raw:oldRaw,target}));
 try{if(next===null)storage.removeItem(WORKING_SAVE);else checkedWrite(storage,WORKING_SAVE,next);checkedWrite(storage,ACTIVE_PROFILE,target);storage.removeItem(JOURNAL)}
 catch(error){try{restoreJournal(storage)}catch{}throw error}
 return target;
}
export function guestProfile(storage){ensureProfiles(storage);return storage.getItem(GUEST)}
export function newGuestProfile(storage){
 ensureProfiles(storage);const owner='guest:'+crypto.randomUUID();switchProfile(storage,owner,{raw:null,meta:{kind:'guest',displayName:'Invitado'}});checkedWrite(storage,GUEST,owner);return owner;
}
export function bindGuestProfile(storage,identity){
 const owner=ensureProfiles(storage);if(!owner.startsWith('guest:'))throw Error('Solo una partida de invitado puede vincularse a otra cuenta');
 const raw=checkpointProfile(storage,owner),target=playProfile(identity.playerId);
 const previous=storage.getItem(profileKey(target));if(previous!==null)checkedWrite(storage,profileKey(target)+'.beforeGuestImport.'+crypto.randomUUID(),previous);
 switchProfile(storage,target,{raw,meta:{kind:'play',playerId:identity.playerId,displayName:identity.displayName||'Cuenta de Google',nativeId:identity.nativeId||null,linkedGuest:owner}});ensureProfiles(storage);return target;
}
export function storedProgress(storage,owner){const raw=storage.getItem(profileKey(owner));if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
