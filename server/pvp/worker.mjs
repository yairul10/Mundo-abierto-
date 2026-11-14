import {pvpRoomName} from './pvp-match.mjs';
import {CoopLobby} from './coop-lobby.mjs';
import {ROOM_CODE,roomName} from './expedition.mjs';
import {ZONES} from './zones.mjs';
import {pvpVersionConfig,compatiblePvpClient} from './client-version.mjs';
import {verifiedPvpAccount} from './account.mjs';
import {DurableObject} from 'cloudflare:workers';
import {SharedWorld} from './shared-world.mjs';
import {testServerEnabled,realmName} from './test-config.mjs';
const VERSION='0.10.2';
const ORIGINS=new Set(['https://yairul10.github.io','https://localhost','http://localhost','capacitor://localhost']);
const json=(data,status=200,origin='')=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)return {};
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16384){await reader.cancel();throw Error('body_too_large')}chunks.push(value)}
 const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}
 const result=JSON.parse(new TextDecoder().decode(data));if(!result||Array.isArray(result)||typeof result!=='object')throw Error('invalid_request');return result;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(origin&&!ORIGINS.has(origin))return json({error:'origin_denied'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'600'}});
  if(url.pathname==='/game-config'&&request.method==='GET')return json({testServerEnabled:testServerEnabled(env),testGuestAccess:testServerEnabled(env)&&env.TEST_GUEST_ACCESS==='true',...pvpVersionConfig(env),zones:ZONES,features:{duels:false,respawnChoice:false,rankings:false,groups:true,cooperativeRooms:true,roomCapacity:5,lives:2,pvp1v1:true,pvpPracticeBot:true}},200,origin);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,game:'mundo-abierto',version:VERSION,stage:'cooperative-expeditions',modes:['common','private','pvp-1v1'],persistentSoloGame:false},200,origin);
  if(!(await env.API_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return json({error:'rate_limit'},429,origin);
  try{
   if(url.pathname==='/arena/join'&&request.method==='POST'){const body=await readBody(request);if(!compatiblePvpClient(body,env))return json({error:'update_required',...pvpVersionConfig(env)},426,origin);if(body.realm&&!['normal','test'].includes(body.realm))return json({error:'invalid_realm'},400,origin);if(body.realm==='test'&&!testServerEnabled(env))return json({error:'test_closed'},403,origin);const account=await verifiedPvpAccount(request,env,body.realm);if(account.error)return json({error:account.error},account.status,origin);if(account.testGuest)return json({error:'google_required'},403,origin);const result=await env.LOBBIES.getByName('pvp-directory-'+(body.realm==='test'?'test':'normal')).enterDuel({...body,coopRoom:undefined,pvpRoom:undefined,accountId:account.playerId,testGuest:false});return json(result,result.error?409:200,origin)}
   if(url.pathname==='/arena/socket'&&request.method==='GET'){const realm=url.searchParams.get('realm'),code=url.searchParams.get('room');if(!ROOM_CODE.test(code||''))return json({error:'invalid_room_code'},400,origin);if(realm==='test'&&!testServerEnabled(env))return json({error:'test_closed'},403,origin);return env.ROOMS.getByName(pvpRoomName(realm,code)).fetch(request)}
   if(url.pathname==='/world/join'&&request.method==='POST'){const body=await readBody(request);if(!compatiblePvpClient(body,env))return json({error:'update_required',...pvpVersionConfig(env)},426,origin);if(body.realm&& !['normal','test'].includes(body.realm))return json({error:'invalid_realm'},400,origin);if(body.realm==='test'&&!testServerEnabled(env))return json({error:'test_closed'},403,origin);const account=await verifiedPvpAccount(request,env,body.realm);if(account.error)return json({error:account.error},account.status,origin);const input={...body,coopRoom:undefined,pvpRoom:undefined,accountId:account.playerId,testGuest:account.testGuest===true};const result=body.coop?await env.LOBBIES.getByName('coop-directory-'+(body.realm==='test'?'test':'normal')).enterRoom(input):await env.ROOMS.getByName(realmName(body.realm)).enter(input);return json(result,result.error?409:200,origin)}
   if(url.pathname==='/world/rewards'&&request.method==='POST'){const body=await readBody(request);if(body.realm&&!['normal','test'].includes(body.realm))return json({error:'invalid_realm'},400,origin);if(!ROOM_CODE.test(String(body.room||'')))return json({error:'invalid_room_code'},400,origin);if(body.realm==='test'&&!testServerEnabled(env))return json({error:'test_closed'},403,origin);const account=await verifiedPvpAccount(request,env,body.realm);if(account.error)return json({error:account.error},account.status,origin);const result=await env.ROOMS.getByName(roomName(body.realm,body.room)).pendingForAccount(account.playerId,body.ids);return json(result,200,origin)}
   if(url.pathname==='/world/socket'&&request.method==='GET'){const realm=url.searchParams.get('realm');if(realm==='test'&&!testServerEnabled(env))return json({error:'test_closed'},403,origin);const code=url.searchParams.get('room');if(code&&!ROOM_CODE.test(code))return json({error:'invalid_room_code'},400,origin);return env.ROOMS.getByName(code?roomName(realm,code):realmName(realm)).fetch(request);}
   if(url.pathname==='/rooms'||url.pathname.startsWith('/rooms/')||url.pathname==='/matchmake')return json({error:'prototype_retired'},410,origin);
   return json({error:'not_found'},404,origin);
  }catch(error){console.error(JSON.stringify({event:'request_failure',path:url.pathname,error:error?.message==='body_too_large'?'body_too_large':'invalid_request'}));return json({error:'invalid_request'},400,origin)}
 }
};
// Preserve existing namespace bindings; the old room/queue endpoints are retired.
export class ArenaRoom extends SharedWorld {}
export class ArenaLobby extends CoopLobby {}



