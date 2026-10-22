// Cosmos Legacy cloud-save client. Does not run until configured by the Android boot path.
// A server session is held in memory only. Do not persist OAuth codes or session tokens.
import {playGamesStatus,playGamesSignIn,getPlayGamesServerAuthCode} from './play-games-auth.js';
export const PERSISTENT_FIELDS=Object.freeze(['name','classId','level','xp','gold','loot','ownedShips','shipId','shipSpecializations','shipBaseStats','droneCount','explorerDrone','explorerRangeLevel','repairRobot','repairRobotLevel','upgrades','formations','droneFormation','boosters','quests','pvpBossReceipts','maxHp','maxEnergy','attack','defense','speed']);
const SAVE_KEY='mundoAbierto.player';
function progressOf(save){const result={};for(const key of PERSISTENT_FIELDS)if(Object.hasOwn(save,key))result[key]=save[key];return result}
function localSave(){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return data&&typeof data==='object'&&!Array.isArray(data)?data:null}catch{return null}}
export function createCloudSave({apiUrl,serverClientId,onConflict}={}){
 if(!/^https:\/\//.test(apiUrl||''))throw Error('Cloud save requiere una URL HTTPS');
 let token=null,revision=0,lastSent='',inFlight=false,active=false;
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
  let status=await playGamesStatus();
  if(!status.available)return {status:'unavailable'};
  if(!status.authenticated)status=await playGamesSignIn();
  const code=await getPlayGamesServerAuthCode(serverClientId);
  const identity=await request('/v1/play-games/session',{method:'POST',body:JSON.stringify({code})});
  token=identity.sessionToken;
  const remote=await request('/v1/play-games/save');
  revision=remote.save?.revision??0;
  if(remote.save){
   const local=localSave();
   const cloud=remote.save.progress;
   if(!local){active=false;return {status:'restore_required',cloud,identity}};
   const different=JSON.stringify(progressOf(local))!==JSON.stringify(cloud);
   if(different){active=false;onConflict?.({local:progressOf(local),cloud,identity});return {status:'conflict',identity}}
  }
  if(remote.save)lastSent=JSON.stringify(progressOf(localSave()||{}));
  active=true;
  return {status:'ready',identity};
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
 return {connect,sync,get connected(){return Boolean(token)},get active(){return active}};
}
