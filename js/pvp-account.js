import {isNativePlayGames,playGamesStatus,playGamesSignIn,getPlayGamesServerAuthCode} from './play-games-auth.js';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev';
const CLIENT='430904114567-2s03dmhrv4o4lfp73qal65kseu837035.apps.googleusercontent.com';
let cached=null,expires=0;
export async function pvpAccountToken(){
 if(!isNativePlayGames())throw Error('Para entrar a PvP necesitas Google Play Games en la aplicación Android. Puedes seguir jugando PvE como invitado.');
 if(cached&&Date.now()<expires)return cached;
 let state=await playGamesStatus();if(!state.authenticated)state=await playGamesSignIn();
 if(!state.authenticated)throw Error('Inicia sesión con Google Play para entrar a PvP.');
 const code=await getPlayGamesServerAuthCode(CLIENT);
 const response=await fetch(API+'/v1/play-games/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 if(!response.ok||!data.authenticated||typeof data.sessionToken!=='string')throw Error('No se pudo verificar tu cuenta de Google Play. Reintenta antes de entrar a PvP.');
 cached=data.sessionToken;expires=Date.now()+Math.min(Number(data.expiresIn)||0,3600)*1000-60000;return cached;
}
export function clearPvpAccountToken(){cached=null;expires=0}
