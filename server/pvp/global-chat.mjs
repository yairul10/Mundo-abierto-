import {handleChat} from './chat.mjs';
import {verifiedPvpAccount} from './account.mjs';
const contexts=new WeakMap();
// A chat-only object uses the existing namespace without creating a game room or simulation.
export async function globalChatRoute(request,env,body){
 const realm=body.realm||'normal';
 if(!['normal','test'].includes(realm))return {status:400,body:{error:'invalid_realm'}};
 if(realm==='test'&&env.TEST_SERVER_ENABLED==='false')return {status:403,body:{error:'test_closed'}};
 const actor=await verifiedPvpAccount(request,env,realm);
 if(actor.error)return {status:actor.status,body:{error:actor.error}};
 if(actor.testGuest)return {status:403,body:{error:'google_required'}};
 if(!body.message||typeof body.message.type!=='string'||!body.message.type.startsWith('chat'))return {status:400,body:{error:'invalid_chat_action'}};
 if(!env.CLANS_DB)return {status:503,body:{error:'chat_unavailable'}};
 const profile=await env.CLANS_DB.prepare('SELECT display_name FROM players WHERE id=?').bind(actor.playerId).first();
 const result=await env.ROOMS.getByName('global-chat-'+realm).globalChat({id:actor.playerId,name:profile?.display_name||'Piloto'},body.message);
 return {status:200,body:{pilotId:actor.playerId,events:result}};
}
export async function globalChatRequest(ctx,env,p,message){
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS global_chat_sessions(id TEXT PRIMARY KEY,data TEXT NOT NULL,updated INTEGER NOT NULL)');
 const events=[];
 const load=()=>({...JSON.parse(ctx.storage.sql.exec('SELECT data FROM global_chat_sessions WHERE id=?',p.id).toArray()[0]?.data||'{}'),id:p.id});
 const ws={deserializeAttachment:load,serializeAttachment:value=>ctx.storage.sql.exec('INSERT INTO global_chat_sessions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated',p.id,JSON.stringify(value),Date.now()),send:value=>events.push(JSON.parse(value))};
 let stable=contexts.get(ctx);if(!stable){stable={storage:ctx.storage,getWebSockets:()=>[]};contexts.set(ctx,stable)}
 stable.getWebSockets=()=>[ws];
 await handleChat(stable,env,ws,p,message);
 ctx.storage.sql.exec('DELETE FROM global_chat_sessions WHERE updated<?',Date.now()-86400000);
 return events;
}
