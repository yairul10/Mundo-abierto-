import {activeProfile,playProfile,checkpointProfile} from './account-storage.js?v=344';
import {applyAccountGrants} from './account-grants.js?v=1';
import {isNativePlayGames,playGamesStatus,playGamesSignIn,getPlayGamesServerAuthCode} from './play-games-auth.js';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev';
const CLIENT='430904114567-2s03dmhrv4o4lfp73qal65kseu837035.apps.googleusercontent.com';
let cached=null,expires=0,profile=null,nativeId=null,ignoreReady=false;
export const pvpAccountProfile=()=>profile;
export async function pvpAccountToken(){
 if(!isNativePlayGames())throw Error('Para entrar a PvP necesitas Google Play Games en la aplicación Android. Puedes seguir jugando PvE como invitado.');
 let state=await playGamesStatus();
 if(cached&&Date.now()<expires&&state.authenticated&&(!nativeId||nativeId===state.playerId)){if(window.MUNDO_PLAY_MODE?.mode!=='test'&&activeProfile(localStorage)!==playProfile(profile.playerId))throw Error('La cuenta cambió. Reinicia para cargar su partida.');return cached}
 cached=null;expires=0;if(!state.authenticated)state=await playGamesSignIn();
 if(!state.authenticated)throw Error('Inicia sesión con Google Play para entrar a PvP.');
 const ready=window.cosmosAccountSession?.();
 if(!ignoreReady&&ready&&ready.expiresAt>Date.now()+60000){
  if(window.MUNDO_PLAY_MODE?.mode!=='test'&&(activeProfile(localStorage)!==playProfile(ready.playerId)||(ready.nativeId&&ready.nativeId!==state.playerId)))throw Error('Cambió la cuenta de Google. Reinicia para cargar su partida.');
  const test=window.MUNDO_PLAY_MODE?.mode==='test';if(applyAccountGrants(localStorage,ready.grants,test?'mundoAbierto.qaPlayer':'mundoAbierto.player')&&!test)checkpointProfile(localStorage);
  profile={displayName:ready.displayName||state.displayName||'Piloto',playerId:ready.playerId};nativeId=state.playerId;cached=ready.sessionToken;expires=ready.expiresAt-60000;return cached;
 }
 const code=await getPlayGamesServerAuthCode(CLIENT);
 const response=await fetch(API+'/v1/play-games/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 if(!response.ok||!data.authenticated||typeof data.sessionToken!=='string')throw Error('No se pudo verificar tu cuenta de Google Play. Reintenta antes de entrar a PvP.');
 const test=window.MUNDO_PLAY_MODE?.mode==='test';
 if(!test&&activeProfile(localStorage)!==playProfile(data.playerId))throw Error('Reinicia el juego para preparar la partida de esta cuenta de Google.');
 nativeId=state.playerId;applyAccountGrants(localStorage,data.grants,test?'mundoAbierto.qaPlayer':'mundoAbierto.player');
 profile={displayName:String(data.displayName||state.displayName||'Piloto').trim().slice(0,20),playerId:data.playerId};
 cached=data.sessionToken;expires=Date.now()+Math.min(Number(data.expiresIn)||0,3600)*1000-60000;return cached;
}
export function clearPvpAccountToken(){ignoreReady=true;cached=null;expires=0;profile=null;nativeId=null}
