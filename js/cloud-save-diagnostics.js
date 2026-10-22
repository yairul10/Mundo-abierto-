// Manual, non-destructive Google Play Games cloud diagnostics for Android test builds.
// No save writes or restoration occur here.
import {createCloudSave} from './cloud-save-client.js';
import {isNativePlayGames} from './play-games-auth.js';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev';
const WEB_CLIENT_ID='430904114567-2s03dmhry4o4lfp73qal65kseu837035.apps.googleusercontent.com';
export function mountCloudSaveDiagnostics(){
 if(!isNativePlayGames()||new URLSearchParams(location.search).has('pvp')||window.MUNDO_PLAY_MODE?.mode==='test')return;
 const button=document.createElement('button');
 button.type='button';button.textContent='☁️ Probar Google Play';
 button.style.cssText='position:fixed;left:12px;bottom:254px;z-index:1002;border:1px solid #80c6ff;border-radius:12px;padding:9px 12px;background:#122b50;color:white;font:600 12px system-ui';
 document.body.appendChild(button);
 button.addEventListener('click',async()=>{
  button.disabled=true;button.textContent='☁️ Comprobando…';
  try{
   const client=createCloudSave({apiUrl:API,serverClientId:WEB_CLIENT_ID});
   const result=await client.connect();
   const messages={ready:'Google Play conectado. La lectura nube funcionó. No se ha enviado ni modificado ninguna partida.',conflict:'Cuenta conectada. La partida nube difiere de la local. No se modificó ninguna de las dos.',restore_required:'Hay una partida nube y ninguna partida local. Restauración desactivada para esta prueba.',unavailable:'Google Play Games no está disponible en este dispositivo.'};
   alert('☁️ Prueba de guardado\n'+(messages[result.status]||result.status)+'\n\nEl guardado automático continúa desactivado.');
  }catch(e){alert('☁️ No se pudo completar la prueba: '+(e?.message||'Error desconocido')+'\n\nTu partida local no se modificó.')}
  finally{button.disabled=false;button.textContent='☁️ Probar Google Play'}
 });
}
