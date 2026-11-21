import {mountMapChat} from './map-chat.js?v=526';
import {pvpAccountToken} from './pvp-account.js?v=435';
import {isNativePlayGames,playGamesStatus} from './play-games-auth.js';
const API='https://mundo-abierto-pvp.yairul17.workers.dev';
export function mountOnlineChat({realm='normal',getToken,fetcher=fetch,storage=localStorage}={}){
 let visible=false,stopped=false,timer=null,queue=Promise.resolve(),pending=0;
 async function token(){
  if(getToken)return getToken();
  if(!isNativePlayGames()||!(await playGamesStatus()).authenticated)throw Error('Inicia sesión con Google Play para usar el chat.');
  return pvpAccountToken();
 }
 function notice(text){chat.receive({type:'chatNotice',text})}
 async function request(message){
  if(stopped)return;
  if(globalThis.navigator?.onLine===false){notice('Sin conexión. Puedes seguir jugando PVE.');if(message.type==='chatSend')chat.receive({type:'chatSendFailed',text:message.text});return}
  try{
   const auth=await token();if(stopped)return;
   const response=await fetcher(API+'/chat',{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify({realm,message}),signal:AbortSignal.timeout(10000),cache:'no-store'});
   const result=await response.json();if(stopped)return;
   if(!response.ok)throw Error(result.error==='google_required'?'Inicia sesión con Google Play para usar el chat.':result.error==='test_closed'?'El servidor de prueba está cerrado.':'No se pudo conectar al chat. Vuelve a intentarlo.');
   chat.identify(result.pilotId);notice('');for(const event of result.events||[])chat.receive(event);
   if(message.type==='chatSend'&&(result.events||[]).some(event=>event.type==='chatError'))chat.receive({type:'chatSendFailed',text:message.text});
  }catch(error){if(!stopped&&message.type==='chatSend')chat.receive({type:'chatSendFailed',text:message.text});if(!stopped)notice(error.message==='Failed to fetch'?'Sin conexión al chat. Puedes seguir jugando PVE.':error.message)}
 }
 function send(message){
  if(stopped||pending>=6)return;pending++;
  queue=queue.then(()=>request(message)).finally(()=>{pending--});
 }
 function schedule(){clearTimeout(timer);if(visible&&!stopped)timer=setTimeout(()=>{if(!document.hidden&&!pending)send({type:'chatHistory'});schedule()},8000)}
 const chat=mountMapChat({send,realm,storage,getToken:token,onVisibility:value=>{visible=value;schedule()}});
 const style=document.createElement('link');style.rel='stylesheet';style.href='./css/map-chat.css?v=526';document.head.append(style);
 const reconnect=()=>{if(visible&&!document.hidden)send({type:'chatHistory'})};
 window.addEventListener('online',reconnect);document.addEventListener('visibilitychange',reconnect);
 window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);window.removeEventListener('online',reconnect);document.removeEventListener('visibilitychange',reconnect)},{once:true});
 return chat;
}
