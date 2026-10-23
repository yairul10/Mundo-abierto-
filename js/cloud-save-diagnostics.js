// Manual, non-destructive Google Play Games cloud diagnostics for Android test builds.
// No save writes or restoration occur here.
import {createCloudSave} from './cloud-save-client.js';
import {isNativePlayGames} from './play-games-auth.js';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev';
const WEB_CLIENT_ID='430904114567-2s03dmhry4o4lfp73qal65kseu837035.apps.googleusercontent.com';
const safeError=e=>String(e?.message||e||'Error desconocido').replace(/(?:ya29\\.|4\\/|eyJ)[A-Za-z0-9_.\\/-]{12,}/g,'[DATO_OCULTO]').slice(0,300);
export function mountCloudSaveDiagnostics(){
 if(new URLSearchParams(location.search).has('pvp')||window.MUNDO_PLAY_MODE?.mode==='test')return;
 const panel=document.getElementById('characterPanel'),anchor=document.getElementById('saveBtn');
 if(!panel||!anchor)return;
 const button=document.getElementById('googlePlayDiagnosticBtn')||document.createElement('button');
 if(button.dataset.diagnosticMounted==='1')return;
 button.dataset.diagnosticMounted='1';
 button.type='button';button.textContent='☁️ Probar Google Play';
 button.style.cssText='display:block;width:100%;margin:10px 0;border:1px solid #80c6ff;border-radius:12px;padding:10px 12px;background:#122b50;color:white;font:600 13px system-ui';
 const report=document.createElement('textarea');
 report.readOnly=true;report.rows=6;report.setAttribute('aria-label','Informe de diagnóstico Google Play');
 report.style.cssText='display:none;width:100%;box-sizing:border-box;margin:6px 0;color:white;background:#101b30;border:1px solid #80c6ff;border-radius:8px;padding:8px;font:12px monospace';
 const copy=document.createElement('button');copy.type='button';copy.textContent='📋 Copiar diagnóstico';
 copy.style.cssText='display:none;width:100%;padding:10px;margin:5px 0;border:1px solid #80c6ff;border-radius:9px;background:#122b50;color:white';
 if(!button.isConnected)panel.insertBefore(button,anchor);
 panel.insertBefore(report,anchor);panel.insertBefore(copy,anchor);
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(report.value);copy.textContent='✓ Informe copiado'}catch(_){report.focus();report.select();copy.textContent='Selecciona y copia el texto'}})
 button.addEventListener('click',async()=>{
  button.disabled=true;button.textContent='☁️ Comprobando…';
  const lines=['Cosmos Legacy / diagnóstico Google Play','Fecha: '+new Date().toISOString(),'Modo: solo lectura','Cliente OAuth web: configurado'];
  const mark=(step,detail)=>lines.push(step+': '+detail);
  try{
   const nativeAvailable=isNativePlayGames();
   mark('1. SDK Android',nativeAvailable?'disponible':'complemento CosmosPlayGames no detectado');
   if(!nativeAvailable)throw new Error('Complemento nativo CosmosPlayGames no disponible en esta compilación');
   const {playGamesStatus,playGamesSignIn,getPlayGamesServerAuthCode}=await import('./play-games-auth.js');
   let status=await playGamesStatus();mark('2. Autenticación inicial',status.authenticated?'correcta':'no iniciada');
   if(!status.authenticated){status=await playGamesSignIn();mark('3. Inicio de sesión',status.authenticated?'correcto':'fallido')}
   if(!status.authenticated)throw new Error('Google Play Games no autenticado');
   mark('4. Autorización servidor','solicitando código');
   const code=await getPlayGamesServerAuthCode(WEB_CLIENT_ID);
   mark('4. Autorización servidor','correcta (código recibido; valor oculto)');
   mark('5. Cloudflare','solicitando sesión');
   const response=await fetch(API+'/v1/play-games/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
   mark('5. Cloudflare','HTTP '+response.status);
   if(!response.ok)throw new Error('Cloudflare devolvió HTTP '+response.status);
   mark('6. Resultado','autorización completada; sin guardar ni restaurar datos');
   alert('☁️ Autorización correcta. No se ha modificado tu partida.');
  }catch(e){mark('ERROR',safeError(e));alert('☁️ La prueba encontró un error. Abre «Copiar diagnóstico» en el menú. Tu partida local no se modificó.')}
  finally{report.value=lines.join('\n');report.style.display='block';copy.style.display='block';button.disabled=false;button.textContent='☁️ Probar Google Play';copy.textContent='📋 Copiar diagnóstico'}
 });
}
