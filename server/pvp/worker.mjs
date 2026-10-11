import { DurableObject } from 'cloudflare:workers';
import {makeCombatPlayer,ability,volley,stepCombat} from './combat.mjs';

const VERSION='0.2.0';
const ORIGINS=new Set(['https://yairul10.github.io','https://localhost','http://localhost','capacitor://localhost']);
const encoder=new TextEncoder();
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const code=()=>String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
const name=value=>String(value||'Piloto').trim().slice(0,24)||'Piloto';
const json=(data,status=200,origin='')=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
function equal(a,b){const x=encoder.encode(a),y=encoder.encode(b);return x.length===y.length&&crypto.subtle.timingSafeEqual(x,y)}
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)return {};
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();throw new Error('body_too_large')}chunks.push(value)}
 const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}
 return JSON.parse(new TextDecoder().decode(data));
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(origin&&!ORIGINS.has(origin))return json({error:'origin_denied'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,game:'mundo-abierto',version:VERSION,stage:'backend-prototype',modes:['1v1'],persistentSoloGame:false},200,origin);
  if(!(await env.API_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return json({error:'rate_limit'},429,origin);
  try {
   if(request.method==='POST'&&url.pathname==='/rooms'){
    const body=await readBody(request);
    for(let i=0;i<8;i++){const room=code(),result=await env.ROOMS.getByName(room).create(room,name(body.name),body.profile);if(!result.error)return json(result,201,origin)}
    return json({error:'room_creation_busy'},503,origin);
   }
   const join=url.pathname.match(/^\/rooms\/(\d{6})\/join$/);
   if(join&&request.method==='POST'){const body=await readBody(request);const result=await env.ROOMS.getByName(join[1]).join(name(body.name),body.profile);return json(result,result.error?409:200,origin)}
   const socket=url.pathname.match(/^\/rooms\/(\d{6})\/socket$/);
   if(socket&&request.method==='GET')return env.ROOMS.getByName(socket[1]).fetch(request);
   if(url.pathname==='/matchmake'&&request.method==='POST'){
    const body=await readBody(request),region=['sa','na','eu','other'].includes(body.region)?body.region:'sa';
    const result=await env.LOBBIES.getByName('casual-1v1:'+region).enqueue(name(body.name),body.profile);return json(result,result.error?503:200,origin);
   }
   return json({error:'not_found'},404,origin);
  }catch(error){console.error(JSON.stringify({event:'request_failure',path:url.pathname,error:error?.message==='body_too_large'?'body_too_large':'invalid_request'}));return json({error:'invalid_request'},400,origin)}
 }
};

