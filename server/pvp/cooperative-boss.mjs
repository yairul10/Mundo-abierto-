import {defenseDamage} from './combat.mjs';
export const BOSS_RULES=Object.freeze({id:'pvp-super-boss',name:'Titán del Nexo',maxHp:1000000,damage:11500,reward:1000000,attackInterval:3000,targets:3,patrolSpeed:80,teleportInterval:20000,range:1200,respawnDelay:300000,pos:[0,120,-1800],hitRadius:180});
export function ensureBoss(s,now){
 if(!s.boss||s.boss.hp<=0&&now>=s.boss.respawnAt)s.boss={id:BOSS_RULES.id,instanceId:crypto.randomUUID(),boss:true,connected:true,pos:[...BOSS_RULES.pos],hp:BOSS_RULES.maxHp,maxHp:BOSS_RULES.maxHp,hitRadius:BOSS_RULES.hitRadius,contributions:{},active:false,nextAttackAt:0,attackSeq:0,motionAt:now,patrolPhase:0,teleportSeq:0,rulesVersion:2};
 const b=s.boss;
 // Upgrade an in-progress round without resetting HP, damage shares or rewards.
 if(b.rulesVersion!==2){b.rulesVersion=2;b.motionAt=now;b.patrolPhase=0;b.teleportSeq=0;if(b.active){b.nextAttackAt=Math.min(b.nextAttackAt||now,now+BOSS_RULES.attackInterval);b.nextTeleportAt=now+BOSS_RULES.teleportInterval}}
 return b;
}
export function recordBossDamage(boss,owner,damage,now){
 if(!owner||!Number.isFinite(damage)||damage<=0)return;
 boss.contributions[owner.id]=(boss.contributions[owner.id]||0)+damage;
 if(!boss.active){boss.active=true;boss.nextAttackAt=now+BOSS_RULES.attackInterval;boss.nextTeleportAt=now+BOSS_RULES.teleportInterval}
}
// A bounded patrol stays clear of the 650 m base and the 3,000 m arena edge.
export function bossPatrolPosition(phase){return [550*Math.sin(phase),120+60*Math.sin(phase*2),-1800+350*(1-Math.cos(phase))]}
export function advanceBossMotion(s,now,eligible,random=Math.random){
 const b=s.boss;if(!b)return;
 const dt=Math.max(0,Math.min(3,(now-(b.motionAt??now))/1000));b.motionAt=now;
 if(b.hp<=0||!s.players.some(p=>p.connected))return;
 b.patrolPhase=((b.patrolPhase||0)+dt*BOSS_RULES.patrolSpeed/550)%(Math.PI*2);b.pos=bossPatrolPosition(b.patrolPhase);
 if(!b.active)return;
 b.nextTeleportAt??=now+BOSS_RULES.teleportInterval;
 if(now<b.nextTeleportAt)return;
 // At most one jump after a delayed alarm; don't teleport for absent/protected pilots.
 b.nextTeleportAt=now+BOSS_RULES.teleportInterval;
 if(!s.players.some(p=>eligible(p,now)&&Math.hypot(...p.pos.map((v,i)=>v-b.pos[i]))<=BOSS_RULES.range))return;
 const from=[...b.pos];b.patrolPhase=(b.patrolPhase+Math.PI+(random()-.5)*.8)%(Math.PI*2);b.pos=bossPatrolPosition(b.patrolPhase);
 b.teleportSeq=(b.teleportSeq||0)+1;b.lastTeleport={seq:b.teleportSeq,time:now,from,to:[...b.pos]};
}
// Largest remainders keep the integer credit pool exact, including fractional damage.
export function splitBossReward(contributions,pool=BOSS_RULES.reward){
 const entries=Object.entries(contributions).filter(([,d])=>Number.isFinite(d)&&d>0).sort(([a],[b])=>a.localeCompare(b)),total=entries.reduce((sum,[,d])=>sum+d,0);
 if(!total)return [];
 const shares=entries.map(([playerId,damage])=>{const exact=damage/total*pool;return {playerId,damage,totalDamage:total,amount:Math.floor(exact),fraction:exact-Math.floor(exact)}});
 const ranked=[...shares].sort((a,b)=>b.fraction-a.fraction||a.playerId.localeCompare(b.playerId));
 for(let i=0,left=pool-shares.reduce((sum,x)=>sum+x.amount,0);i<left;i++)ranked[i%ranked.length].amount++;
 return shares.map(({fraction,...x})=>x);
}
export function tickBoss(s,now,eligible){
 const b=s.boss;if(!b)return;
 if(b.hp<=0){
  b.aimTargets=[];
  if(!b.rewarded){b.rewarded=true;b.active=false;b.respawnAt=now+BOSS_RULES.respawnDelay;s.bossRewards||=[];for(const share of splitBossReward(b.contributions))if(share.amount>0)s.bossRewards.push({...share,id:b.instanceId+':'+share.playerId,bossId:b.instanceId});s.events.push({type:'bossDefeated',id:b.instanceId,time:now})}
  return;
 }
 if(!b.active){b.aimTargets=[];return}
 const targets=s.players.filter(p=>eligible(p,now)&&Math.hypot(...p.pos.map((v,i)=>v-b.pos[i]))<=BOSS_RULES.range).sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id)).slice(0,BOSS_RULES.targets);
 b.aimTargets=targets.map(p=>({targetId:p.id,targetPos:[...p.pos]}));
 if(now<b.nextAttackAt)return;
 // No catch-up bursts after inactivity. Retarget at each shot.
 b.nextAttackAt=now+BOSS_RULES.attackInterval;if(!targets.length)return;
 const sharedDamage=BOSS_RULES.damage*BOSS_RULES.targets/targets.length;
 const hits=targets.map(target=>{const damage=Math.min(target.hp,defenseDamage(target,sharedDamage,now));target.hp=Math.max(0,target.hp-damage);target.lastHit=target.lastIncoming=now;target.lastDamagedBy=b.id;return {targetId:target.id,targetPos:[...target.pos],damage}});
 b.attackSeq++;b.lastAttack={seq:b.attackSeq,time:now,origin:[...b.pos],targets:hits,...hits[0]};
}
export function bossSnapshot(b){if(!b)return null;return {id:b.id,instanceId:b.instanceId,name:BOSS_RULES.name,pos:b.pos,hp:b.hp,maxHp:b.maxHp,active:b.active,respawnAt:b.respawnAt||0,reward:BOSS_RULES.reward,range:BOSS_RULES.range,lastAttack:b.lastAttack||null,lastTeleport:b.lastTeleport||null,aimTargets:b.aimTargets||[],nextAttackAt:b.nextAttackAt||0}}
