import {zoneOf} from './zones.mjs';
export function duelFor(s,p){return (s.duels||[]).find(d=>d.id===p.duelId)}
const ready=p=>p&&p.connected&&p.hp>0&&!p.hangar&&!p.death&&!p.duelId&&zoneOf(p)==='pve';
const busy=(p,now)=>now-Math.max(p.lastHit||0,p.lastIncoming||0,p.lastAttack||0)<8000;
export function inviteDuel(s,p,targetId,now){
 const target=s.players.find(q=>q.id===targetId);if(!ready(p)||!ready(target)||p.id===targetId)return 'duel_zone';if(target.duelRequestsOff)return 'duel_blocked';
 if(busy(p,now)||busy(target,now))return 'duel_busy';if(Math.hypot(...p.pos.map((v,i)=>v-target.pos[i]))>1200)return 'too_far';
 if(now-(p.duelInviteAt||0)<30000)return 'duel_wait';p.duelInviteAt=now;
 s.invites=s.invites.filter(i=>i.from!==p.id&&i.to!==p.id);s.invites.push({id:crypto.randomUUID(),from:p.id,to:targetId,expiresAt:now+20000});return null;
}
export function replyDuel(s,p,id,accept,now){
 const request=s.invites.find(i=>i.id===id&&i.to===p.id&&i.expiresAt>now);if(!request)return 'duel_expired';s.invites=s.invites.filter(i=>i.id!==id);if(!accept)return null;
 const other=s.players.find(q=>q.id===request.from);if(!ready(p)||!ready(other)||busy(p,now)||busy(other,now))return 'duel_busy';
 const d={id:crypto.randomUUID(),a:other.id,b:p.id,startsAt:now+3000};s.duels.push(d);s.critical=true;
 for(const q of [p,other]){q.duelId=d.id;q.duelStartsAt=d.startsAt;q.hp=q.profile.maxHp;q.energy=q.profile.maxEnergy;q.abilityUntil=0;q.skillUntil={};q.skillReadyAt={};q.firing=false}
 s.bullets=s.bullets.filter(b=>![p.id,other.id].includes(b.owner)&&![p.id,other.id].includes(b.target));return null;
}
export function finishDuel(s,d,reset,now,reason='finished'){
 s.critical=true;s.duels=s.duels.filter(x=>x.id!==d.id);s.invites=s.invites.filter(i=>![d.a,d.b].includes(i.from)&&![d.a,d.b].includes(i.to));
 for(const id of [d.a,d.b]){const p=s.players.find(q=>q.id===id);if(!p)continue;reset(p,true);p.duelStartsAt=0;p.hangar=false}
 s.bullets=s.bullets.filter(b=>![d.a,d.b].includes(b.owner)&&![d.a,d.b].includes(b.target));s.events.push({id:crypto.randomUUID(),type:'duelEnded',a:d.a,b:d.b,reason,time:now});
}
export function tickDuels(s,reset,now){s.invites=(s.invites||[]).filter(i=>i.expiresAt>now);s.duels||=[];for(const d of [...s.duels]){const pair=[d.a,d.b].map(id=>s.players.find(p=>p.id===id));if(pair.some(p=>!p?.connected||p.hp<=0||zoneOf(p)==='hostile'))finishDuel(s,d,reset,now)}}
