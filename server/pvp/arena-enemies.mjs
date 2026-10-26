import {BOSS_RULES,ensureBoss,advanceBossMotion,tickBoss,recordBossDamage,bossSnapshot,splitBossReward} from './cooperative-boss.mjs';

export const ARENA_ENEMIES=Object.freeze([
 {...BOSS_RULES,id:'pvp-super-boss',name:'Titán del Nexo I',kind:'nexo',pos:[-1600,120,-1300],patrolRadius:240,reward:1100000},
 {...BOSS_RULES,id:'pvp-nexo-2',name:'Titán del Nexo II',kind:'nexo',pos:[1600,120,-1300],patrolRadius:240,reward:1100000},
 ...[-1,1].map((side,i)=>({...BOSS_RULES,id:'pvp-coloso-'+(i+1),name:'Coloso Pro '+(i+1),kind:'colossusPro',projectile:'missile',pos:[side*1600,120,1050],patrolRadius:230,maxHp:200000,damage:750,targets:1,attackInterval:5000,teleportInterval:0,reward:55000,hitRadius:255,materialCount:60}))
]);
const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
export function ensureArenaEnemies(s,now){
 if(s.realm!=='test')return [ensureBoss(s,now)];
 s.arenaEnemies||=[];
 const next=[];
 for(const rules of ARENA_ENEMIES){
  const saved=s.arenaEnemies.find(b=>b.id===rules.id)||(rules.id==='pvp-super-boss'?s.boss:null),holder={boss:saved};
  const b=ensureBoss(holder,now,rules);b.npc=true;b.kind=rules.kind;b.level=105;
  if(!b.arenaPlaced){b.pos=[...rules.pos];b.arenaPlaced=true;b.patrolPhase=0}
  next.push(b);
 }
 const parents=new Map(next.map(b=>[b.id,b]));
 for(const b of s.arenaEnemies.filter(b=>b.kind==='reinforcement'))if(parents.get(b.parentId)?.instanceId===b.parentInstance&&parents.get(b.parentId).hp>0)next.push(b);
 s.arenaEnemies=next;s.boss=next[0];return next;
}
export function recordArenaDamage(s,target,owner,damage,now){
 recordBossDamage(target,owner,damage,now);
 if(target.kind==='reinforcement'){
  const parent=s.arenaEnemies?.find(b=>b.id===target.parentId);if(parent?.hp>0){(parent.participants||={})[owner.id]=true;if(!parent.active){parent.active=true;parent.nextAttackAt=now+parent.rules.attackInterval;parent.nextTeleportAt=now+parent.rules.teleportInterval}}
 }
}
function spawnWave(s,parent,threshold,now){
 parent.waves||=[];if(parent.waves.includes(threshold))return;
 parent.waves.push(threshold);
 for(let i=0;i<2;i++){
  const children=s.arenaEnemies.filter(b=>b.parentInstance===parent.instanceId);
  if(children.length>=6||children.filter(b=>b.hp>0).length>=6)break;
  const types=['raider','sentinel','destroyer'],model=types[parent.waves.length-1],hp={raider:7000,sentinel:14000,destroyer:28000}[model],index=children.length;
  const rules={...BOSS_RULES,id:parent.id+'-add-'+index,name:{raider:'Asaltante',sentinel:'Guardián',destroyer:'Destructor'}[model],kind:'reinforcement',projectile:'laser',maxHp:hp,hitRadius:35,reward:220,damage:300,targets:1,attackInterval:1800,range:800,respawnDelay:0,pos:[parent.pos[0]+(i?140:-140),parent.pos[1],parent.pos[2]+100]};
  const b=ensureBoss({},now,rules);Object.assign(b,{npc:true,kind:'reinforcement',model,parentId:parent.id,parentInstance:parent.instanceId,level:105,active:true,motionAt:now,spawnIndex:index});s.arenaEnemies.push(b);
 }
}
function materialRewards(s,b,from,random){
 if(!b.rules.materialCount)return;
 const receipts=s.bossRewards.slice(from).filter(r=>r.bossId===b.instanceId),counts={};
 const exact=b.rules.materialCount*1.1,quantity=Math.floor(exact)+(random()<exact%1?1:0);
 for(let i=0;i<quantity;i++){const roll=random(),key=roll<.53?'chatarra':roll<.81?'aleacion':roll<.96?'nucleo':'reliquia';counts[key]=(counts[key]||0)+1}
 for(const [key,pool]of Object.entries(counts)){
  for(const share of splitBossReward(b.contributions,pool)){
   const receipt=receipts.find(r=>r.playerId===share.playerId);if(receipt&&share.amount>0)(receipt.materials||={})[key]=share.amount;
  }
 }
}
export function advanceArenaEnemies(s,now,eligible,random=Math.random){
 if(s.realm!=='test')return;
 ensureArenaEnemies(s,now);s.bossRewards||=[];
 for(const b of [...s.arenaEnemies]){
  if(b.kind!=='reinforcement')advanceBossMotion({...s,boss:b},now,eligible,random);
  else{
   const dt=Math.max(0,Math.min(.3,(now-b.motionAt)/1000));b.motionAt=now;
   const parent=s.arenaEnemies.find(p=>p.id===b.parentId),targets=s.players.filter(p=>eligible(p,now)&&(parent?.contributions?.[p.id]>0||parent?.participants?.[p.id])&&distance(p,parent)<1400).sort((a,c)=>distance(a,b)-distance(c,b)),target=targets[0];
   if(!parent||parent.hp<=0){b.hp=0;b.rewarded=true;continue}
   if(target&&distance(target,b)>400){const direction=target.pos.map((v,i)=>v-b.pos[i]),length=Math.hypot(...direction)||1;b.pos=b.pos.map((v,i)=>v+direction[i]/length*180*dt)}
   // Reinforcements remain in their parent's sector and never cross the base.
   const leash=distance(b,parent);if(leash>900)b.pos=b.pos.map((v,i)=>parent.pos[i]+(v-parent.pos[i])*900/leash);
   if(Math.hypot(...b.pos)<800){const length=Math.hypot(...b.pos)||1;b.pos=b.pos.map(v=>v*800/length)}
  }
  if(b.kind==='colossusPro'&&b.active&&b.hp>0)for(const threshold of [70,40,10])if(b.hp/b.maxHp*100<=threshold)spawnWave(s,b,threshold,now);
  // Reinforcements only engage pilots participating against their own parent.
  const allowed=b.kind==='reinforcement'?p=>eligible(p,now)&&!!((s.arenaEnemies.find(x=>x.id===b.parentId)?.contributions?.[p.id]||0)>0||s.arenaEnemies.find(x=>x.id===b.parentId)?.participants?.[p.id]):eligible;
  const from=s.bossRewards.length;tickBoss({...s,boss:b,bossRewards:s.bossRewards},now,allowed);
  if(b.hp<=0&&s.bossRewards.length>from)materialRewards(s,b,from,random);
 }
 // Remove leftovers on the next snapshot when their carrier is destroyed.
 for(const b of s.arenaEnemies)if(b.kind==='reinforcement'&&s.arenaEnemies.find(p=>p.id===b.parentId)?.hp<=0){b.hp=0;b.rewarded=true}
}
export function arenaEnemySnapshots(s){
 if(s.realm!=='test')return [];
 return (s.arenaEnemies||[]).map(b=>({...bossSnapshot(b),kind:b.kind,model:b.model||null,parentId:b.parentId||null,level:b.level||105}));
}
