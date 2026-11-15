import {verifiedPvpAccount} from '../pvp/account.mjs';
import {pvpRoomName} from '../pvp/pvp-teams.mjs';
import {compatiblePvpClient} from '../pvp/client-version.mjs';
export const rankedCoordinator=(env,realm)=>env.LOBBIES.getByName('ranked-directory-'+realm);
export async function rankedRoute(request,env,raw){
 const realm=raw.realm||'normal';if(!['normal','test'].includes(realm))return {status:400,body:{error:'invalid_realm'}};
 if(realm==='test'&&env.TEST_SERVER_ENABLED==='false')return {status:403,body:{error:'test_closed'}};
 const actor=await verifiedPvpAccount(request,env,realm);if(actor.error)return {status:actor.status,body:{error:actor.error}};if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(!(await env.API_LIMIT.limit({key:'ranked:'+actor.playerId})).success)return {status:429,body:{error:'rate_limit'}};
 if(!env.CLANS_DB)return {status:503,body:{error:'ranked_unavailable'}};
 try{
 const name=(await env.CLANS_DB.prepare('SELECT display_name FROM players WHERE id=?').bind(actor.playerId).first())?.display_name||'Piloto';
 const coordinator=rankedCoordinator(env,realm),path=new URL(request.url).pathname;
 if(path==='/ranked/join'){
  if(!compatiblePvpClient(raw,env))return {status:426,body:{error:'update_required'}};
  const state=await coordinator.rankedCommand(actor.playerId,name,realm,{action:'status'}),assignment=state.assignment;
  if(!assignment||assignment.id!==raw.matchId||Date.now()<assignment.startsAt)return {status:409,body:{error:'match_not_assigned'}};
  const ticket=await env.ROOMS.getByName(pvpRoomName(realm,assignment.code,assignment.mode)).enter({...raw,accountId:actor.playerId,testGuest:false,name,pvpRoom:{code:assignment.code,mode:assignment.mode,realm,visibility:'ranked'}});
  return {status:ticket.error?409:200,body:{...ticket,arena:{...assignment,visibility:'ranked'}}};
 }
 if(path!=='/ranked/action')return {status:404,body:{error:'not_found'}};
 return {status:200,body:await coordinator.rankedCommand(actor.playerId,name,realm,raw)};
 }catch(error){if(error.code)return {status:error.status||409,body:{error:error.code}};console.error(JSON.stringify({event:'ranked_request_failed'}));return {status:503,body:{error:'ranked_unavailable'}}}
}
