async function nativeCall(promise,timeout=8000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Google Play no respondió a tiempo. Tu partida local se conserva.')),timeout)})])}finally{clearTimeout(timer)}}
// Google Play Games: estado y autorización para el servidor.
// El código de autorización es de un solo uso y nunca se almacena en localStorage.
const plugin=()=>globalThis.Capacitor?.Plugins?.CosmosPlayGames;
export const isNativePlayGames=()=>Boolean(plugin());
export async function playGamesStatus(){
 const p=plugin();
 if(!p)return {available:false,authenticated:false};
 const state=await nativeCall(p.status(),3000);
 return {available:true,authenticated:!!state.authenticated,playerId:state.playerId||null,displayName:state.displayName||null};
}
export async function playGamesSignIn(){
 const p=plugin();if(!p)throw new Error('Google Play Games solo está disponible en la aplicación Android');
 const result=await nativeCall(p.signIn(),60000);
 if(!result.authenticated)throw new Error('El jugador no autorizó Google Play Games');
 return playGamesStatus();
}
export async function getPlayGamesServerAuthCode(serverClientId){
 const p=plugin();if(!p)throw new Error('Google Play Games no disponible');
 if(!serverClientId||!serverClientId.endsWith('.apps.googleusercontent.com'))throw new Error('Configurar el ID OAuth del servidor');
 const result=await nativeCall(p.serverAuthCode({serverClientId}));
 if(!result.code)throw new Error('No se recibió autorización de Google');
 return result.code;
}
