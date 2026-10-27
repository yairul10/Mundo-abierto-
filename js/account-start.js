import {createCloudSave} from './cloud-save-client.js?v=3';
import {isNativePlayGames,playGamesStatus} from './play-games-auth.js';

const CHOICE='cosmosLegacy.accountChoice.v1';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev';
const CLIENT='430904114567-2s03dmhrv4o4lfp73qal65kseu837035.apps.googleusercontent.com';
function readChoice(){try{return localStorage.getItem(CHOICE)}catch{return null}}
function remember(choice){localStorage.setItem(CHOICE,choice);if(localStorage.getItem(CHOICE)!==choice)throw Error('No se pudo guardar tu elección en este dispositivo')}

function ask({title,text,options,dismissOnReady=false}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='account-dialog';
  const heading=document.createElement('h2');heading.textContent=title;
  const paragraph=document.createElement('p');paragraph.textContent=text;
  dialog.append(heading,paragraph);
  const dismiss=()=>finish('cancel');
  const finish=value=>{window.removeEventListener('cosmos:world-ready',dismiss);dialog.close();dialog.remove();resolve(value)};
  for(const [value,label] of options){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>finish(value);dialog.appendChild(button)}
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish('cancel')},{once:true});
  if(dismissOnReady)window.addEventListener('cosmos:world-ready',dismiss,{once:true});
  document.body.appendChild(dialog);dialog.showModal();
 });
}

export async function startAccount({mode=window.MUNDO_PLAY_MODE?.mode}={}){
 window.cosmosLoadingSlow=async()=>{
  const choice=await ask({title:'La carga está tardando más de lo habitual',text:'La conexión o algún recurso no ha terminado de responder. Puedes esperar, reintentar la carga o entrar con los recursos disponibles. Tu partida se conserva.',dismissOnReady:true,options:[['wait','Seguir esperando'],['retry','Reintentar carga'],['continue','Entrar con los recursos disponibles']]});
  if(choice==='retry')location.reload();
  return choice==='continue';
 };
 const actions=document.getElementById('accountActions'),message=document.getElementById('accountMessage');
 if(mode==='test'||new URLSearchParams(location.search).has('pvp')){actions.hidden=true;document.getElementById('worldLoading').classList.add('account-selected');return null}
 const guest=document.getElementById('startGuest'),google=document.getElementById('startGoogle');
 let client=null,busy=false;
 const show=()=>{actions.hidden=false;google.disabled=false;guest.disabled=false;busy=false};
 const finish=()=>{actions.hidden=true;document.getElementById('worldLoading').classList.add('account-selected')};
 async function connect(){
  if(!isNativePlayGames())throw Error('Google Play está disponible en la aplicación Android instalada desde Google Play. En el navegador puedes jugar como invitado.');
  message.textContent='Conectando con Google Play…';
  client=createCloudSave({apiUrl:API,serverClientId:CLIENT,onConflict:()=>{window.dispatchEvent(new CustomEvent('cosmos:cloud-paused'))}});
  const result=await client.connect();
  if(result.status==='unavailable')throw Error('Google Play no está disponible en este dispositivo');
  if(result.status==='conflict'||result.status==='restore_required'){
   const summary=p=>'Nivel '+(p.level??1)+' · '+(p.gold??0).toLocaleString('es')+' créditos';
   const choice=await ask({title:result.status==='restore_required'?'Recuperar tu partida':'Elige qué partida continuar',
    text:'Nube: '+summary(result.cloud)+(result.local?'\nEste dispositivo: '+summary(result.local):'')+'\n\nRecuperar la nube guarda antes un respaldo local. Usar este dispositivo reemplazará la copia de nube al sincronizar.',
    options:[['cloud','Recuperar partida de la nube'],...(result.local?[['local','Usar partida de este dispositivo']]:[]),['cancel','Volver']]});
   if(choice==='cancel')return false;
   client.resolveConflict(choice);
  }else if(result.status!=='ready')throw Error('No se pudo preparar la cuenta: '+result.status);
  return true;
 }
 if(readChoice()==='guest'){finish();mountAccountSettings();return null}
 // Sin elección previa: si Play Games ya autenticó al jugador, recuperar su cuenta
 // automáticamente. Nunca activar nube si eligió expresamente invitado.
 if(readChoice()===null&&isNativePlayGames()){
  actions.hidden=true;
  try{
   const status=await playGamesStatus();
   if(status.authenticated){
    if(await connect()){remember('google');finish();mountAccountSettings();return client}
   }
  }catch(error){console.warn('[Cosmos Legacy] Inicio automático de Google Play no disponible:',error?.message||error)}
  message.textContent='';
 }
 if(readChoice()==='google'){
  actions.hidden=false;guest.disabled=true;google.disabled=true;
  try{if(await connect()){finish();mountAccountSettings();return client}}
  catch(error){message.textContent='No se pudo conectar. '+error.message+' Puedes reintentar o continuar como invitado.'}
 }
 show();
 return new Promise(resolve=>{
  guest.onclick=async()=>{
   if(busy)return;busy=true;
   const choice=await ask({title:'Jugar como invitado',text:'Tu progreso se guardará solo en este dispositivo. Podrías perderlo si borras los datos de la aplicación, la desinstalas o cambias de celular. No se eliminará tu partida actual.',options:[['guest','Aceptar y jugar como invitado'],['cancel','Volver']]});
   if(choice!=='guest'){busy=false;return}
   try{remember('guest');finish();mountAccountSettings();resolve(null)}catch(error){message.textContent=error.message;busy=false}
  };
  google.onclick=async()=>{
   if(busy)return;busy=true;guest.disabled=true;google.disabled=true;
   try{if(await connect()){remember('google');finish();mountAccountSettings();resolve(client);return}}
   catch(error){message.textContent='No se pudo conectar. '+error.message+' Tu partida local se conserva.'}
   show();
  };
 });
}

function mountAccountSettings(){
 const panel=document.getElementById('characterPanel'),anchor=document.getElementById('saveBtn');
 if(!panel||!anchor||document.getElementById('accountSettingsBtn'))return;
 const button=document.createElement('button');button.id='accountSettingsBtn';button.type='button';button.textContent='Cuenta y guardado en la nube';
 button.onclick=async()=>{
  const choice=await ask({title:'Cuenta y guardado',text:readChoice()==='google'?'Google Play seleccionado. Puedes volver a elegir cómo entrar al juego.':'Estás jugando como invitado. Puedes conectar Google Play para guardar o recuperar tu progreso.',options:[['change','Elegir cómo entrar'],['cancel','Cerrar']]});
  if(choice!=='change')return;
  window.dispatchEvent(new Event('mundo:save-before-switch'));
  try{localStorage.removeItem(CHOICE);location.reload()}catch(error){alert(error.message)}
 };
 panel.insertBefore(button,anchor);
}

export async function startCloudSync(client){
 if(!client?.active)return;
 let pausedNotice=false;
 const sync=async()=>{
  try{await client.sync()}catch(error){console.warn('[Cosmos Legacy] Nube no disponible; partida local conservada:',error?.message||error)}
  if(!client.active&&!pausedNotice){pausedNotice=true;const note=document.createElement('p');note.className='cloud-paused-note';note.textContent='Guardado nube pausado. Tu progreso sigue guardado en este dispositivo. Reinicia el juego para reconectar.';document.getElementById('characterPanel')?.appendChild(note)}
 };
 await sync();
 const timer=setInterval(()=>{if(client.active)void sync()},15000);
 addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 addEventListener('visibilitychange',()=>{if(document.hidden&&client.active)void sync()});
}
