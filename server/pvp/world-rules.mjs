import {makeCombatPlayer,stepCombat,volley,ability} from './combat.mjs';
export const WORLD={radius:4500,safeRadius:650,capacity:24,portal:[0,120,850],spawn:[0,120,0]};
export const SHIPS={aurora:[1,1,1,1],titan:[1.8,.85,1.5,.75],espectro:[.7,1.35,.65,1.4],segadora:[1.1,1.85,.95,1.05],bastion:[2.5,1,2,.85],centella:[.95,1.1,.85,1.85]};
export const safe=p=>Math.hypot(...p.pos)<=WORLD.safeRadius;
export const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
export function importRoster(raw){
 const roster={};for(const id of Object.keys(SHIPS)){const q=raw?.[id];if(q&&typeof q==='object'&&!Array.isArray(q))roster[id]={...q,shipId:id}}
 if(!Object.keys(roster).length)roster.aurora={shipId:'aurora',level:1,maxHp:100,maxEnergy:100,attack:10,defense:5,speed:220};return roster;
}
export function equip(p,id){
 if(!Object.hasOwn(SHIPS,id)||!Object.hasOwn(p.roster||{},id))return false;
 const raw=p.roster[id];makeCombatPlayer(p,raw);const q=p.profile;
 // Multiply the original offline hull once; never multiply a previous PvP snapshot.
 q.offlineMaxHp=q.maxHp;q.maxHp=q.offlineMaxHp*5;q.hp=q.maxHp;
 q.droneFormation=q.droneCount>0&&['fan','shield','spear','fortress','hunter','drive','recovery'].includes(raw.droneFormation)?raw.droneFormation:'fan';
 q.baseSpeed=q.speed;q.speed*=q.droneFormation==='drive'?1.12:1;
 q.droneDamage=q.droneFormation==='spear'?1.2:1;q.resistance=(q.droneFormation==='shield'?.85:1)*(raw.boosters?.resistance===true?.85:1);q.damageBonus=raw.boosters?.damage===true?1.15:1;
 q.droneRange=q.droneFormation==='hunter'?1380:1200;q.repairBonus=q.droneFormation==='recovery'?1.25:1;q.explorerRange=450+Math.max(1,Math.min(10,Number(raw.explorerRangeLevel)||1))*100;
 p.hp=q.maxHp;p.energy=q.maxEnergy;p.abilityUntil=0;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;return true;
}
export function reset(p,respawn=false){p.hp=p.profile.maxHp;p.energy=p.profile.maxEnergy;p.abilityUntil=0;p.firing=false;p.duelId=null;p.revision=(p.revision||0)+1;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;if(respawn)p.pos=[...(p.spawn||WORLD.spawn)];}
export function duelFor(s,p){return s.duels.find(d=>d.id===p.duelId)}
export function endDuel(s,d,winner,reason,now){
 s.duels=s.duels.filter(x=>x.id!==d.id);
 for(const id of [d.a,d.b]){const p=s.players.find(x=>x.id===id);if(p)reset(p,reason==='destroyed'&&id!==winner)}
 const event={type:'duelEnd',id:d.id,a:d.a,b:d.b,winner,reason,time:now};s.events.push(event);return event;
}
export function advance(s,now){
 s.invites=s.invites.filter(i=>i.expiresAt>now&&s.players.some(p=>p.id===i.from&&p.connected)&&s.players.some(p=>p.id===i.to&&p.connected));
 for(const d of [...s.duels]){
  const a=s.players.find(p=>p.id===d.a),b=s.players.find(p=>p.id===d.b);
  if(!a?.connected||!b?.connected){endDuel(s,d,a?.connected?a.id:b?.connected?b.id:null,'disconnect',now);continue}
  if(now<d.startsAt)continue;
  const combat={status:'active',players:[a,b],bullets:d.bullets,simTime:Math.max(d.startsAt,d.simTime)};
  stepCombat(combat,now);d.bullets=combat.bullets;d.simTime=combat.simTime;
  const dead=[a,b].find(p=>p.hp<=0);if(dead)endDuel(s,d,dead.id===a.id?b.id:a.id,'destroyed',now);
 }
}
export function invite(s,p,target,now){
 const other=s.players.find(x=>x.id===target&&x.connected);
 if(!other||other===p)return 'invalid_target';
 if(p.duelId||other.duelId)return 'busy';
 if(distance(p,other)>1200)return 'too_far';
 if(now-(p.lastInvite||0)<5000)return 'invite_cooldown';
 if(s.invites.some(i=>[i.from,i.to].includes(p.id)||[i.from,i.to].includes(other.id)))return 'pending_invite';
 p.lastInvite=now;s.invites.push({id:crypto.randomUUID(),from:p.id,to:other.id,expiresAt:now+20000});return null;
}
export function reply(s,p,id,accept,now){
 const i=s.invites.find(x=>x.id===id&&x.to===p.id&&x.expiresAt>now);if(!i)return 'invite_expired';
 s.invites=s.invites.filter(x=>x.id!==id);if(!accept)return null;
 const a=s.players.find(x=>x.id===i.from&&x.connected);
 if(!a||a.duelId||p.duelId)return 'busy';
 if(distance(a,p)>1200)return 'too_far';
 reset(a);reset(p);const d={id:crypto.randomUUID(),a:a.id,b:p.id,startsAt:now+3000,simTime:now+3000,bullets:[]};a.duelId=p.duelId=d.id;s.duels.push(d);s.invites=s.invites.filter(x=>![a.id,p.id].includes(x.from)&&![a.id,p.id].includes(x.to));return null;
}
export function attack(s,p,m,now){const d=duelFor(s,p);if(!d||now<d.startsAt)return null;const pair=[s.players.find(x=>x.id===d.a),s.players.find(x=>x.id===d.b)];if(pair.some(x=>!x?.connected))return null;
 // El servidor decide los críticos; las estadísticas del cliente se ignoran.
 const clean={...m,shots:Array.isArray(m.shots)?m.shots.map(x=>({...x,crit:Math.random()<.15+(p.profile.special.crit||0)*.01})):null};
 const combat={players:pair,bullets:d.bullets};const bullets=volley(combat,p,clean,now);d.bullets=combat.bullets;return bullets;
}
export function useAbility(s,p,now){const d=duelFor(s,p);return !!d&&now>=d.startsAt&&ability(p,now)}
