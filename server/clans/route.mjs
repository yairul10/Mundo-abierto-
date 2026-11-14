import {clanChat} from './chat.mjs';
import {clanAdmin} from './admin.mjs';
import {clanMembership} from './membership.mjs';
import {createClan,editClan} from './write.mjs';
import {verifiedPvpAccount} from '../pvp/account.mjs';
import {clanAccountState,searchClans,publicClan,clanBadges} from './store.mjs';
// Names come from verified Google Play identities, never a client-supplied nickname.
async function withPilotNames(db,body,hideMemberIds=false){
 const rows=[...(body.clan?.members||[]),...(body.pendingRequests||[]),...(body.outgoingInvitations||[]),...(body.messages||[])];
 const ids=[...new Set(rows.map(row=>row.account_id||row.author).filter(Boolean))];
 if(ids.length){
  const result=await db.prepare('SELECT id,display_name FROM players WHERE id IN ('+ids.map(()=>'?').join(',')+')').bind(...ids).all();
  const names=new Map(result.results.map(row=>[row.id,String(row.display_name||'').trim()]));
  for(const row of rows){const name=names.get(row.account_id||row.author);row.pilot=name||'Nombre no disponible';if(row.author)row.name=row.pilot;}
 }
 if(hideMemberIds)for(const row of body.clan?.members||[])delete row.account_id;
 return body;
}
export async function clanRoute(request,env){
 const url=new URL(request.url),realm=url.searchParams.get('realm')||'normal';
 if(!['normal','test'].includes(realm))return {status:400,body:{error:'invalid_realm'}};
 if(realm==='test'&&env.TEST_SERVER_ENABLED==='false')return {status:403,body:{error:'test_closed'}};
 const actor=await verifiedPvpAccount(request,env,realm);
 if(actor.error)return {status:actor.status,body:{error:actor.error}};
 if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(!['/clans/me','/clans/search','/clans/detail','/clans/create','/clans/edit','/clans/membership','/clans/admin','/clans/badges','/clans/chat'].includes(url.pathname))return {status:404,body:{error:'not_found'}};
 const mutation=['/clans/create','/clans/edit','/clans/membership','/clans/admin','/clans/badges','/clans/chat'].includes(url.pathname);if(request.method!==(mutation?'POST':'GET'))return {status:405,body:{error:'method_not_allowed'}};
 if(!env.CLANS_DB)return {status:503,body:{error:'clans_unavailable'}};
 try{
  if(mutation){const reader=request.body?.getReader();if(!reader)return {status:400,body:{error:'invalid_request'}};let bytes=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();return {status:413,body:{error:'body_too_large'}}}chunks.push(value)}const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}let raw;try{raw=JSON.parse(new TextDecoder().decode(buffer))}catch{return {status:400,body:{error:'invalid_request'}}}return {status:200,body:url.pathname==='/clans/chat'?await withPilotNames(env.CLANS_DB,await clanChat(env.CLANS_DB,realm,actor.playerId,raw)):url.pathname==='/clans/badges'?await clanBadges(env.CLANS_DB,realm,raw?.ids):url.pathname==='/clans/create'?await createClan(env.CLANS_DB,realm,actor.playerId,raw):url.pathname==='/clans/membership'?await clanMembership(env.CLANS_DB,realm,actor.playerId,raw):url.pathname==='/clans/admin'?await clanAdmin(env.CLANS_DB,realm,actor.playerId,raw):await editClan(env.CLANS_DB,realm,actor.playerId,raw)}}
  if(url.pathname==='/clans/search'){const q=url.searchParams.get('q')||'';if(q.length>40)return {status:400,body:{error:'invalid_search'}};return {status:200,body:await searchClans(env.CLANS_DB,realm,q)}}
  if(url.pathname==='/clans/detail'){const id=url.searchParams.get('id')||'';if(!/^[A-Za-z0-9_-]{1,64}$/.test(id))return {status:400,body:{error:'invalid_clan'}};const clan=await publicClan(env.CLANS_DB,realm,id,true);return clan?{status:200,body:await withPilotNames(env.CLANS_DB,{clan},true)}:{status:404,body:{error:'clan_not_found'}}}
  return {status:200,body:await withPilotNames(env.CLANS_DB,{...await clanAccountState(env.CLANS_DB,realm,actor.playerId),pilotId:actor.playerId})}
 }
 catch(error){if(error.status&&typeof error.code==='string')return {status:error.status||409,body:{error:error.code}};console.error(JSON.stringify({event:'clan_read_failed',realm}));return {status:503,body:{error:'clans_unavailable'}}}
}