export class ArenaRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)')})}
 load(){return this.ctx.storage.sql.exec('SELECT data FROM room_state WHERE id=1').toArray().map(r=>JSON.parse(r.data))[0]||null}
 persist(s){this.ctx.storage.sql.exec('INSERT INTO room_state(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(s))}
 snapshot(s){return {type:'state',room:s.code,status:s.status,startedAt:s.startedAt||null,winner:s.winner||null,reason:s.reason||null,serverTime:Date.now(),players:s.players.map(({id,name,hp,energy,pos,connected,profile,seq,aim,firing,abilityUntil})=>({id,name,hp,energy,pos,connected,profile,seq,aim,firing,abilityUntil})),rules:{maxHp:600,speed:220,range:1200,damage:20,fireCooldownMs:500,arenaRadius:1500}}}
 broadcast(s){const data=JSON.stringify(this.snapshot(s));for(const ws of this.ctx.getWebSockets()){try{ws.send(data)}catch{}}}
 create(room,pilot,raw){
  const old=this.load();if(old&&Date.now()<old.expiresAt)return {error:'room_exists'};
  for(const ws of this.ctx.getWebSockets()){try{ws.close(1000,'room expired')}catch{}}
  const ticket=token(),now=Date.now();const player={id:crypto.randomUUID(),name:pilot,token:ticket,hp:600,pos:[0,0,400],connected:false,lastInput:now,lastSeen:now,lastFire:0,seq:-1};
  makeCombatPlayer(player,raw);
  const s={code:room,status:'waiting',expiresAt:now+600000,players:[player]};this.persist(s);
  this.ctx.waitUntil(this.ctx.storage.setAlarm(s.expiresAt));return {room,playerId:player.id,token:ticket,expiresAt:s.expiresAt,status:s.status};
 }
 join(pilot,raw){
  const s=this.load();if(!s||Date.now()>=s.expiresAt||s.status!=='waiting')return {error:'room_unavailable'};
  if(s.players.length>=2)return {error:'room_full'};
  const now=Date.now(),ticket=token(),player={id:crypto.randomUUID(),name:pilot,token:ticket,hp:600,pos:[0,0,-400],connected:false,lastInput:now,lastSeen:now,lastFire:0,seq:-1};
  makeCombatPlayer(player,raw);s.players.push(player);this.persist(s);this.broadcast(s);return {room:s.code,playerId:player.id,token:ticket,expiresAt:s.expiresAt,status:s.status};
 }
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'websocket_required'},426);
  const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim()),ticket=protocols[1]||'';
  const s=this.load(),player=s?.players.find(p=>equal(p.token,ticket));
  if(protocols[0]!=='mundo-v1'||!player||Date.now()>=s.expiresAt||s.status==='finished')return json({error:'invalid_ticket'},403);
  for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.id===player.id)return json({error:'already_connected'},409);
  const [client,server]=Object.values(new WebSocketPair());
  this.ctx.acceptWebSocket(server);server.serializeAttachment({id:player.id,windowStart:Date.now(),count:0});
  player.connected=true;player.lastSeen=player.lastInput=Date.now();delete player.disconnectedAt;
  if(s.players.length===2&&s.players.every(p=>p.connected)&&s.status==='waiting'){s.status='active';s.startedAt=Date.now();s.simTime=s.startedAt;s.expiresAt=s.startedAt+180000}
  this.persist(s);await this.ctx.storage.setAlarm(s.status==='active'?Date.now()+3000:s.expiresAt);this.broadcast(s);
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'mundo-v1'}});
 }
 async webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>8192){ws.close(1009,'message too large');return}
  const now=Date.now(),attachment=ws.deserializeAttachment();if(!attachment)return;
  if(now-attachment.windowStart>=1000){attachment.windowStart=now;attachment.count=0}
  attachment.count++;ws.serializeAttachment(attachment);if(attachment.count>35){ws.close(1008,'rate limit');return}
  let m;try{m=JSON.parse(message)}catch{ws.send(JSON.stringify({type:'error',error:'invalid_json'}));return}
  const s=this.load(),p=s?.players.find(p=>p.id===attachment.id);if(!p||s.status==='finished')return;
  p.lastSeen=now;stepCombat(s,now);if(s.status==='active'){const dead=s.players.find(x=>x.hp<=0);if(dead){this.finish(s,s.players.find(x=>x.id!==dead.id)?.id||null,'destroyed');return}}

  if(m.type==='ping'){this.persist(s);ws.send(JSON.stringify({type:'pong',serverTime:now,echo:typeof m.time==='number'?m.time:null}));return}
  if(m.type==='leave'){this.finish(s,s.players.find(x=>x.id!==p.id)?.id||null,'leave');return}
  if(s.status!=='active')return;
  if(m.type==='input'){
   if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq||!Array.isArray(m.move)||m.move.length!==3||!m.move.every(Number.isFinite))return;
   const length=Math.hypot(...m.move);if(length>1.001)return;
   const dt=Math.max(0,Math.min(.15,(now-p.lastInput)/1000));p.lastInput=now;p.seq=m.seq;
   if(Array.isArray(m.aim)&&m.aim.length===2&&m.aim.every(Number.isFinite))p.aim=[Math.max(-1000,Math.min(1000,m.aim[0])),Math.max(-1.15,Math.min(1.15,m.aim[1]))];p.firing=!!m.firing;
   p.pos=p.pos.map((v,i)=>v+m.move[i]*(p.profile?.speed||220)*dt);const radius=Math.hypot(...p.pos);if(radius>1500)p.pos=p.pos.map(v=>v*1500/radius);
  }else if(m.type==='ability'){if(!ability(p,now))return;
  }else if(m.type==='volley'){const bullets=volley(s,p,m,now);if(!bullets)return;const data=JSON.stringify({type:'volley',owner:p.id,shots:bullets,serverTime:now});for(const peer of this.ctx.getWebSockets()){try{peer.send(data)}catch{}}
  }else if(m.type==='fire'){
   if(p.profile)return;
   if(now-p.lastFire<500||!Array.isArray(m.direction)||m.direction.length!==3||!m.direction.every(Number.isFinite))return;
   const length=Math.hypot(...m.direction);if(length<.99||length>1.01)return;
   p.lastFire=now;const direction=m.direction.map(v=>v/length),target=s.players.find(x=>x.id!==p.id);
   if(target&&target.connected){const delta=target.pos.map((v,i)=>v-p.pos[i]),along=delta.reduce((sum,v,i)=>sum+v*direction[i],0),distance=Math.hypot(...delta);if(distance<=1200&&along>=0&&Math.hypot(...delta.map((v,i)=>v-along*direction[i]))<=35){target.hp=Math.max(0,target.hp-20);if(!target.hp){this.finish(s,p.id,'destroyed');return}}}
  }else return;
  this.persist(s);this.broadcast(s);
 }
 finish(s,winner,reason){if(s.status==='finished')return;s.status='finished';s.winner=winner;s.reason=reason;s.expiresAt=Date.now()+60000;this.persist(s);this.broadcast(s);for(const ws of this.ctx.getWebSockets()){try{ws.close(1000,'match ended')}catch{}}this.ctx.waitUntil(this.ctx.storage.setAlarm(s.expiresAt))}
 async webSocketClose(ws){const id=ws.deserializeAttachment()?.id,s=this.load(),p=s?.players.find(p=>p.id===id);if(!p||s.status==='finished')return;p.connected=false;p.disconnectedAt=Date.now();this.persist(s);this.broadcast(s);await this.ctx.storage.setAlarm(Date.now()+3000)}
 async webSocketError(ws){await this.webSocketClose(ws)}
 async alarm(){
  const s=this.load();if(!s)return;const now=Date.now();
  if(s.status==='finished'){this.ctx.storage.sql.exec('DELETE FROM room_state');return}
  if(now>=s.expiresAt){this.finish(s,null,'timeout');return}
  if(s.status==='active'){
   const missing=s.players.filter(p=>!p.connected&&now-(p.disconnectedAt||now)>=12000||p.connected&&now-p.lastSeen>=15000);
   if(missing.length){const winner=s.players.find(p=>!missing.includes(p));this.finish(s,winner?.id||null,'disconnect');return}
   await this.ctx.storage.setAlarm(now+3000);
  }else await this.ctx.storage.setAlarm(s.expiresAt);
 }
}

export class ArenaLobby extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.queue=Promise.resolve();ctx.blockConcurrencyWhile(async()=>{ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS waiting (id INTEGER PRIMARY KEY CHECK(id=1), room TEXT, expires INTEGER)')})}
 enqueue(pilot,raw){const operation=this.queue.then(()=>this.reserve(pilot,raw));this.queue=operation.catch(()=>{});return operation}
 async reserve(pilot,raw){
  const rows=this.ctx.storage.sql.exec('SELECT room,expires FROM waiting WHERE id=1').toArray();const row=rows[0];
  if(row&&row.expires>Date.now()){const result=await this.env.ROOMS.getByName(row.room).join(pilot,raw);this.ctx.storage.sql.exec('DELETE FROM waiting');if(!result.error)return {...result,matched:true}}
  for(let i=0;i<8;i++){const room=code(),result=await this.env.ROOMS.getByName(room).create(room,pilot,raw);if(!result.error){this.ctx.storage.sql.exec('INSERT INTO waiting(id,room,expires) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET room=excluded.room,expires=excluded.expires',room,Date.now()+60000);return {...result,matched:false}}}
  return {error:'queue_busy'};
 }
}
