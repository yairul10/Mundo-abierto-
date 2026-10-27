import {compatiblePvpClient} from './client-version.mjs';
import {initResults,persistResults,rankings} from './pvp-results.mjs';
import {requestRespawn,confirmRespawn} from './respawn.mjs';
import {migrateGuestRewards} from './account.mjs';
import {handleChat} from './chat.mjs';
import {arenaEnemySnapshots} from './arena-enemies.mjs';
import {bossSnapshot} from './cooperative-boss.mjs';
import {equippedSkills,validSkills} from './skills.mjs';
import {testServerEnabled} from './test-config.mjs';
import {DurableObject} from 'cloudflare:workers';
import {WORLD,zoneOf,duelFor,finishDuel,changeFormation,equip,importRoster,reset,safe,advance,invite,reply,attack,useAbility,protectedAt,updateProtection,openHangar,applyHangarLoadout,setSkills,usePvpSkill} from './world-rules.mjs';
const json=(x,status=200)=>Response.json(x,{status});
const pForProtection=(s,id)=>s.players.find(p=>p.id===id);
const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export class SharedWorld extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.env=env;this.memory=null;this.lastCheckpoint=0;this.lastBroadcast=0;this.simulation=null;ctx.blockConcurrencyWhile(async()=>{initResults(ctx);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS shared_world (id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS boss_rewards (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, amount INTEGER NOT NULL, damage REAL NOT NULL, total_damage REAL NOT NULL, boss_id TEXT NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, materials TEXT NOT NULL DEFAULT '{}')");if(!ctx.storage.sql.exec('PRAGMA table_info(boss_rewards)').toArray().some(c=>c.name==='materials'))ctx.storage.sql.exec("ALTER TABLE boss_rewards ADD COLUMN materials TEXT NOT NULL DEFAULT '{}'");if(!ctx.storage.sql.exec('PRAGMA table_info(boss_rewards)').toArray().some(c=>c.name==='xp'))ctx.storage.sql.exec("ALTER TABLE boss_rewards ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS boss_rewards_pending ON boss_rewards(player_id,claimed)')})}
 // SQLite is authoritative at checkpoints; live combat stays in memory in both realms.
 worldLoad(){
  if(this.memory)return this.memory;
  const row=this.ctx.storage.sql.exec('SELECT data FROM shared_world WHERE id=1').toArray()[0];
  const s=row?JSON.parse(row.data):{players:[],duels:[],invites:[],events:[]};
  // A restart may discard sockets; never retain disconnected pilots as live slots.
  const connected=new Set(this.ctx.getWebSockets().filter(ws=>ws.readyState===1).map(ws=>ws.deserializeAttachment()?.id));
  for(const p of s.players)p.connected=connected.has(p.id);
  this.memory=s;return s;
 }
 worldSave(s,force=false){
  s.events=s.events.slice(-12);
  const now=Date.now(),pending=s.bossRewards||[];
  this.memory=s;
  if(!force&&!s.critical&&!pending.length&&now-this.lastCheckpoint<5000)return;
  this.ctx.storage.transactionSync(()=>{
   persistResults(this.ctx,s);for(const r of pending)this.ctx.storage.sql.exec('INSERT OR IGNORE INTO boss_rewards(id,player_id,amount,damage,total_damage,boss_id,materials,xp) VALUES(?,?,?,?,?,?,?,?)',r.id,r.playerId,r.amount,r.damage,r.totalDamage,r.bossId,JSON.stringify(r.materials||{}),Math.max(0,Math.min(15000000,Math.floor(Number(r.xp)||0))));
   this.ctx.storage.sql.exec('INSERT INTO shared_world(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify({...s,bossRewards:[],pendingKills:[],critical:false}));
  });
  // Clear receipts only after commit, so an exception cannot discard pending awards.
  s.bossRewards=[];s.pendingKills=[];s.critical=false;this.lastCheckpoint=now;
 }
 stopSimulation(){
  if(this.simulation){clearInterval(this.simulation);this.simulation=null}
 }
 startSimulation(s){
  if(this.simulation||!s.players.some(p=>p.connected))return;
  this.simulation=setInterval(()=>{
   try{
    const current=this.worldLoad();
    advance(current,Date.now());this.worldSave(current);this.worldBroadcast(current);
    if(!current.players.some(p=>p.connected)){this.stopSimulation();this.worldSave(current,true)}
   }catch(error){
    console.error('arena_tick_failed',error?.message);this.stopSimulation();
    for(const ws of this.ctx.getWebSockets())try{ws.close(1011,'simulation_restart')}catch{}
   }
  },100);
 }
 sendRewards(ws,id){const attachment=ws.deserializeAttachment(),now=Date.now();if(now-(attachment.lastRewardsAt||0)<3000)return;attachment.lastRewardsAt=now;ws.serializeAttachment(attachment);if(this.worldLoad().recoveries?.[id]?.bill)ws.send(JSON.stringify({type:'respawnBill',bill:this.worldLoad().recoveries[id].bill}));const receipts=this.ctx.storage.sql.exec('SELECT id,amount,damage,total_damage AS totalDamage,boss_id AS bossId,materials,xp FROM boss_rewards WHERE player_id=? AND claimed=0 LIMIT 50',id).toArray().map(r=>({...r,materials:JSON.parse(r.materials||'{}')}));if(receipts.length)ws.send(JSON.stringify({type:'bossRewards',receipts}))}
 worldSnapshot(s){return {type:'world',boss:bossSnapshot(s.boss),enemies:arenaEnemySnapshots(s),serverTime:Date.now(),rules:WORLD,players:s.players.filter(p=>p.connected).map(({id,name,profile,hp,energy,pos,aim,seq,duelId,duelStartsAt,death,exiting,abilityUntil,revision,hangar,paralyzedUntil,skillUntil,skillReadyAt,lastDamagedBy,...p})=>({adminShipAllowed:!!p.adminShipAllowed,id,name,profile,hp,energy,pos,aim,seq,duelId,abilityUntil,revision,hangar,death:death?{id:death.id,time:death.time}:null,exiting:!!exiting,zone:zoneOf(pForProtection(s,id)),duelStartsAt:duelStartsAt||0,lastDamagedBy,protected:protectedAt(pForProtection(s,id),Date.now()),paralyzedUntil:paralyzedUntil||0,equippedSkills:equippedSkills(p),skillUntil:skillUntil||{},skillReadyAt:skillReadyAt||{}})),duels:s.duels.map(({bullets,simTime,...d})=>d),invites:s.invites,events:s.events}}
 worldBroadcast(s){if(Date.now()-this.lastBroadcast<100)return;this.lastBroadcast=Date.now();const snapshot=this.worldSnapshot(s),data=JSON.stringify(snapshot),legacy=JSON.stringify({...snapshot,players:snapshot.players.map(p=>p.profile.shipId==='adminpod'?{...p,profile:{...p.profile,shipId:'aurora'}}:p)});for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.world)try{const id=ws.deserializeAttachment().id;ws.send((s.players.find(p=>p.id===id)?.clientVersion||0)>=4?data:legacy);this.sendRewards(ws,id)}catch{}}
 async enter(body){
  if(typeof body.accountId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.accountId))return {error:'google_required'};
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('google-play:'+body.accountId)),id=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
  await migrateGuestRewards(this.ctx,body.guestKey,id);
  const now=Date.now(),s=this.worldLoad();s.realm=body.realm==='test'?'test':'normal';advance(s,now);
  // Las reservas sin conexión caducan; nunca se persisten claves de invitado.
  s.players=s.players.filter(p=>p.connected||p.death||now-p.lastSeen<30000);
  let p=s.players.find(x=>x.id===id);if(p?.connected)return {error:'already_connected'};
  if(s.players.filter(q=>q.id!==id&&(q.connected||!q.death&&now-q.lastSeen<30000)).length>=WORLD.capacity)return {error:'world_full'};
  if(!p){p={id,pos:[...WORLD.spawn],seq:-1,aim:[0,0],connected:false,revision:0};s.players.push(p)}
  p.adminShipAllowed=String(this.env.CHAT_ADMIN_IDS||'').split(',').map(x=>x.trim()).includes(id);p.clientVersion=body.clientVersion;p.accountId=body.accountId;p.realm=body.realm==='test'?'test':'normal';p.name=String(body.name||'Invitado').trim().slice(0,20)||'Invitado';p.token=secret();p.lastSeen=p.lastInput=now;p.seq=-1;const angle=parseInt(id.slice(-6),16)*Math.PI/180,radius=260+parseInt(id.slice(0,2),16)%100;p.spawn=[Math.cos(angle)*radius,120,Math.sin(angle)*radius];p.roster=importRoster(body.roster);equip(p,body.shipId)||equip(p,Object.keys(p.roster)[0]);reset(p,true);p.equippedSkills=validSkills(body.skills)?[...body.skills]:equippedSkills(p);p.hangar=false;p.exiting=false;p.duelRequestsOff=body.duelRequestsOff===true;p.death=s.recoveries?.[id]||null;if(p.death)p.hp=0;
  this.worldSave(s,true);await this.ctx.storage.setAlarm(now+15000);return {playerId:id,token:p.token,expiresAt:now+30000};
 }
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'websocket_required'},426);
  const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim()),s=this.worldLoad(),now=Date.now();
  const p=s.players.find(x=>x.token===protocols[1]&&now-x.lastSeen<30000);
  if(p?.accountId&&!compatiblePvpClient(p,this.env))return json({error:'update_required'},426);
  if(protocols[0]!=='mundo-world-v1'||!p?.accountId)return json({error:'invalid_ticket'},403);
  if(p.connected)return json({error:'already_connected'},409);
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({world:true,id:p.id,windowStart:now,count:0});
  p.connected=true;p.lastSeen=p.lastInput=now;this.worldSave(s,true);this.startSimulation(s);this.worldBroadcast(s);await this.ctx.storage.setAlarm(now+3000);
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'mundo-world-v1'}});
 }
 async webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>16384){ws.close(1009,'message too large');return}
  const now=Date.now(),a=ws.deserializeAttachment();if(!a?.world)return;
  if(now-a.windowStart>=1000){a.windowStart=now;a.count=0}if(++a.count>40){ws.close(1008,'rate limit');return}ws.serializeAttachment(a);
  let m;try{m=JSON.parse(message)}catch{return}if(!m||typeof m!=='object')return;
  const s=this.worldLoad(),p=s.players.find(x=>x.id===a.id&&x.connected);if(!p)return;if(!compatiblePvpClient(p,this.env)){ws.close(1008,'update_required');return}if(!p.accountId){ws.close(1008,'google_required');return}if(p.realm==='test'&&!testServerEnabled(this.env)){await this.worldDisconnect(ws);ws.close(1000,'test_closed');return}p.adminShipAllowed=String(this.env.CHAT_ADMIN_IDS||'').split(',').map(x=>x.trim()).includes(p.id);if(!p.adminShipAllowed&&p.profile.shipId==='adminpod'){equip(p,'aurora');reset(p,true)}p.lastSeen=now;if(await handleChat(this.ctx,this.env,ws,p,m))return;this.startSimulation(s);advance(s,now);
  if((p.death||p.exiting)&&!['respawn','respawnAck','rankings','bossRewardAck','ping','leave'].includes(m.type))return;
  let error=null;
  if(m.type==='input'){
   if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq||!Array.isArray(m.move)||m.move.length!==3||!m.move.every(Number.isFinite)||Math.hypot(...m.move)>1.001)return;
   const dt=Math.max(0,Math.min(.15,(now-p.lastInput)/1000));p.lastInput=now;p.seq=m.seq;p.firing=!p.hangar&&!!m.firing;
   if(Array.isArray(m.aim)&&m.aim.length===2&&m.aim.every(Number.isFinite))p.aim=[Math.max(-1000,Math.min(1000,m.aim[0])),Math.max(-1.15,Math.min(1.15,m.aim[1]))];
   p.pos=p.pos.map((v,i)=>v+(p.death||p.exiting||p.hangar||(p.paralyzedUntil||0)>now?0:m.move[i])*p.profile.speed*dt);const r=Math.hypot(p.pos[0],p.pos[2]);if(r>WORLD.radius){p.pos[0]*=WORLD.radius/r;p.pos[2]*=WORLD.radius/r;}updateProtection(p,now);if(protectedAt(p,now))p.firing=false;
  }else if(m.type==='rankings'){if(now-(a.rankingsAt||0)<3000)return;a.rankingsAt=now;ws.serializeAttachment(a);this.worldSave(s,true);ws.send(JSON.stringify(rankings(this.ctx,p.id)));}
  else if(m.type==='respawn'){error=requestRespawn(s,p,m);this.worldSave(s,true);if(!error&&p.death?.bill)ws.send(JSON.stringify({type:'respawnBill',bill:p.death.bill}));}
  else if(m.type==='respawnAck'){const bill=confirmRespawn(s,p,m.id,reset)||(!p.death?p.lastRespawn:null);if(bill?.id===m.id){this.worldSave(s,true);ws.send(JSON.stringify({type:'respawnReady',bill}));}}
  else if(m.type==='duelBlock'){p.duelRequestsOff=m.block===true;s.invites=s.invites.filter(i=>i.to!==p.id);}
  else if(m.type==='progress'){const raw=importRoster(m.roster),q=raw[p.profile.shipId];if(q&&q.level>=p.profile.level&&!p.death){const hp=p.hp/p.profile.maxHp,energy=p.energy/p.profile.maxEnergy,timing={lastHit:p.lastHit,lastAttack:p.lastAttack,lastIncoming:p.lastIncoming,abilityUntil:p.abilityUntil,skillUntil:p.skillUntil,skillReadyAt:p.skillReadyAt};p.roster=raw;equip(p,p.profile.shipId);p.hp*=hp;p.energy*=energy;Object.assign(p,timing)}}
  else if(m.type==='hangar')error=openHangar(s,p,now);
  else if(m.type==='loadout')error=applyHangarLoadout(s,p,m.roster,m.shipId,now);
  else if(m.type==='formation')error=changeFormation(p,m.formation);
  else if(m.type==='skills')error=setSkills(s,p,m.skills,now);
  else if(m.type==='pvpSkill')error=usePvpSkill(s,p,m.skill,now,m.targetId);
  else if(m.type==='invite')error=invite(s,p,m.target,now);
  else if(m.type==='reply')error=reply(s,p,m.id,m.accept===true,now);
  else if(m.type==='ship'){
   if(p.duelId||p.hangar||!safe(p)||!protectedAt(p,now))error='base_only';else if(!equip(p,m.shipId))error='invalid_ship';else {reset(p);s.invites=s.invites.filter(i=>i.from!==p.id&&i.to!==p.id)}
  }else if(m.type==='name'){p.name=String(m.name||'Invitado').trim().slice(0,20)||'Invitado';}
  else if(m.type==='ability'){if(!useAbility(s,p,now))error='protected';}
  else if(m.type==='volley'){const bullets=attack(s,p,m,now);if(bullets){const data=JSON.stringify({type:'volley',owner:p.id,shots:bullets,serverTime:now});for(const peer of this.ctx.getWebSockets())try{peer.send(data)}catch{}}}
  else if(m.type==='surrender'){const d=duelFor(s,p);if(d)finishDuel(s,d,reset,now,'surrender');else error='no_duel'}
  else if(m.type==='bossRewardAck'){for(const id of Array.isArray(m.ids)?m.ids.slice(0,50):[])if(typeof id==='string')this.ctx.storage.sql.exec('UPDATE boss_rewards SET claimed=1 WHERE id=? AND player_id=?',id,p.id);}
  else if(m.type==='ping'){ws.send(JSON.stringify({type:'pong',echo:m.time,serverTime:now}));}
  else if(m.type==='leave'){await this.worldDisconnect(ws);try{ws.close(1000,'leave')}catch{}return}
  else return;
  this.worldSave(s,['loadout','ship','formation','name','skills','hangar','invite','reply','surrender','duelBlock'].includes(m.type));if(error)ws.send(JSON.stringify({type:'error',error}));this.worldBroadcast(s);
 }
 async worldDisconnect(ws){const s=this.worldLoad(),p=s.players.find(x=>x.id===ws.deserializeAttachment()?.id);if(!p?.connected)return;p.connected=false;p.lastSeen=Date.now();advance(s,Date.now());this.worldSave(s,true);if(!s.players.some(p=>p.connected))this.stopSimulation();this.worldBroadcast(s)}
 async webSocketClose(ws){await this.worldDisconnect(ws)}
 async webSocketError(ws){await this.worldDisconnect(ws)}
 async alarm(){const s=this.worldLoad(),now=Date.now();for(const p of s.players)if(p.connected&&now-p.lastSeen>15000){p.connected=false;for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.id===p.id)try{ws.close(1001,'timeout')}catch{}}
  this.startSimulation(s);advance(s,now);s.players=s.players.filter(p=>p.connected||p.death||now-p.lastSeen<30000);this.worldSave(s,!s.players.some(p=>p.connected));if(!s.players.some(p=>p.connected))this.stopSimulation();this.worldBroadcast(s);if(s.players.length)await this.ctx.storage.setAlarm(now+3000);
 }
}

