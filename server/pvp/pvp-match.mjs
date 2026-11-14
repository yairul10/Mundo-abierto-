import {WORLD,equip,reset,importRoster,changeFormation} from './world-rules.mjs';
import {stepCombat,volley,ability} from './combat.mjs';
import {PVP_SKILLS,validSkills,equippedSkills,activateSkill} from './skills.mjs';
export const PVP_RADIUS=2200;
export const pvpRoomName=(realm,code)=>'arena-1v1-'+(realm==='test'?'test':'normal')+'-'+code;
const active=(s)=>s.pvpMatch.status==='active'&&!s.pvpMatch.paused;
const canDamage=(s,a,b)=>active(s)&&a?.connected&&a.hp>0&&(!b||b.id!==a.id&&b.connected&&b.hp>0);
export function finishPvp(s,now,winner=null,reason='destroyed'){
 const m=s.pvpMatch;if(m.status==='finished')return;
 Object.assign(m,{status:'finished',finishedAt:now,winner,reason,paused:false});s.bullets=[];s.critical=true;
 for(const p of s.players){p.firing=false;if(reason==='destroyed'&&p.hp<=0)s.events.push({id:crypto.randomUUID(),type:'destroyed',victim:p.id,winner,time:now})}
}
export function advancePvp(s,now){
 const m=s.pvpMatch,dt=Math.max(0,now-(m.tickAt||now));m.tickAt=now;
 if(m.status==='finished')return;
 const present=s.players.filter(p=>p.connected&&!p.exiting);
 if(m.status==='waiting'){
  if(!present.length&&now-m.createdAt>120000){finishPvp(s,now,null,'abandoned');return}
  if(present.length===2&&present.every(p=>p.ready)){
   m.status='countdown';m.startsAt=now+3000;s.critical=true;
   for(const p of s.players){reset(p,true);p.duelId=m.code;p.duelStartsAt=m.startsAt;p.ready=true;p.boostersPaused=true}
  }
  return;
 }
 if(m.status==='countdown'){
  if(present.length!==2){m.status='waiting';for(const p of s.players)p.ready=false;s.critical=true;return}
  if(now<m.startsAt)return;m.status='active';m.deadline=now+300000;s.simTime=now;s.critical=true;
 }
 if(present.length!==2){
  m.paused=true;m.deadline+=dt;
  const lost=s.players.filter(p=>!p.connected||p.exiting);
  if(lost.some(p=>p.exiting||now-p.lastSeen>=20000))finishPvp(s,now,present.length===1?present[0].id:null,'disconnect');
  return;
 }
 m.paused=false;
 if(now>=m.deadline){finishPvp(s,now,null,'time');return}
 const combat={status:'active',simTime:s.simTime,players:s.players,bullets:s.bullets||[],canDamage:(a,b)=>canDamage(s,a,b)};
 for(const p of s.players){p.boostersPaused=p.clientBoostersPaused===true;p.boosterTickAt??=now}
 stepCombat(combat,now);s.simTime=combat.simTime;s.bullets=combat.bullets;
 const alive=s.players.filter(p=>p.hp>0);if(alive.length<2)finishPvp(s,now,alive.length===1?alive[0].id:null,'destroyed');
}
export async function enterPvp(world,s,body,id,now){
 s.realm=body.realm==='test'?'test':'normal';const spec=body.pvpRoom;if(!s.pvpMatch){if(!spec)return {error:'room_not_found'};s.pvpMatch={...spec,status:'waiting',createdAt:now};s.cooperative=false;s.arenaEnemies=[];s.boss=null;s.groups=[];s.groupInvites=[];s.duels=[];s.invites=[];s.bullets=[];}
 const m=s.pvpMatch;advancePvp(s,now);
 if(m.status==='finished')return {error:'match_finished'};
 if(body.shipId==='adminpod')return {error:'admin_ship_disabled'};
 let p=s.players.find(q=>q.id===id);
 if(p?.connected)return {error:'already_connected'};
 if(!p){
  if(m.status!=='waiting')return {error:'match_started'};
  s.players=s.players.filter(q=>!q.exiting&&now-q.lastSeen<30000);
  if(s.players.length>=2)return {error:'world_full'};
  const roster=importRoster(body.roster);delete roster.adminpod;
  p={id,accountId:body.accountId,testGuest:false,realm:body.realm==='test'?'test':'normal',name:String(body.name||'Piloto').trim().slice(0,20),roster,connected:false,revision:0,clientVersion:body.clientVersion,snapshotDelta:body.snapshotDelta===1?1:0};
  if(!equip(p,body.shipId)||!p.profile)return {error:'invalid_ship'};
  p.spawn=[0,120,s.players.length?-700:700];p.aim=[s.players.length?Math.PI:0,0];reset(p,true);p.duelId=m.code;p.duelStartsAt=Number.MAX_SAFE_INTEGER;
  p.equippedSkills=validSkills(body.skills)?[...body.skills]:equippedSkills(p);s.players.push(p);
 }
 p.exiting=false;p.token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');p.lastSeen=p.lastInput=now;p.seq=-1;
 world.worldSave(s,true);await world.ctx.storage.setAlarm(now+3000);
 return {playerId:id,token:p.token,expiresAt:now+30000};
}
export function pvpSnapshot(s,now){
 const m=s.pvpMatch,protectedNow=!active(s),waiting=m.status==='waiting';
 return {type:'world',serverTime:now,match:{code:m.code,visibility:m.visibility,status:m.status,startsAt:m.startsAt||0,deadline:m.deadline||0,paused:!!m.paused,winner:m.winner||null,reason:m.reason||null},room:null,boss:null,enemies:[],rules:{...WORLD,cooperative:false,pvpSkills:true,skills:PVP_SKILLS,openCombat:true,formationSwitch:true,radius:PVP_RADIUS,safeRadius:0,capacity:2,portalImmunity:false},players:s.players.map(p=>({id:p.id,name:p.name,profile:p.profile,hp:p.hp,energy:p.energy,shield:p.shield,pos:p.pos,aim:p.aim,seq:p.seq,revision:p.revision,connected:p.connected,ready:!!p.ready,duelId:m.code,duelStartsAt:m.startsAt||Number.MAX_SAFE_INTEGER,protected:protectedNow,zone:'arena',death:null,hangar:false,exiting:!!p.exiting,abilityUntil:p.abilityUntil||0,abilityReadyAt:p.abilityReadyAt||0,paralyzedUntil:p.paralyzedUntil||0,equippedSkills:equippedSkills(p),skillUntil:p.skillUntil||{},skillReadyAt:p.skillReadyAt||{},adminShipAllowed:false})),duels:[],invites:[],groups:[],groupInvites:[],events:s.events||[]};
}
export async function pvpMessage(world,s,p,m,ws,now){
 p.lastSeen=now;world.startSimulation(s);advancePvp(s,now);const match=s.pvpMatch;let error=null;
 if(m.type==='ping')ws.send(JSON.stringify({type:'pong',echo:m.time,serverTime:now}));
 else if(m.type==='leave'){p.exiting=true;p.ready=false;if(match.status==='active')finishPvp(s,now,s.players.find(q=>q.id!==p.id)?.id||null,'surrender');await world.worldDisconnect(ws);ws.close(1000,'leave');return}
 else if(m.type==='ready'){if(match.status!=='waiting')error='match_started';else {p.ready=m.ready===true;s.critical=true;advancePvp(s,now)}}
 else if(m.type==='skills'){if(match.status!=='waiting')error='match_started';else if(!validSkills(m.skills))error='invalid_skills';else {p.equippedSkills=[...m.skills];p.ready=false;s.critical=true}}
 else if(m.type==='boosterPause')p.clientBoostersPaused=m.paused===true;
 else if(m.type==='input'){
  if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq||!Array.isArray(m.move)||m.move.length!==3||!m.move.every(Number.isFinite)||Math.hypot(...m.move)>1.001)return;
  const dt=Math.max(0,Math.min(.15,(now-p.lastInput)/1000));p.lastInput=now;p.seq=m.seq;p.clientBoostersPaused=m.boostersPaused===true;p.firing=active(s)&&!!m.firing;
  if(Array.isArray(m.aim)&&m.aim.length===2&&m.aim.every(Number.isFinite))p.aim=[Math.max(-1000,Math.min(1000,m.aim[0])),Math.max(-1.15,Math.min(1.15,m.aim[1]))];
  if(active(s)&&(p.paralyzedUntil||0)<=now){p.pos=p.pos.map((v,i)=>v+m.move[i]*p.profile.speed*dt);const d=Math.hypot(p.pos[0],p.pos[2]);if(d>PVP_RADIUS){p.pos[0]*=PVP_RADIUS/d;p.pos[2]*=PVP_RADIUS/d}p.pos[1]=Math.max(-900,Math.min(900,p.pos[1]));}
 }else if(m.type==='formation'){if(active(s))error=changeFormation(p,m.formation);else error='match_not_active'}
 else if(m.type==='ability'){if(!active(s)||!ability(p,now))error='match_not_active';else if(['centella','vertigo'].includes(p.profile.shipId))p.paralyzedUntil=0}
 else if(m.type==='pvpSkill'){
  if(!active(s))error='match_not_active';else if(m.skill==='paralyze'){
   const target=s.players.find(q=>q.id===m.targetId&&canDamage(s,p,q));if(!target||Math.hypot(...target.pos.map((v,i)=>v-p.pos[i]))>1200)error='too_far';else if(activateSkill(p,m.skill,now))target.paralyzedUntil=now+3000;else error='skill_cooldown';
  }else if(!activateSkill(p,m.skill,now))error='skill_cooldown';else if(m.skill==='luck')p.last_missile=now-7000;
 }else if(m.type==='volley'){
  if(active(s)){
   const clean={...m,shots:Array.isArray(m.shots)?m.shots.map(x=>({...x,crit:Math.random()<.15+(p.profile.special.crit||0)*.01})):null};
   const combat={players:s.players,bullets:s.bullets||[],canDamage:(a,b)=>canDamage(s,a,b)},shots=volley(combat,p,clean,now);s.bullets=combat.bullets;
   if(shots){const data=JSON.stringify({type:'volley',owner:p.id,shots,serverTime:now});for(const peer of world.ctx.getWebSockets())try{peer.send(data)}catch{}}
  }
 }else return;
 world.worldSave(s,['ready','skills','leave'].includes(m.type));if(error)ws.send(JSON.stringify({type:'error',error}));world.worldBroadcast(s);
}
