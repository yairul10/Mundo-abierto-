import {pvpRoomName} from './pvp-match.mjs';
import {DurableObject} from 'cloudflare:workers';
import {ROOM_CODE,roomName} from './expedition.mjs';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
export class CoopLobby extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS pvp_rooms(code TEXT PRIMARY KEY, visibility TEXT NOT NULL, created_at INTEGER NOT NULL, closed INTEGER NOT NULL DEFAULT 0)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS coop_rooms(code TEXT PRIMARY KEY, visibility TEXT NOT NULL, created_at INTEGER NOT NULL, closed INTEGER NOT NULL DEFAULT 0)');ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS coop_open ON coop_rooms(visibility,closed,created_at)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS coop_members(account_id TEXT NOT NULL, code TEXT NOT NULL, seen_at INTEGER NOT NULL, PRIMARY KEY(account_id,code))')}
 chooseRoom(action,code,attempted){
  if(action==='join'||action==='resume')return this.ctx.storage.sql.exec('SELECT code,visibility FROM coop_rooms WHERE code=?',code).toArray().find(r=>action==='resume'||r.visibility==='private')||null;
  if(action==='common'){
   const open=this.ctx.storage.sql.exec("SELECT code,visibility FROM coop_rooms WHERE visibility='common' AND closed=0 ORDER BY created_at DESC LIMIT 200").toArray().find(r=>!attempted.has(r.code));if(open)return open;
  }
  let next;do{next=newCode()}while(this.ctx.storage.sql.exec('SELECT code FROM coop_rooms WHERE code=?',next).toArray().length);
  const visibility=action==='create'?'private':'common';this.ctx.storage.sql.exec('INSERT INTO coop_rooms(code,visibility,created_at) VALUES(?,?,?)',next,visibility,Date.now());return {code:next,visibility};
 }
 async pendingRooms(accountId,realm,exclude){
  const pending=[];
  const rooms=this.ctx.storage.sql.exec('SELECT code FROM coop_members WHERE account_id=? ORDER BY seen_at DESC LIMIT 8',accountId).toArray();
  for(const room of rooms){if(room.code===exclude)continue;const result=await this.env.ROOMS.getByName(roomName(realm,room.code)).pendingForAccount(accountId);if(result.receipts.length)pending.push({code:room.code,receipts:result.receipts})}
  return pending;
 }
 async enterRoom(body){
  const realm=body.realm==='test'?'test':'normal',choice=body.coop||{},action=choice.action;
  if(!['common','create','join','resume'].includes(action))return {error:'invalid_room_choice'};
  const code=String(choice.code||'').trim().toUpperCase();if(['join','resume'].includes(action)&&!ROOM_CODE.test(code))return {error:'invalid_room_code'};
  const attempted=new Set();
  for(let attempt=0;attempt<202;attempt++){
   const room=this.chooseRoom(action,code,attempted);if(!room)return {error:'room_not_found'};
   const stub=this.env.ROOMS.getByName(roomName(realm,room.code)),ticket=await stub.enter({...body,coopRoom:{...room,realm}});
   if(!ticket.error){this.ctx.storage.sql.exec('INSERT INTO coop_members(account_id,code,seen_at) VALUES(?,?,?) ON CONFLICT(account_id,code) DO UPDATE SET seen_at=excluded.seen_at',body.accountId,room.code,Date.now());return {...ticket,room:{code:room.code,visibility:room.visibility},pendingRooms:await this.pendingRooms(body.accountId,realm,room.code)}}
   if(['room_finished','room_abandoned'].includes(ticket.error))this.ctx.storage.sql.exec('UPDATE coop_rooms SET closed=1 WHERE code=?',room.code);
   if(action!=='common'||ticket.error==='already_connected')return {...ticket,pendingRooms:await this.pendingRooms(body.accountId,realm,null)};
   attempted.add(room.code);
  }
  return {error:'rooms_busy'};
 }
 async enterDuel(body){
  const action=body.arena?.action,code=String(body.arena?.code||'').trim().toUpperCase(),realm=body.realm==='test'?'test':'normal';
  if(!['find','create','join','resume','bot'].includes(action))return {error:'invalid_room_choice'};
  if(['join','resume'].includes(action)&&!ROOM_CODE.test(code))return {error:'invalid_room_code'};
  const attempted=new Set();
  for(let i=0;i<202;i++){
   let room;
   if(['join','resume'].includes(action))room=this.ctx.storage.sql.exec('SELECT code,visibility FROM pvp_rooms WHERE code=?',code).toArray().find(r=>action==='resume'||r.visibility==='private');
   else if(action==='find')room=this.ctx.storage.sql.exec("SELECT code,visibility FROM pvp_rooms WHERE visibility='public' AND closed=0 ORDER BY created_at DESC LIMIT 200").toArray().find(r=>!attempted.has(r.code));
   if(!room&&['join','resume'].includes(action))return {error:'room_not_found'};
   if(!room){let next;do{next=newCode()}while(this.ctx.storage.sql.exec('SELECT code FROM pvp_rooms WHERE code=?',next).toArray().length);room={code:next,visibility:action==='bot'?'practice':action==='create'?'private':'public'};this.ctx.storage.sql.exec('INSERT INTO pvp_rooms(code,visibility,created_at) VALUES(?,?,?)',room.code,room.visibility,Date.now())}
   const ticket=await this.env.ROOMS.getByName(pvpRoomName(realm,room.code)).enter({...body,pvpRoom:{...room,realm,bot:room.visibility==='practice'}});
   if(!ticket.error)return {...ticket,arena:room};
   if(['match_finished','match_started'].includes(ticket.error))this.ctx.storage.sql.exec('UPDATE pvp_rooms SET closed=1 WHERE code=?',room.code);
   if(action!=='find'||!['world_full','match_finished','match_started'].includes(ticket.error))return ticket;attempted.add(room.code);
  }
  return {error:'rooms_busy'};
 }

}

