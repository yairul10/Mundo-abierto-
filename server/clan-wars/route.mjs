import {verifiedPvpAccount} from '../pvp/account.mjs';
import {compatiblePvpClient} from '../pvp/client-version.mjs';
import {testServerEnabled} from '../pvp/test-config.mjs';
export const warCoordinator=(env,realm)=>env.LOBBIES.getByName('clan-war-'+(realm==='test'?'test':'normal'));
export async function warAdmin(account,env){const ids=String(env.CHAT_ADMIN_IDS||'').split(',').map(s=>s.trim()),bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('google-play:'+account)));const pilot=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);return ids.includes(account)||ids.includes(pilot)}
export async function warRoute(request,env){
 const url=new URL(request.url),realm=url.searchParams.get('realm')||'normal';
 if(!['normal','test'].includes(realm))return {status:400,body:{error:'invalid_realm'}};
 if(realm==='test'&&!testServerEnabled(env))return {status:403,body:{error:'test_closed'}};
 if(!['/wars/status','/wars/action','/wars/join'].includes(url.pathname))return {status:404,body:{error:'not_found'}};
 if(!['GET','POST'].includes(request.method)||url.pathname!=='/wars/status'&&request.method!=='POST')return {status:405,body:{error:'method_not_allowed'}};
 const actor=await verifiedPvpAccount(request,env,realm);if(actor.error)return {status:actor.status,body:{error:actor.error}};if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(!(await env.API_LIMIT.limit({key:'clan-war:'+actor.playerId})).success)return {status:429,body:{error:'rate_limit'}};
 let raw={};if(request.method==='POST'){
  const reader=request.body?.getReader();if(!reader)return {status:400,body:{error:'invalid_request'}};let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return {status:413,body:{error:'body_too_large'}}}chunks.push(value)}const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}try{raw=JSON.parse(new TextDecoder().decode(data))}catch{return {status:400,body:{error:'invalid_request'}}}if(!raw||typeof raw!=='object'||Array.isArray(raw))return {status:400,body:{error:'invalid_request'}};
 }
 try{
  const coordinator=warCoordinator(env,realm);
  if(url.pathname==='/wars/join'){
   if(!compatiblePvpClient(raw,env))return {status:426,body:{error:'update_required'}};
   const result=await coordinator.warTicket({...raw,accountId:actor.playerId,realm,testGuest:false});return {status:result.error?409:200,body:result};
  }
  const action=url.pathname==='/wars/status'?(request.method==='POST'?'presence':'status'):raw.action;
  const result=await coordinator.warRequest(actor.playerId,await warAdmin(actor.playerId,env),realm,{...raw,action});return {status:result.error?result.status||409:200,body:result};
 }catch{return {status:503,body:{error:'war_unavailable'}}}
}
