import {modeRules,validPvpMode,teamForSlot,spawnForSlot,opponents,pvpRoomName} from './pvp-teams.mjs';
export {pvpRoomName} from './pvp-teams.mjs';
import {createPracticeBot,advancePracticeBot} from './practice-bot.mjs';
import {WORLD,equip,reset,importRoster,changeFormation} from './world-rules.mjs';
import {stepCombat,volley,ability} from './combat.mjs';
import {PVP_SKILLS,validSkills,equippedSkills,activateSkill} from './skills.mjs';
export const PVP_RADIUS=2200;
const active=(s)=>s.pvpMatch.status==='active'&&!s.pvpMatch.paused;
const canDamage=(s,a,b)=>active(s)&&a?.connected&&a.hp>0&&!a.exiting&&(!b||opponents(a,b)&&b.connected&&b.hp>0&&!b.exiting);
function recordEliminations(s,now){
 for(const p of s.players)if(p.hp<=0&&!p.eliminated){p.eliminated=true;p.firing=false;s.critical=true;s.events.push({id:crypto.randomUUID(),type:'destroyed',victim:p.id,winner:s.players.find(q=>q.id===p.lastDamagedBy&&opponents(q,p))?.id||null,time:now})}
}
export function finishPvp(s,now,winner=null,reason='destroyed'){
 const m=s.pvpMatch;if(m.status==='finished')return;
 Object.assign(m,{status:'finished',finishedAt:now,winner,winnerTeam:s.players.find(p=>p.id===winner)?.team||null,reason,paused:false});s.bullets=[];s.critical=true;
 recordEliminations(s,now);for(const p of s.players)p.firing=false;
}
function placePlayer(s,p,slot){p.slot=slot;p.team=teamForSlot(slot);p.spawn=spawnForSlot(slot,s.pvpMatch);p.pos=[...p.spawn];p.aim=[p.team==='a'?0:Math.PI,0];p.ready=false;p.revision++;s.critical=true}
export function swapTeams(s,p,ids){
 if(s.pvpMatch.status!=='waiting'||s.pvpMatch.visibility!=='private'||s.pvpMatch.hostId!==p.id)return 'host_only';
 if(!Array.isArray(ids)||ids.length!==2)return 'invalid_team';const [a,b]=ids.map(id=>s.players.find(q=>q.id===id&&!q.exiting&&!q.isBot));
 if(!a||!b||a.team===b.team)return 'invalid_team';const slot=a.slot;placePlayer(s,a,b.slot);placePlayer(s,b,slot);return null;
}
export function changeTeam(s,p,team){
 if(s.pvpMatch.status!=='waiting'||s.pvpMatch.bot)return 'match_started';
 if(!['a','b'].includes(team))return 'invalid_team';if(p.team===team)return null;
 const used=new Set(s.players.filter(q=>q.id!==p.id&&!q.exiting).map(q=>q.slot));
 const slot=Array.from({length:modeRules(s.pvpMatch).capacity},(_,i)=>i).find(i=>teamForSlot(i)===team&&!used.has(i));
 if(slot===undefined)return 'team_full';placePlayer(s,p,slot);return null;
}
function freezePracticeClocks(s,dt,now){
 for(const p of s.players){
  for(const key of ['abilityUntil','abilityReadyAt','paralyzedUntil','last_laser','last_missile','last_explorer','lastHit','lastAttack','lastIncoming','shieldLastHit'])if(Number.isFinite(p[key])&&p[key]>0)p[key]+=dt;
  for(const field of ['skillUntil','skillReadyAt'])for(const key of Object.keys(p[field]||{}))if(p[field][key]>0)p[field][key]+=dt;
  if(p.botBrain){for(const key of ['engageAt','nextThinkAt','nextStrafeAt'])if(p.botBrain[key]>0)p.botBrain[key]+=dt;p.botBrain.tickAt=now}
  p.boosterTickAt=now;
 }
 s.simTime=now;
}
export function advancePvp(s,now){
 const m=s.pvpMatch,dt=Math.max(0,now-(m.tickAt||now)),capacity=modeRules(m).capacity;m.tickAt=now;
 if(m.status==='finished')return;
 if(m.status==='waiting'&&!s.players.some(p=>p.id===m.hostId&&!p.exiting))m.hostId=s.players.find(p=>!p.isBot&&!p.exiting)?.id||null;
 for(let i=0;i<s.players.length;i++){const p=s.players[i];p.slot??=i;p.team??=teamForSlot(p.slot)}
 if(m.bot){
  const human=s.players.find(p=>!p.isBot);for(const bot of s.players.filter(p=>p.isBot)){bot.connected=true;bot.ready=true;bot.lastSeen=now}
  if(human&&!human.connected&&(human.exiting||now-human.lastSeen>=20000)){finishPvp(s,now,null,'abandoned');return}
  if(human?.practicePaused){m.paused=true;freezePracticeClocks(s,dt,now);if(m.status==='active')m.deadline+=dt;if(m.status==='countdown'){m.startsAt+=dt;for(const p of s.players)p.duelStartsAt=m.startsAt}return}m.paused=false;
 }
 const present=s.players.filter(p=>p.connected&&!p.exiting);
 if(m.status==='waiting'){
  if(!present.length&&now-m.createdAt>120000){finishPvp(s,now,null,'abandoned');return}
  if(present.length===capacity&&present.every(p=>p.ready)){
   m.status='countdown';m.startsAt=now+3000;s.critical=true;
   for(const p of s.players){reset(p,true);p.eliminated=false;p.duelId=m.code;p.duelStartsAt=m.startsAt;p.ready=true;p.boostersPaused=true}
  }
  return;
 }
 if(m.status==='countdown'){
  if(present.length!==capacity){m.status='waiting';for(const p of s.players)p.ready=false;s.critical=true;return}
  if(now<m.startsAt)return;m.status='active';m.deadline=now+300000;s.simTime=now;s.critical=true;
 }
 const expired=s.players.filter(p=>p.hp>0&&(p.exiting||!p.connected&&now-p.lastSeen>=20000));for(const p of expired)p.hp=0;recordEliminations(s,now);
 const alive=s.players.filter(p=>p.hp>0&&!p.exiting),aliveTeams=new Set(alive.map(p=>p.team));
 if(aliveTeams.size<2){finishPvp(s,now,alive[0]?.id||null,expired.length?'disconnect':'destroyed');return}
 if(alive.some(p=>!p.connected)){m.paused=true;m.deadline+=dt;s.simTime=now;return}
 m.paused=false;
 if(now>=m.deadline){finishPvp(s,now,null,'time');return}
 advancePracticeBot(s,now,(a,b)=>canDamage(s,a,b));
 const combat={status:'active',simTime:s.simTime,players:s.players,bullets:s.bullets||[],canDamage:(a,b)=>canDamage(s,a,b)};
 for(const p of s.players){p.boostersPaused=p.clientBoostersPaused===true;p.boosterTickAt??=now}
 stepCombat(combat,now);s.simTime=combat.simTime;s.bullets=combat.bullets;recordEliminations(s,now);
 const survivors=s.players.filter(p=>p.hp>0&&!p.exiting);if(new Set(survivors.map(p=>p.team)).size<2)finishPvp(s,now,survivors[0]?.id||null,'destroyed');
}
export async function enterPvp(world,s,body,id,now){
 s.realm=body.realm==='test'?'test':'normal';const spec=body.pvpRoom;if(spec?.mode&&!validPvpMode(spec.mode))return {error:'invalid_mode'};if(!s.pvpMatch){if(!spec)return {error:'room_not_found'};s.pvpMatch={...spec,mode:spec.mode||'1v1',status:'waiting',createdAt:now};s.cooperative=false;s.arenaEnemies=[];s.boss=null;s.groups=[];s.groupInvites=[];s.duels=[];s.invites=[];s.bullets=[];}
 const m=s.pvpMatch;advancePvp(s,now);
 if(m.status==='finished')return {error:'match_finished'};
 if(body.shipId==='adminpod')return {error:'admin_ship_disabled'};
 if(m.bot&&s.players.length&&!s.players.some(q=>q.id===id&&!q.isBot))return {error:'world_full'};
 let p=s.players.find(q=>q.id===id);
 if(p?.connected)return {error:'already_connected'};
 if(!p){
  if(m.status!=='waiting')return {error:'match_started'};
  s.players=s.players.filter(q=>!q.exiting&&now-q.lastSeen<30000);
  if(s.players.length>=modeRules(m).capacity)return {error:'world_full'};
  const roster=importRoster(body.roster);delete roster.adminpod;
  p={id,accountId:body.accountId,testGuest:false,realm:body.realm==='test'?'test':'normal',name:String(body.name||'Piloto').trim().slice(0,20),roster,connected:false,revision:0,clientVersion:body.clientVersion,snapshotDelta:body.snapshotDelta===1?1:0};
  if(!equip(p,body.shipId)||!p.profile)return {error:'invalid_ship'};
  p.slot=Array.from({length:modeRules(m).capacity},(_,i)=>i).find(i=>!s.players.some(q=>q.slot===i));p.team=teamForSlot(p.slot);p.spawn=spawnForSlot(p.slot,m);p.aim=[p.team==='a'?0:Math.PI,0];reset(p,true);p.duelId=m.code;p.duelStartsAt=Number.MAX_SAFE_INTEGER;
  p.equippedSkills=validSkills(body.skills)?[...body.skills]:equippedSkills(p);s.players.push(p);
 }
 m.hostId||=p.id;
 if(m.bot&&!s.players.some(q=>q.isBot))for(let slot=1;slot<modeRules(m).capacity;slot++)s.players.push(createPracticeBot(p,m,now,slot));
 p.exiting=false;p.token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');p.lastSeen=p.lastInput=now;p.seq=-1;
 world.worldSave(s,true);await world.ctx.storage.setAlarm(now+3000);
 return {playerId:id,token:p.token,expiresAt:now+30000};
}
export function pvpSnapshot(s,now){
 const m=s.pvpMatch,protectedNow=!active(s),waiting=m.status==='waiting';
 return {type:'world',serverTime:now,match:{code:m.code,hostId:m.hostId||null,mode:m.mode||'1v1',capacity:modeRules(m).capacity,teamSize:modeRules(m).teamSize,winnerTeam:m.winnerTeam||null,practice:!!m.bot,visibility:m.visibility,status:m.status,startsAt:m.startsAt||0,deadline:m.deadline||0,paused:!!m.paused,pauseReason:m.paused&&s.players.some(p=>!p.isBot&&p.practicePaused)?'window':null,winner:m.winner||null,reason:m.reason||null},room:null,boss:null,enemies:[],rules:{...WORLD,cooperative:false,pvpSkills:true,skills:PVP_SKILLS,openCombat:true,formationSwitch:true,radius:PVP_RADIUS,safeRadius:0,capacity:modeRules(m).capacity,portalImmunity:false},players:s.players.map(p=>({id:p.id,team:p.team,eliminated:!!p.eliminated,name:p.name,profile:p.profile,hp:p.hp,energy:p.energy,shield:p.shield,pos:p.pos,aim:p.aim,seq:p.seq,revision:p.revision,connected:p.connected,isBot:!!p.isBot,ready:!!p.ready,duelId:m.code,duelStartsAt:m.startsAt||Number.MAX_SAFE_INTEGER,protected:protectedNow,zone:'arena',death:null,hangar:false,exiting:!!p.exiting,abilityUntil:p.abilityUntil||0,abilityReadyAt:p.abilityReadyAt||0,paralyzedUntil:p.paralyzedUntil||0,equippedSkills:equippedSkills(p),skillUntil:p.skillUntil||{},skillReadyAt:p.skillReadyAt||{},adminShipAllowed:false})),duels:[],invites:[],groups:[],groupInvites:[],events:s.events||[]};
}
export async function pvpMessage(world,s,p,m,ws,now){
 if(m.type==='practicePause'&&s.pvpMatch.bot){const paused=m.paused===true;if(p.practicePaused&&!paused)advancePvp(s,now);if(!p.practicePaused&&paused){s.pvpMatch.tickAt=now;s.simTime=now}p.practicePaused=paused;s.critical=true}
 p.lastSeen=now;world.startSimulation(s);advancePvp(s,now);const match=s.pvpMatch;let error=null;
 if(m.type==='ping')ws.send(JSON.stringify({type:'pong',echo:m.time,serverTime:now}));
 else if(m.type==='leave'){p.exiting=true;p.ready=false;if(match.bot&&modeRules(match).capacity===4)finishPvp(s,now,null,'abandoned');else if(match.bot&&match.status!=='active')finishPvp(s,now,null,'abandoned');else if(match.status==='active'){if(modeRules(match).capacity===2)finishPvp(s,now,s.players.find(q=>q.id!==p.id)?.id||null,'surrender');else{p.hp=0;if(!s.players.some(q=>q.team===p.team&&q.hp>0&&!q.exiting))finishPvp(s,now,s.players.find(q=>opponents(q,p)&&q.hp>0&&!q.exiting)?.id||null,'surrender');else advancePvp(s,now)}}await world.worldDisconnect(ws);ws.close(1000,'leave');return}
 else if(m.type==='practicePause'){if(!match.bot)return}
 else if(m.type==='teamSwap'){error=swapTeams(s,p,m.players)}
 else if(m.type==='team'){error=changeTeam(s,p,m.team)}
 else if(m.type==='ready'){if(match.status!=='waiting')error='match_started';else {p.ready=m.ready===true;s.critical=true;advancePvp(s,now)}}
 else if(m.type==='skills'){if(match.status!=='waiting')error='match_started';else if(!validSkills(m.skills))error='invalid_skills';else {p.equippedSkills=[...m.skills];p.ready=false;s.critical=true}}
 else if(m.type==='boosterPause')p.clientBoostersPaused=m.paused===true;
 else if(m.type==='input'){
  if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq||!Array.isArray(m.move)||m.move.length!==3||!m.move.every(Number.isFinite)||Math.hypot(...m.move)>1.001)return;
  const dt=Math.max(0,Math.min(.15,(now-p.lastInput)/1000));p.lastInput=now;p.seq=m.seq;p.clientBoostersPaused=m.boostersPaused===true;p.firing=active(s)&&p.hp>0&&!!m.firing;
  if(Array.isArray(m.aim)&&m.aim.length===2&&m.aim.every(Number.isFinite))p.aim=[Math.max(-1000,Math.min(1000,m.aim[0])),Math.max(-1.15,Math.min(1.15,m.aim[1]))];
  if(active(s)&&p.hp>0&&(p.paralyzedUntil||0)<=now){p.pos=p.pos.map((v,i)=>v+m.move[i]*p.profile.speed*dt);const d=Math.hypot(p.pos[0],p.pos[2]);if(d>PVP_RADIUS){p.pos[0]*=PVP_RADIUS/d;p.pos[2]*=PVP_RADIUS/d}p.pos[1]=Math.max(-900,Math.min(900,p.pos[1]));}
 }else if(m.type==='formation'){if(active(s))error=changeFormation(p,m.formation);else error='match_not_active'}
 else if(m.type==='ability'){if(!canDamage(s,p,null)||!ability(p,now))error='match_not_active';else if(['centella','vertigo'].includes(p.profile.shipId))p.paralyzedUntil=0}
 else if(m.type==='pvpSkill'){
  if(!active(s))error='match_not_active';else if(m.skill==='paralyze'){
   const target=s.players.find(q=>q.id===m.targetId&&canDamage(s,p,q));if(!target||Math.hypot(...target.pos.map((v,i)=>v-p.pos[i]))>1200)error='too_far';else if(activateSkill(p,m.skill,now))target.paralyzedUntil=now+3000;else error='skill_cooldown';
  }else if(!activateSkill(p,m.skill,now))error='skill_cooldown';else if(m.skill==='luck')p.last_missile=now-7000;
 }else if(m.type==='volley'){
  if(canDamage(s,p,null)){
   const clean={...m,shots:Array.isArray(m.shots)?m.shots.map(x=>({...x,crit:Math.random()<.15+(p.profile.special.crit||0)*.01})):null};
   const combat={players:s.players,bullets:s.bullets||[],canDamage:(a,b)=>canDamage(s,a,b)},shots=volley(combat,p,clean,now);s.bullets=combat.bullets;
   if(shots){const data=JSON.stringify({type:'volley',owner:p.id,shots,serverTime:now});for(const peer of world.ctx.getWebSockets())try{peer.send(data)}catch{}}
  }
 }else return;
 world.worldSave(s,['ready','skills','team','teamSwap','leave','practicePause'].includes(m.type));if(error)ws.send(JSON.stringify({type:'error',error}));world.worldBroadcast(s);
}


