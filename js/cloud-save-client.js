// Cosmos Legacy cloud-save client. Does not run until configured by the Android boot path.
// A server session is held in memory only. Do not persist OAuth codes or session tokens.
import {playGamesStatus,playGamesSignIn,getPlayGamesServerAuthCode} from './play-games-auth.js';
export const PERSISTENT_FIELDS=Object.freeze(['name','classId','level','xp','gold','loot','ownedShips','shipId','shipSpecializations','shipBaseStats','droneCount','explorerDrone','explorerRangeLevel','repairRobot','repairRobotLevel','upgrades','formations','droneFormation','boosters','quests','pvpBossReceipts','maxHp','maxEnergy','attack','defense','speed']);
const SAVE_KEY='mundoAbierto.player';
function progressOf(save){const result={};for(const key of PERSISTENT_FIELDS)if(Object.hasOwn(save,key))result[key]=save[key];return result}
function localSave(){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return data&&typeof data==='object'&&!Array.isArray(data)?data:null}catch{return null}}
export function createCloudSave({apiUrl,serverClientId,onConflict}={}){
 if(!/^https:\/\//.test(apiUrl||''))throw Error('Cloud save requiere una URL HTTPS');
 let token=null,revision=0,lastSent='',inFlight=false,active=false,pending=null;
 const endpoint=apiUrl.replace(/\/$/,'');
 async function request(path,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(endpoint+path,{...options,signal:controller.signal,cache:'no-store',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...options.headers}});
   const data=await response.json();
   if(!response.ok)throw Object.assign(Error(data.error||'HTTP '+response.status),{status:response.status,data});
   return data;
  }finally{clearTimeout(timer)}
 }
 async function connect(){
  active=false;token=null;pending=null;
  let status=await playGamesStatus();
  if(!status.available)return {status:'unavailable'};
  if(!status.authenticated)status=await playGamesSignIn();
  const code=await getPlayGamesServerAuthCode(serverClientId);
  const identity=await request('/v1/play-games/session',{method:'POST',body:JSON.stringify({code})});
  if(!identity.authenticated||typeof identity.sessionToken!=='string'||!identity.sessionToken)throw Error('Sesión de Google Play inválida');
  token=identity.sessionToken;
  const remote=await request('/v1/play-games/save');
  revision=remote.save?.revision??0;
  if(!Number.isSafeInteger(revision)||revision<0)throw Error('Revisión de nube inválida');
  if(remote.save){
   const local=localSave();
   const cloud=remote.save.progress;
   validateProgress(cloud);
   pending={cloud,identity};
   if(!local){active=false;return {status:'restore_required',cloud,identity}};
   const different=JSON.stringify(progressOf(local))!==JSON.stringify(cloud);
   if(different){active=false;onConflict?.({local:progressOf(local),cloud,identity});return {status:'conflict',local:progressOf(local),cloud,identity}}
  }
  if(remote.save)lastSent=JSON.stringify(progressOf(localSave()||{}));
  active=true;
  return {status:'ready',identity};
 }
 function resolveConflict(choice){
  if(!pending)throw Error('No hay una partida nube pendiente');
  if(!['cloud','local'].includes(choice))throw Error('Elección de partida inválida');
  if(choice==='cloud'){
   const raw=localStorage.getItem(SAVE_KEY);
   // Preserve an exact, verified safety copy before replacing local progress.
   if(raw!==null){
    const snapshot=JSON.stringify({schema:1,createdAt:new Date().toISOString(),raw});
    localStorage.setItem('cosmosLegacy.beforeCloudRestore.v1',snapshot);
    if(localStorage.getItem('cosmosLegacy.beforeCloudRestore.v1')!==snapshot)throw Error('No se pudo verificar el respaldo local');
   }
   const progress=progressOf(pending.cloud);
   // Temporary world/boss state belongs to the device. Restore at the safe Aurora spawn.
   const restored={...progress,x:0,y:0,z:0,yaw:0,pitch:0,sector:'aurora',hp:progress.maxHp,energy:progress.maxEnergy};
   const serialized=JSON.stringify(restored);
   try{localStorage.setItem(SAVE_KEY,serialized);if(localStorage.getItem(SAVE_KEY)!==serialized)throw Error('No se pudo verificar la restauración')}
   catch(error){try{if(raw===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,raw)}catch{}throw error}
   lastSent=JSON.stringify(progress);
  }else{
   if(!localSave())throw Error('No hay partida local para conservar');
   lastSent='';
  }
  pending=null;active=true;return {status:'ready'};
 }
 async function sync(){
  if(!active||!token||inFlight)return {status:'paused'};
  const local=localSave();if(!local)return {status:'no_save'};
  const progress=progressOf(local),serialized=JSON.stringify(progress);
  if(serialized===lastSent)return {status:'unchanged'};
  inFlight=true;
  try{
   const result=await request('/v1/play-games/save',{method:'PUT',body:JSON.stringify({revision,progress})});
   revision=result.revision;lastSent=serialized;return {status:'stored',revision};
  }catch(e){if(e.status===409||e.status===401){active=false;onConflict?.({reason:e.message});}throw e}
  finally{inFlight=false}
 }
 return {connect,sync,resolveConflict,get connected(){return Boolean(token)},get active(){return active}};
}
export function validateProgress(progress){
 if(!progress||typeof progress!=='object'||Array.isArray(progress))throw Error('Copia nube inválida');
 for(const key of ['level','xp','gold','maxHp','maxEnergy','attack','defense','speed']){
  if(typeof progress[key]!=='number'||!Number.isFinite(progress[key])||progress[key]<0)throw Error('Copia nube incompleta: '+key);
 }
 if(!Number.isInteger(progress.level)||progress.level<1||progress.maxHp<=0||progress.maxEnergy<=0)throw Error('Estadísticas de nube inválidas');
 if(!progress.quests||typeof progress.quests!=='object'||Array.isArray(progress.quests))throw Error('Misiones de nube inválidas');
 return progress;
}

