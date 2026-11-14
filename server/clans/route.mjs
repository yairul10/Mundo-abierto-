import {verifiedPvpAccount} from '../pvp/account.mjs';
import {clanAccountState} from './store.mjs';
export async function clanRoute(request,env){
 const url=new URL(request.url),realm=url.searchParams.get('realm')||'normal';
 if(!['normal','test'].includes(realm))return {status:400,body:{error:'invalid_realm'}};
 if(realm==='test'&&env.TEST_SERVER_ENABLED==='false')return {status:403,body:{error:'test_closed'}};
 const actor=await verifiedPvpAccount(request,env,realm);
 if(actor.error)return {status:actor.status,body:{error:actor.error}};
 if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(url.pathname!=='/clans/me')return {status:404,body:{error:'not_found'}};
 if(request.method!=='GET')return {status:405,body:{error:'method_not_allowed'}};
 if(!env.CLANS_DB)return {status:503,body:{error:'clans_unavailable'}};
 try{return {status:200,body:await clanAccountState(env.CLANS_DB,realm,actor.playerId)}}
 catch{console.error(JSON.stringify({event:'clan_read_failed',realm}));return {status:503,body:{error:'clans_unavailable'}}}
}
