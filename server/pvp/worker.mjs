import {DurableObject} from 'cloudflare:workers';
import {SharedWorld} from './shared-world.mjs';
const VERSION='0.3.1';
const ORIGINS=new Set(['https://yairul10.github.io','https://localhost','http://localhost','capacitor://localhost']);
const json=(data,status=200,origin='')=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)return {};
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();throw Error('body_too_large')}chunks.push(value)}
 const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}
 const result=JSON.parse(new TextDecoder().decode(data));if(!result||Array.isArray(result)||typeof result!=='object')throw Error('invalid_request');return result;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(origin&&!ORIGINS.has(origin))return json({error:'origin_denied'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,game:'mundo-abierto',version:VERSION,stage:'shared-world-test',modes:['shared-world','consensual-duels'],persistentSoloGame:false},200,origin);
  if(!(await env.API_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return json({error:'rate_limit'},429,origin);
  try{
   if(url.pathname==='/world/join'&&request.method==='POST'){const result=await env.ROOMS.getByName('shared-cemetery-v1').enter(await readBody(request));return json(result,result.error?409:200,origin)}
   if(url.pathname==='/world/socket'&&request.method==='GET')return env.ROOMS.getByName('shared-cemetery-v1').fetch(request);
   if(url.pathname==='/rooms'||url.pathname.startsWith('/rooms/')||url.pathname==='/matchmake')return json({error:'prototype_retired'},410,origin);
   return json({error:'not_found'},404,origin);
  }catch(error){console.error(JSON.stringify({event:'request_failure',path:url.pathname,error:error?.message==='body_too_large'?'body_too_large':'invalid_request'}));return json({error:'invalid_request'},400,origin)}
 }
};
// Preserve existing namespace bindings; the old room/queue endpoints are retired.
export class ArenaRoom extends SharedWorld {}
export class ArenaLobby extends DurableObject {}
