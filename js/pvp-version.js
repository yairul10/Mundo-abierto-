export const PVP_CLIENT_VERSION=3;
export const PVP_UPDATE_URL='https://play.google.com/store/apps/details?id=com.cosmoslegacy.game';
const API='https://mundo-abierto-pvp.yairul17.workers.dev';
export async function checkPvpVersion(){
 let response;try{response=await fetch(API+'/game-config',{cache:'no-store',signal:AbortSignal.timeout(5000)})}catch{throw Error('No se pudo comprobar la versión de PvP. Conservas tu partida; vuelve a intentarlo.')}
 if(!response.ok)throw Error('No se pudo comprobar la versión de PvP.');
 const config=await response.json();
 if(Number.isSafeInteger(config.minPvpClientVersion)&&config.minPvpClientVersion>PVP_CLIENT_VERSION)throw Object.assign(Error('Actualiza Cosmos Legacy para entrar a PvP. Puedes seguir jugando PvE.'),{updateRequired:true});
}
export function showPvpUpdate(){
 if(document.getElementById('pvpUpdateDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='pvpUpdateDialog';dialog.style.cssText='max-width:400px;background:#0c2036;color:white;border:1px solid #7be1ff;border-radius:14px;padding:20px;font:16px system-ui';
 const title=document.createElement('h3');title.textContent='Actualización necesaria';const text=document.createElement('p');text.textContent='Actualiza Cosmos Legacy para entrar a PvP. Tu progreso local se conserva; instala la actualización sin borrar los datos.';
 const update=document.createElement('a');update.href=PVP_UPDATE_URL;update.target='_blank';update.rel='noopener';update.textContent='Abrir Google Play';update.style.cssText='display:inline-block;color:#8eeeff;margin:12px';
 const close=document.createElement('button');close.textContent='Seguir en PvE';close.onclick=()=>{dialog.close();dialog.remove();if(new URLSearchParams(location.search).has('pvp'))location.href='index.html'};
 dialog.append(title,text,update,close);document.body.append(dialog);dialog.showModal();
}
