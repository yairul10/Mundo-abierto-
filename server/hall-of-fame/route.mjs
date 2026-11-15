import {warAdmin} from '../clan-wars/route.mjs';
import {levelAudit} from './audit.mjs';
import {verifiedPvpAccount} from '../pvp/account.mjs';
import {clanRanking} from '../clans/missions.mjs';
import {rankedCoordinator} from '../matchmaking/route.mjs';
import {levelRanking} from './levels.mjs';
export async function hallOfFameRoute(request,env){
 const url=new URL(request.url),realm=url.searchParams.get('realm')||'normal',tab=url.searchParams.get('tab')||'clans';
 if(request.method!=='GET')return {status:405,body:{error:'method_not_allowed'}};
 if(!['normal','test'].includes(realm)||!['clans','ranks','levels','audit'].includes(tab))return {status:400,body:{error:'invalid_request'}};
 if(realm==='test'&&env.TEST_SERVER_ENABLED==='false')return {status:403,body:{error:'test_closed'}};
 const actor=await verifiedPvpAccount(request,env,realm);if(actor.error)return {status:actor.status,body:{error:actor.error}};if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(!(await env.API_LIMIT.limit({key:'hall:'+actor.playerId})).success)return {status:429,body:{error:'rate_limit'}};
 if(!env.CLANS_DB)return {status:503,body:{error:'hall_unavailable'}};
 try{
  const admin=await warAdmin(actor.playerId,env);if(tab==='audit'&&!admin)return {status:403,body:{error:'admin_required'}};
  let result;
  if(tab==='audit'){if(realm!=='normal')return {status:400,body:{error:'normal_only'}};result=await levelAudit(env.CLANS_DB,{query:url.searchParams.get('q')||'',pilot:url.searchParams.get('pilot')||'',before:url.searchParams.has('before')?Number(url.searchParams.get('before')):null,flagged:url.searchParams.get('flagged')!=='0'});}
  else if(tab==='ranks')result=await rankedCoordinator(env,realm).hallRanking(actor.playerId);
  else if(tab==='levels')result=await levelRanking(env.CLANS_DB,actor.playerId,realm);
  else{result=await clanRanking(env.CLANS_DB,realm);const membership=await env.CLANS_DB.prepare('SELECT clan_id FROM clan_members WHERE realm=? AND account_id=?').bind(realm,actor.playerId).first();result.ranking=result.ranking.map(row=>({...row,own:row.id===membership?.clan_id}));result.mine=result.ranking.find(row=>row.own)||null;result.inClan=!!membership;}
  return {status:200,body:{tab,realm,admin,updatedAt:Date.now(),...result}};
 }catch(error){if(error.code)return {status:error.status||400,body:{error:error.code}};console.error(JSON.stringify({event:'hall_of_fame_failed',tab,realm}));return {status:503,body:{error:'hall_unavailable'}}}
}
