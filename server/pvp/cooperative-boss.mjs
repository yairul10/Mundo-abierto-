import {defenseDamage} from './combat.mjs';
export const BOSS_RULES=Object.freeze({id:'pvp-super-boss',name:'Titán del Nexo',maxHp:1000000,damage:1000,reward:1000000,attackInterval:5000,range:1200,respawnDelay:300000,pos:[0,120,-1800],hitRadius:180});
export function ensureBoss(s,now){
 if(!s.boss||s.boss.hp<=0&&now>=s.boss.respawnAt)s.boss={id:BOSS_RULES.id,instanceId:crypto.randomUUID(),boss:true,connected:true,pos:[...BOSS_RULES.pos],hp:BOSS_RULES.maxHp,maxHp:BOSS_RULES.maxHp,hitRadius:BOSS_RULES.hitRadius,contributions:{},active:false,nextAttackAt:0,attackSeq:0};
 return s.boss;
}
export function recordBossDamage(boss,owner,damage,now){
 if(!owner||!Number.isFinite(damage)||damage<=0)return;
 boss.contributions[owner.id]=(boss.contributions[owner.id]||0)+damage;
 if(!boss.active){boss.active=true;boss.nextAttackAt=now+BOSS_RULES.attackInterval}
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
  if(!b.rewarded){b.rewarded=true;b.active=false;b.respawnAt=now+BOSS_RULES.respawnDelay;s.bossRewards||=[];for(const share of splitBossReward(b.contributions))if(share.amount>0)s.bossRewards.push({...share,id:b.instanceId+':'+share.playerId,bossId:b.instanceId});s.events.push({type:'bossDefeated',id:b.instanceId,time:now})}
  return;
 }
 if(!b.active||now<b.nextAttackAt)return;
 const target=s.players.filter(p=>eligible(p,now)&&Math.hypot(...p.pos.map((v,i)=>v-b.pos[i]))<=BOSS_RULES.range).sort((a,b)=>b.hp-a.hp||a.id.localeCompare(b.id))[0];
 // No catch-up bursts after inactivity. Retarget at each shot.
 b.nextAttackAt=now+BOSS_RULES.attackInterval;if(!target)return;
 const damage=Math.min(target.hp,defenseDamage(target,BOSS_RULES.damage,now));target.hp=Math.max(0,target.hp-damage);target.lastHit=target.lastIncoming=now;target.lastDamagedBy=b.id;
 b.attackSeq++;b.lastAttack={seq:b.attackSeq,time:now,targetId:target.id,targetPos:[...target.pos],damage};
}
export function bossSnapshot(b){if(!b)return null;return {id:b.id,instanceId:b.instanceId,name:BOSS_RULES.name,pos:b.pos,hp:b.hp,maxHp:b.maxHp,active:b.active,respawnAt:b.respawnAt||0,reward:BOSS_RULES.reward,range:BOSS_RULES.range,lastAttack:b.lastAttack||null}}
