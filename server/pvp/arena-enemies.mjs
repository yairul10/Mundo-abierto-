import {BOSS_RULES,ensureBoss,advanceBossMotion,tickBoss,recordBossDamage,bossSnapshot,splitBossReward} from './cooperative-boss.mjs';

import {zoneOf,constrainEnemy} from './zones.mjs';
export const ARENA_ENEMIES=Object.freeze([
 {...BOSS_RULES,id:'pvp-super-boss',name:'Titán del Nexo',kind:'nexo',zone:'hostile',pos:[0,120,-4550],patrolRadius:150,reward:1100000},
 {...BOSS_RULES,id:'pvp-gran-titan',name:'Gran Titán Pro',kind:'granTitanPro',zone:'pve',pos:[0,120,1250],patrolRadius:100,maxHp:368000,damage:1472,targets:2,attackInterval:4000,teleportInterval:0,reward:151800,xpReward:227700,materialCount:60,hitRadius:270,projectile:'missile'},
 ...[-1,1].map((side,i)=>({...BOSS_RULES,id:'pvp-coloso-'+(i+1),name:'Coloso Pro '+(i+1),kind:'colossusPro',zone:'pve',projectile:'missile',pos:[side*1200,120,-250],patrolRadius:100,maxHp:200000,damage:750,targets:1,attackInterval:5000,teleportInterval:0,reward:55000,xpReward:82500,hitRadius:220,materialCount:60}))
]);
// PvE rewards at level 105 use min(2.5, 1 + (level - 1) * .035).
// PvP Coloso reinforcements are Pro (2x health and damage), with 20% bonus
// credits over the equivalent level-105 PvE enemy.
const PVE_REINFORCEMENTS=Object.freeze({
 raider:{hp:70,damage:10,gold:20},
 sentinel:{hp:140,damage:20,gold:40},
 destroyer:{hp:280,damage:35,gold:80}
});
const REINFORCEMENT_LEVEL=105;
const REINFORCEMENT_REWARD_SCALE=Math.min(2.5,1+(REINFORCEMENT_LEVEL-1)*.035);
const REINFORCEMENT_PVP_BONUS=1.2;
const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
export function ensureArenaEnemies(s,now){
 s.arenaEnemies||=[];
 const next=[];
 for(const rules of ARENA_ENEMIES){
  const saved=s.arenaEnemies.find(b=>b.id===rules.id)||(rules.id==='pvp-super-boss'?s.boss:null),holder={boss:saved};
  const b=ensureBoss(holder,now,rules);b.npc=true;b.kind=rules.kind;b.level=105;
  if(b.arenaLayout!==3){b.pos=[...rules.pos];b.arenaPlaced=true;b.arenaLayout=3;b.patrolPhase=0}constrainEnemy(b)
  next.push(b);
 }
 const parents=new Map(next.map(b=>[b.id,b]));
 for(const b of s.arenaEnemies.filter(b=>b.kind==='reinforcement'))if(parents.get(b.parentId)?.instanceId===b.parentInstance){b.rules.zone=parents.get(b.parentId).rules.zone;next.push(b);}
 s.arenaEnemies=next;s.boss=next[0];return next;
}
export function recordArenaDamage(s,target,owner,damage,now){
 recordBossDamage(target,owner,damage,now);
 if(target.kind==='reinforcement'){
  const parent=s.arenaEnemies?.find(b=>b.id===target.parentId);if(parent?.instanceId===target.parentInstance){(parent.participants||={})[owner.id]=true;if(parent.hp>0&&!parent.active){parent.active=true;parent.nextAttackAt=now+parent.rules.attackInterval;parent.nextTeleportAt=now+parent.rules.teleportInterval}}
 }
}
function spawnWave(s,parent,threshold,now){
 parent.waves||=[];if(parent.waves.includes(threshold))return;
 parent.waves.push(threshold);
 const titan=parent.kind==='granTitanPro';
 for(let i=0;i<(titan?3:2);i++){
  const children=s.arenaEnemies.filter(b=>b.parentInstance===parent.instanceId);
  if(children.length>=6||children.filter(b=>b.hp>0).length>=6)break;
  const types=titan?['catapult','harpooner','stalker']:['raider','sentinel','destroyer'],model=titan?types[i]:types[parent.waves.length-1],hp={raider:14000,sentinel:28000,destroyer:56000,catapult:13800,harpooner:23000,stalker:18400}[model],index=children.length;
  const rules={...BOSS_RULES,zone:parent.rules.zone,id:parent.id+'-add-'+index,name:{raider:'Asaltante Pro',sentinel:'Guardián Pro',destroyer:'Destructor Pro',catapult:'Catapulta Pro',harpooner:'Arponero Pro',stalker:'Acechador Pro'}[model],kind:'reinforcement',projectile:'laser',maxHp:hp,hitRadius:35,reward:{raider:2400,sentinel:3600,destroyer:4800,catapult:2208,harpooner:3312,stalker:4416}[model],xpReward:{raider:3600,sentinel:4800,destroyer:6000,catapult:2760,harpooner:3680,stalker:4600}[model],materialCount:{raider:10,sentinel:9,destroyer:10,catapult:10,harpooner:9,stalker:10}[model],damage:titan?{catapult:1380,harpooner:230,stalker:1150}[model]:600,targets:1,attackInterval:1800,range:800,respawnDelay:0,pos:[parent.pos[0]+(i?140:-140),parent.pos[1],parent.pos[2]+100]};
  const b=ensureBoss({},now,rules);Object.assign(b,{npc:true,kind:'reinforcement',model,parentId:parent.id,parentInstance:parent.instanceId,level:105,active:true,nextAttackAt:now+rules.attackInterval,motionAt:now,spawnIndex:index});s.arenaEnemies.push(b);
 }
}
function materialRewards(s,b,from,random){
 if(!b.rules.materialCount)return;
 const receipts=s.bossRewards.slice(from).filter(r=>r.bossId===b.instanceId),counts={};
 const exact=b.rules.materialCount*(b.kind==='reinforcement'?1:1.1),quantity=Math.floor(exact)+(random()<exact%1?1:0);
 for(let i=0;i<quantity;i++){const roll=random(),key=roll<.53?'chatarra':roll<.81?'aleacion':roll<.96?'nucleo':'reliquia';counts[key]=(counts[key]||0)+1}
 for(const [key,pool]of Object.entries(counts)){
  if(b.kind==='reinforcement'){
   const receipt=receipts.find(r=>r.playerId===b.firstAttackerId);
   if(receipt)(receipt.materials||={})[key]=pool;
   continue;
  }
  for(const share of splitBossReward(b.contributions,pool)){
   const receipt=receipts.find(r=>r.playerId===share.playerId);if(receipt&&share.amount>0)(receipt.materials||={})[key]=share.amount;
  }
 }
}
function nexusCoreRewards(s,b,from,random){
 const receipts=s.bossRewards.slice(from).filter(r=>r.bossId===b.instanceId);
 if(b.kind==='reinforcement'){
  if(random()<.5){const receipt=receipts.find(r=>r.playerId===b.firstAttackerId);if(receipt)(receipt.materials||={}).nucleoNexo=1;}
  return;
 }
 const amount=b.kind==='colossusPro'?1:['nexo','granTitanPro'].includes(b.kind)?3:0;
 if(!amount)return;
 const top=Object.entries(b.contributions||{}).filter(([,v])=>v>0).sort((a,c)=>c[1]-a[1]||a[0].localeCompare(c[0])).slice(0,3);
 for(const [playerId] of top){const receipt=receipts.find(r=>r.playerId===playerId);if(receipt)(receipt.materials||={}).nucleoNexo=amount;}
}
export function advanceArenaEnemies(s,now,eligible,random=Math.random){
 ensureArenaEnemies(s,now);s.bossRewards||=[];
 for(const b of [...s.arenaEnemies]){
  if(b.kind!=='reinforcement')advanceBossMotion({...s,boss:b},now,p=>eligible(p,now)&&!p.duelId&&zoneOf(p)===b.rules.zone,random);
  else{
   const dt=Math.max(0,Math.min(.3,(now-b.motionAt)/1000));b.motionAt=now;
   const parent=s.arenaEnemies.find(p=>p.id===b.parentId),targets=s.players.filter(p=>eligible(p,now)&&(parent?.contributions?.[p.id]>0||parent?.participants?.[p.id])&&distance(p,parent)<1400).sort((a,c)=>distance(a,b)-distance(c,b)),target=targets[0];
   if(!parent||parent.instanceId!==b.parentInstance){b.hp=0;b.rewarded=true;continue}
   if(target&&distance(target,b)>400){const direction=target.pos.map((v,i)=>v-b.pos[i]),length=Math.hypot(...direction)||1;b.pos=b.pos.map((v,i)=>v+direction[i]/length*180*dt)}
   // Reinforcements remain in their parent's sector and never cross the base.
   const leash=distance(b,parent);if(leash>900)b.pos=b.pos.map((v,i)=>parent.pos[i]+(v-parent.pos[i])*900/leash);
   if(Math.hypot(...b.pos)<800){const length=Math.hypot(...b.pos)||1;b.pos=b.pos.map(v=>v*800/length)}
  }
  if(['colossusPro','granTitanPro'].includes(b.kind)&&b.active&&b.hp>0)for(const threshold of (b.kind==='granTitanPro'?[70,40]:[70,40,10]))if(b.hp/b.maxHp*100<=threshold)spawnWave(s,b,threshold,now);
  // Reinforcements only engage pilots participating against their own parent.
  const allowed=b.kind==='reinforcement'?p=>eligible(p,now)&&!p.duelId&&zoneOf(p)===b.rules.zone&&!!((s.arenaEnemies.find(x=>x.id===b.parentId)?.contributions?.[p.id]||0)>0||s.arenaEnemies.find(x=>x.id===b.parentId)?.participants?.[p.id]):p=>eligible(p,now)&&!p.duelId&&zoneOf(p)===b.rules.zone;
  constrainEnemy(b);const from=s.bossRewards.length;tickBoss({...s,boss:b,bossRewards:s.bossRewards},now,allowed);
  if(b.hp<=0&&s.bossRewards.length>from){materialRewards(s,b,from,random);nexusCoreRewards(s,b,from,random);for(const receipt of s.bossRewards.slice(from).filter(r=>r.bossId===b.instanceId))if(b.rules.xpReward)receipt.xp=b.kind==='reinforcement'?b.rules.xpReward:Math.max(0,Math.round(b.rules.xpReward*receipt.damage/Math.max(1,receipt.totalDamage)));}
 }
 // Keep surviving escorts until killed or their parent begins a new instance.
}
export function arenaEnemySnapshots(s){
 return (s.arenaEnemies||[]).map(b=>({...bossSnapshot(b),zone:b.rules.zone,kind:b.kind,model:b.model||null,parentId:b.parentId||null,level:b.level||105}));
}
