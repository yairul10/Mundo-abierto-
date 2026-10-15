import {DurableObject} from 'cloudflare:workers';
import {WORLD,equip,importRoster,reset,safe,advance,invite,reply,attack,useAbility,endDuel,duelFor} from './world-rules.mjs';
const json=(x,status=200)=>Response.json(x,{status});
const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export class SharedWorld extends DurableObject {
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS shared_world (id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)')})}
 worldLoad(){const row=this.ctx.storage.sql.exec('SELECT data FROM shared_world WHERE id=1').toArray()[0];return row?JSON.parse(row.data):{players:[],duels:[],invites:[],events:[]}}
 worldSave(s){s.events=s.events.slice(-12);this.ctx.storage.sql.exec('INSERT INTO shared_world(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(s))}
 worldSnapshot(s){return {type:'world',serverTime:Date.now(),rules:WORLD,players:s.players.filter(p=>p.connected).map(({id,name,profile,hp,energy,pos,aim,seq,duelId,abilityUntil,revision})=>({id,name,profile,hp,energy,pos,aim,seq,duelId,abilityUntil,revision})),duels:s.duels.map(({bullets,simTime,...d})=>d),invites:s.invites,events:s.events}}
 worldBroadcast(s){const data=JSON.stringify(this.worldSnapshot(s));for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.world)try{ws.send(data)}catch{}}
 async enter(body){
  if(!/^[a-f0-9]{64}$/.test(body.guestKey||''))return {error:'invalid_guest'};
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.guestKey)),id=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
  const now=Date.now(),s=this.worldLoad();advance(s,now);
  // Las reservas sin conexión caducan; nunca se persisten claves de invitado.
  s.players=s.players.filter(p=>p.connected||now-p.lastSeen<30000);
  let p=s.players.find(x=>x.id===id);if(p?.connected)return {error:'already_connected'};
  if(!p&&s.players.length>=WORLD.capacity)return {error:'world_full'};
  if(!p){p={id,pos:[...WORLD.spawn],seq:-1,aim:[0,0],connected:false,revision:0};s.players.push(p)}
  p.name=String(body.name||'Invitado').trim().slice(0,20)||'Invitado';p.token=secret();p.lastSeen=p.lastInput=now;p.seq=-1;const angle=parseInt(id.slice(-6),16)*Math.PI/180,radius=260+parseInt(id.slice(0,2),16)%100;p.spawn=[Math.cos(angle)*radius,120,Math.sin(angle)*radius];p.roster=importRoster(body.roster);equip(p,body.shipId)||equip(p,Object.keys(p.roster)[0]);reset(p,true);
  this.worldSave(s);await this.ctx.storage.setAlarm(now+15000);return {playerId:id,token:p.token,expiresAt:now+30000};
 }
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'websocket_required'},426);
  const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim()),s=this.worldLoad(),now=Date.now();
  const p=s.players.find(x=>x.token===protocols[1]&&now-x.lastSeen<30000);
  if(protocols[0]!=='mundo-world-v1'||!p)return json({error:'invalid_ticket'},403);
  if(p.connected)return json({error:'already_connected'},409);
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({world:true,id:p.id,windowStart:now,count:0});
  p.connected=true;p.lastSeen=p.lastInput=now;this.worldSave(s);this.worldBroadcast(s);await this.ctx.storage.setAlarm(now+3000);
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'mundo-world-v1'}});
 }
 async webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>8192){ws.close(1009,'message too large');return}
  const now=Date.now(),a=ws.deserializeAttachment();if(!a?.world)return;
  if(now-a.windowStart>=1000){a.windowStart=now;a.count=0}if(++a.count>40){ws.close(1008,'rate limit');return}ws.serializeAttachment(a);
  let m;try{m=JSON.parse(message)}catch{return}if(!m||typeof m!=='object')return;
  const s=this.worldLoad(),p=s.players.find(x=>x.id===a.id&&x.connected);if(!p)return;p.lastSeen=now;advance(s,now);
  let error=null;
  if(m.type==='input'){
   if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq||!Array.isArray(m.move)||m.move.length!==3||!m.move.every(Number.isFinite)||Math.hypot(...m.move)>1.001)return;
   const dt=Math.max(0,Math.min(.15,(now-p.lastInput)/1000));p.lastInput=now;p.seq=m.seq;p.firing=!!m.firing;
   if(Array.isArray(m.aim)&&m.aim.length===2&&m.aim.every(Number.isFinite))p.aim=[Math.max(-1000,Math.min(1000,m.aim[0])),Math.max(-1.15,Math.min(1.15,m.aim[1]))];
   p.pos=p.pos.map((v,i)=>v+m.move[i]*p.profile.speed*dt);const r=Math.hypot(...p.pos);if(r>WORLD.radius)p.pos=p.pos.map(v=>v*WORLD.radius/r);
  }else if(m.type==='invite')error=invite(s,p,m.target,now);
  else if(m.type==='reply')error=reply(s,p,m.id,m.accept===true,now);
  else if(m.type==='ship'){
   if(p.duelId||!safe(p))error='base_only';else if(!equip(p,m.shipId))error='invalid_ship';else {reset(p);s.invites=s.invites.filter(i=>i.from!==p.id&&i.to!==p.id)}
  }else if(m.type==='name'){p.name=String(m.name||'Invitado').trim().slice(0,20)||'Invitado';}
  else if(m.type==='ability'){if(!useAbility(s,p,now))error='no_duel';}
  else if(m.type==='volley'){const bullets=attack(s,p,m,now);if(bullets){const data=JSON.stringify({type:'volley',owner:p.id,shots:bullets,serverTime:now});for(const peer of this.ctx.getWebSockets())try{peer.send(data)}catch{}}}
  else if(m.type==='surrender'){const d=duelFor(s,p);if(d)endDuel(s,d,d.a===p.id?d.b:d.a,'surrender',now)}
  else if(m.type==='ping'){ws.send(JSON.stringify({type:'pong',echo:m.time,serverTime:now}));}
  else if(m.type==='leave'){await this.worldDisconnect(ws);try{ws.close(1000,'leave')}catch{}return}
  else return;
  this.worldSave(s);if(error)ws.send(JSON.stringify({type:'error',error}));this.worldBroadcast(s);
 }
 async worldDisconnect(ws){const s=this.worldLoad(),p=s.players.find(x=>x.id===ws.deserializeAttachment()?.id);if(!p?.connected)return;p.connected=false;p.lastSeen=Date.now();advance(s,Date.now());this.worldSave(s);this.worldBroadcast(s)}
 async webSocketClose(ws){await this.worldDisconnect(ws)}
 async webSocketError(ws){await this.worldDisconnect(ws)}
 async alarm(){const s=this.worldLoad(),now=Date.now();for(const p of s.players)if(p.connected&&now-p.lastSeen>15000){p.connected=false;for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.id===p.id)try{ws.close(1001,'timeout')}catch{}}
  advance(s,now);s.players=s.players.filter(p=>p.connected||now-p.lastSeen<30000);this.worldSave(s);this.worldBroadcast(s);if(s.players.length)await this.ctx.storage.setAlarm(now+3000);
 }
}
