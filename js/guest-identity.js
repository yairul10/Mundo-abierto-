// Registro de identidad de invitado independiente del guardado de partidas.
// No transmite inventario, monedas, misiones ni información personal.
const API='https://cosmos-legacy-api.yairul17.workers.dev';
const KEY='cosmosLegacy.guestIdentity.v1';
const ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN=/^[0-9a-f]{64}$/;
function readIdentity(){
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&ID_PATTERN.test(v.player_id)&&TOKEN_PATTERN.test(v.guest_token)?v:null}catch{return null}
}
function storeIdentity(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch{return false}}
async function request(path,options={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(API+path,{...options,signal:controller.signal,cache:'no-store',headers:{'content-type':'application/json',...options.headers}});return {response,data:await response.json()}}finally{clearTimeout(timer)}
}
export async function ensureGuestIdentity(){
 // Evitar registrar cuentas durante QA o una partida PvP.
 if(window.MUNDO_PLAY_MODE?.mode==='test'||new URLSearchParams(location.search).has('pvp'))return {status:'skipped'};
 const previous=readIdentity();
 if(previous){
  try{const {response,data}=await request('/v1/me',{headers:{authorization:'Bearer '+previous.guest_token}});
   if(response.ok&&data.player?.id===previous.player_id)return {status:'connected',playerId:previous.player_id};
   if(response.status===401)return {status:'needs_recovery',playerId:previous.player_id};
  }catch{}
  return {status:'offline',playerId:previous.player_id};
 }
 try{
  const {response,data}=await request('/v1/guest/register',{method:'POST',body:'{}'});
  if(response.status===201&&ID_PATTERN.test(data.player_id)&&TOKEN_PATTERN.test(data.guest_token)){
   if(!storeIdentity({player_id:data.player_id,guest_token:data.guest_token,created_at:Date.now()}))return {status:'storage_unavailable'};
   return {status:'created',playerId:data.player_id};
  }
  return {status:'unavailable',reason:data.error||'request_failed'};
 }catch{return {status:'offline'}}
}
