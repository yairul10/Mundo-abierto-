// Google Play Games: estado y autorización para el servidor.
// El código de autorización es de un solo uso y nunca se almacena en localStorage.
const plugin=()=>globalThis.Capacitor?.Plugins?.CosmosPlayGames;
export const isNativePlayGames=()=>Boolean(plugin());
export async function playGamesStatus(){
 const p=plugin();
 if(!p)return {available:false,authenticated:false};
 const state=await p.status();
 return {available:true,authenticated:!!state.authenticated,playerId:state.playerId||null,displayName:state.displayName||null};
}
export async function playGamesSignIn(){
 const p=plugin();if(!p)throw new Error('Google Play Games solo está disponible en la aplicación Android');
 const result=await p.signIn();
 if(!result.authenticated)throw new Error('El jugador no autorizó Google Play Games');
 return playGamesStatus();
}
export async function getPlayGamesServerAuthCode(serverClientId){
 const p=plugin();if(!p)throw new Error('Google Play Games no disponible');
 if(!serverClientId||!serverClientId.endsWith('.apps.googleusercontent.com'))throw new Error('Configurar el ID OAuth del servidor');
 const result=await p.serverAuthCode({serverClientId});
 if(!result.code)throw new Error('No se recibió autorización de Google');
 return result.code;
}
