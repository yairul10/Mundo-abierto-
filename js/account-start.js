import {createCloudSave} from './cloud-save-client.js?v=344';
import {isNativePlayGames,playGamesStatus} from './play-games-auth.js';
import {WORKING_SAVE,activeProfile,ensureProfiles,checkpointProfile,playProfile,profileKey,profileMeta,setProfileMeta,switchProfile,bindGuestProfile,guestProfile,newGuestProfile,storedProgress} from './account-storage.js?v=344';
const CHOICE='cosmosLegacy.accountChoice.v1',FORCE='cosmosLegacy.forceAccountChoice.v2';
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev',CLIENT='430904114567-2s03dmhrv4o4lfp73qal65kseu837035.apps.googleusercontent.com';
const readChoice=()=>localStorage.getItem(CHOICE);
function remember(choice){localStorage.setItem(CHOICE,choice);if(readChoice()!==choice)throw Error('No se pudo guardar tu elección')}
const summary=p=>p?'Nivel '+(p.level??1)+' · '+(p.gold??0).toLocaleString('es')+' créditos':'Partida nueva';
function ask({title,text,options,dismissOnReady=false}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='account-dialog';
  const heading=document.createElement('h2'),paragraph=document.createElement('p');heading.textContent=title;paragraph.textContent=text;dialog.append(heading,paragraph);
  const dismiss=()=>finish('cancel'),finish=value=>{window.removeEventListener('cosmos:world-ready',dismiss);dialog.close();dialog.remove();resolve(value)};
  for(const [value,label]of options){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>finish(value);dialog.appendChild(button)}
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish('cancel')},{once:true});if(dismissOnReady)window.addEventListener('cosmos:world-ready',dismiss,{once:true});document.body.appendChild(dialog);dialog.showModal();
 });
}
function finishLoading(){document.getElementById('accountActions').hidden=true;document.getElementById('worldLoading').classList.add('account-selected');window.COSMOS_ACTIVE_PROFILE=activeProfile(localStorage)}
function showStatus(text){const node=document.getElementById('cloudSaveStatus');if(node)node.textContent=text;window.COSMOS_CLOUD_STATUS=text}
function reloadAccountChoice(){window.dispatchEvent(new Event('mundo:save-before-switch'));checkpointProfile(localStorage);window.COSMOS_PROFILE_SWITCHING=true;window.dispatchEvent(new Event('cosmos:account-changing'));localStorage.setItem(FORCE,'1');location.href='index.html'}
export async function startAccount({mode=window.MUNDO_PLAY_MODE?.mode}={}){
 window.cosmosLoadingSlow=async()=>{const choice=await ask({title:'La carga está tardando más de lo habitual',text:'Puedes esperar, reintentar o entrar con los recursos disponibles. Tu partida se conserva.',dismissOnReady:true,options:[['wait','Seguir esperando'],['retry','Reintentar carga'],['continue','Entrar con los recursos disponibles']]});if(choice==='retry')location.reload();return choice==='continue'};
 const actions=document.getElementById('accountActions'),message=document.getElementById('accountMessage');
 if(mode==='test'){actions.hidden=true;document.getElementById('worldLoading').classList.add('account-selected');return null}
 ensureProfiles(localStorage);const pvp=new URLSearchParams(location.search).has('pvp'),force=localStorage.getItem(FORCE)==='1';localStorage.removeItem(FORCE);
 const guest=document.getElementById('startGuest'),google=document.getElementById('startGoogle');let booting=true,busy=false;
 const onIdentity=async(identity,remote)=>{
  const current=activeProfile(localStorage),target=playProfile(identity.playerId),meta={kind:'play',playerId:identity.playerId,displayName:identity.displayName||'Cuenta de Google',nativeId:identity.nativeId||null};
  if(!booting&&current!==target)throw Object.assign(Error('Hay otra cuenta de Google. Reinicia para elegir su partida; la actual se conserva.'),{accountChanged:true});
  if(current!==target){
   const local=storedProgress(localStorage,current),targetLocal=storedProgress(localStorage,target);
   if(current.startsWith('guest:')&&local){
    const options=[['link','Vincular este progreso a esta cuenta'],['account','Abrir la partida de esta cuenta'],['cancel','Volver sin vincular']];
    const choice=await ask({title:'Cuenta: '+meta.displayName,text:'Partida de este dispositivo: '+summary(local)+'\nPartida de la cuenta: '+summary(targetLocal||remote?.progress)+'\n\nEl progreso local antiguo no tiene una cuenta asignada. Vincúlalo solo si pertenece a esta cuenta. Se conservará un respaldo.',options});
    if(choice==='cancel')throw Object.assign(Error('Vinculación cancelada. La partida local se conserva.'),{cancelled:true});
    if(choice==='link')bindGuestProfile(localStorage,identity);else switchProfile(localStorage,target,{meta});
   }else switchProfile(localStorage,target,{meta});
  }
  setProfileMeta(localStorage,target,meta);window.COSMOS_ACTIVE_PROFILE=target;
 };
 const client=isNativePlayGames()?createCloudSave({apiUrl:API,serverClientId:CLIENT,manageProfiles:true,onIdentity,onConflict:()=>window.dispatchEvent(new Event('cosmos:cloud-paused'))}):null;
 window.cosmosAccountSession=()=>client?.session||null;
 const complete=value=>{booting=false;finishLoading();mountAccountSettings();return value};
 const connect=async interactive=>{
  if(!client)throw Error('Google Play está disponible en la aplicación Android. Puedes jugar PvE como invitado.');
  if(navigator.onLine===false)throw Error('Sin Internet. El progreso se conserva en este dispositivo.');
  message.textContent='Comprobando cuenta y respaldo…';const result=await client.connect({interactive});
  if(result.status==='conflict'||result.status==='restore_required'){
   const choice=await ask({title:'Partida de '+(result.identity?.displayName||'esta cuenta'),text:'Nube: '+summary(result.cloud)+'\nEste dispositivo: '+summary(result.local)+'\n\nElige qué partida continuar. Se respaldará la copia local antes de restaurar la nube.',options:[['cloud','Recuperar partida de la nube'],...(result.local?[['local','Conservar esta partida local']]:[]),['cancel','Volver']]});
   if(choice==='cancel')throw Object.assign(Error('Elección cancelada. Ninguna copia de nube fue modificada.'),{cancelled:true});client.resolveConflict(choice);
  }else if(result.status!=='ready')throw Error('No se pudo verificar Google Play. Puedes continuar PvE sin conexión.');
  remember('google');showStatus('Cuenta verificada · preparando respaldo automático');return client;
 };
 if(!force&&!pvp&&readChoice()==='guest')return complete(null);
 if(!force&&client&&(pvp||readChoice()==='google'||readChoice()===null)){
  try{if(navigator.onLine===false)throw Error('Sin Internet. El progreso se conserva en este dispositivo.');const status=await playGamesStatus();if(pvp||readChoice()==='google'||status.authenticated)return complete(await connect(false))}
  catch(error){message.textContent=error.message;if(!pvp&&!error.cancelled){showStatus('Guardado en este dispositivo · respaldo pendiente de conexión');return complete(activeProfile(localStorage)?.startsWith('play:')?client:null)}}
 }
 actions.hidden=false;guest.disabled=google.disabled=false;if(pvp)guest.textContent='Volver a PvE sin conexión';
 return new Promise(resolve=>{
  guest.onclick=async()=>{
   if(busy)return;busy=true;
   try{
    if(pvp){location.href='index.html';return}
    const target=guestProfile(localStorage);if(activeProfile(localStorage)!==target)switchProfile(localStorage,target);
    remember('guest');showStatus('Invitado · guardado solo en este dispositivo');resolve(complete(null));
   }catch(error){message.textContent=error.message}finally{busy=false}
  };
  google.onclick=async()=>{
   if(busy)return;busy=true;guest.disabled=google.disabled=true;
   try{resolve(complete(await connect(true)))}catch(error){message.textContent=error.message}finally{busy=false;guest.disabled=google.disabled=false}
  };
 });
}
function mountAccountSettings(){
 const panel=document.getElementById('characterPanel'),anchor=document.getElementById('saveBtn');if(!panel||!anchor||document.getElementById('accountSettingsBtn'))return;
 const owner=activeProfile(localStorage),meta=profileMeta(localStorage,owner),status=document.createElement('p');status.id='cloudSaveStatus';status.setAttribute('role','status');status.textContent=window.COSMOS_CLOUD_STATUS||(owner.startsWith('play:')?'Cuenta: '+meta.displayName+' · respaldo pendiente':'Invitado · guardado solo en este dispositivo');panel.insertBefore(status,anchor);
 const button=document.createElement('button');button.id='accountSettingsBtn';button.type='button';button.textContent='Cuenta y guardado en la nube';button.onclick=async()=>{
  const current=activeProfile(localStorage),label=profileMeta(localStorage,current).displayName||'Invitado';const choice=await ask({title:'Cuenta y guardado',text:'Partida activa: '+label+'\n'+status.textContent+'\nPara cambiar el perfil de Google, elígelo en los ajustes de Play Juegos y vuelve a abrir el juego.',options:[['change','Elegir cuenta o vincular a Google'],['export','Descargar respaldo local'],...(localStorage.getItem('cosmosLegacy.unassignedProgress.v2')?[['legacy','Descargar respaldo anterior a la separación']]:[]),['guest','Abrir invitado guardado'],['new','Empezar un invitado nuevo'],['cancel','Cerrar']]});
  try{
   if(choice==='change')reloadAccountChoice();
   if(choice==='export'||choice==='legacy'){
    window.dispatchEvent(new Event('mundo:save-before-switch'));const raw=choice==='legacy'?JSON.parse(localStorage.getItem('cosmosLegacy.unassignedProgress.v2')).raw:checkpointProfile(localStorage),url=URL.createObjectURL(new Blob([JSON.stringify({schema:2,owner:choice==='legacy'?'unassigned':current,createdAt:new Date().toISOString(),raw})],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Cosmos-Legacy-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
   }
   if(choice==='guest'||choice==='new'){
    if(choice==='new'&&await ask({title:'Nuevo invitado',text:'Esto reemplazará la partida de invitado activa. Las partidas de Play se conservarán por separado. Vincula o descarga antes el progreso de invitado que quieras conservar.',options:[['new','Crear nuevo invitado'],['cancel','Volver']]})!=='new')return;
    window.dispatchEvent(new Event('mundo:save-before-switch'));checkpointProfile(localStorage);window.COSMOS_PROFILE_SWITCHING=true;window.dispatchEvent(new Event('cosmos:account-changing'));if(choice==='new')newGuestProfile(localStorage);else switchProfile(localStorage,guestProfile(localStorage));remember('guest');location.href='index.html';
   }
  }catch(error){alert(error.message)}
 };panel.insertBefore(button,anchor);
}
export async function startCloudSync(client){
 if(!client)return;
 let busy=false,blocked=false,retryAt=0,failures=0,stopped=false,lastConfirmed='',conflictNotice=false;
 const sync=async()=>{
  if(busy||blocked||stopped||Date.now()<retryAt||navigator.onLine===false)return;busy=true;
  try{
   window.dispatchEvent(new Event('mundo:save-before-switch'));checkpointProfile(localStorage,window.COSMOS_ACTIVE_PROFILE);
   if(!client.active||client.session?.expiresAt<=Date.now()+60000){
    const result=await client.connect({interactive:false});
    if(result.status==='conflict'||result.status==='restore_required'){blocked=true;showStatus('Hay dos partidas distintas. Abre Cuenta y guardado para elegir cuál continuar.');return}
    if(result.status!=='ready'){showStatus('Sin conexión con Google · progreso guardado en este dispositivo');return}
   }
   const result=await client.sync();
   if(result.status==='stored'){lastConfirmed=new Date().toLocaleTimeString();showStatus('Respaldo en nube confirmado · '+lastConfirmed)}
   else if(result.status==='unchanged')showStatus(lastConfirmed?'Respaldo en nube confirmado · '+lastConfirmed:'Cuenta conectada · sin cambios pendientes');
   else if(result.status==='offline')showStatus('Sin conexión con Google · respaldo pendiente, partida local conservada');
   else if(result.status==='no_save')showStatus('Cuenta conectada · esperando el primer guardado local');
   failures=0;retryAt=0;
  }catch(error){
   if(error.accountChanged){blocked=true;window.dispatchEvent(new Event('cosmos:account-changed'));showStatus(error.message)}
   else if(error.status===409){blocked=true;showStatus('La nube cambió desde otro dispositivo. Abre Cuenta y guardado para resolverlo.')}
   else{failures++;retryAt=Date.now()+Math.min(60000,2000*2**Math.min(5,failures));showStatus('Respaldo pendiente · progreso guardado en este dispositivo'+(lastConfirmed?' · último respaldo '+lastConfirmed:''))}
   if(blocked&&!conflictNotice){conflictNotice=true;const note=document.createElement('p');note.textContent='Respaldo pausado para proteger ambas partidas. Usa Cuenta y guardado.';document.getElementById('characterPanel')?.appendChild(note)}
  }finally{busy=false}
 };
 let timer=setInterval(()=>void sync(),15000);await sync();
 const stop=()=>{stopped=true;clearInterval(timer)};
 addEventListener('online',()=>{retryAt=0;void sync()});addEventListener('visibilitychange',()=>{if(!document.hidden){retryAt=0;void sync()}else void sync()});
 addEventListener('pagehide',stop);addEventListener('cosmos:account-changing',stop);
 addEventListener('pageshow',event=>{if(event.persisted&&stopped){stopped=false;timer=setInterval(()=>void sync(),15000);retryAt=0;void sync()}});
 addEventListener('storage',event=>{if(event.key==='cosmosLegacy.activeProfile.v2'){blocked=true;window.dispatchEvent(new Event('cosmos:account-changed'));showStatus('Se abrió otra cuenta en otra ventana. Reinicia para continuar.')}});
 return {sync,stop};
}
