import {defenseDamage} from './combat.mjs';
export const NPC_PATTERNS=Object.freeze({titan:{interval:8000,charge:2500,range:1200},catapult:{interval:6000,charge:1400,range:1200},harpooner:{interval:5000,charge:0,range:1200},stalker:{interval:3000,charge:500,range:1400}});
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function event(b,now,kind,shots){b.attackSeq=(b.attackSeq||0)+1;b.lastAttack={seq:b.attackSeq,time:now,origin:[...b.pos],projectile:kind,shots,targets:shots.map(x=>({targetId:x.targetId,targetPos:x.targetPos})),special:true};b.patternEvents=[...(b.patternEvents||[]).filter(e=>now-e.time<6000),b.lastAttack].slice(-8)}
function bullet(s,b,target,now,kind,damage,offset=0){
 const delta=target.pos.map((v,i)=>v-b.pos[i]),length=Math.hypot(...delta)||1,dir=delta.map(v=>v/length),across=[-dir[2],0,dir[0]],aim=dir.map((v,i)=>v+across[i]*offset),norm=Math.hypot(...aim)||1,speed=kind==='sniper'?6000:kind==='harpoon'?650:570;
 const vel=aim.map(v=>v/norm*speed),paralyzeMs=kind==='sniper'?0:3000;
 const shot={id:crypto.randomUUID(),owner:b.id,combatZone:b.rules.zone,pos:[...b.pos],vel,life:kind==='sniper'?.5:5,range:kind==='sniper'?1500:1600,damage,missile:false,age:0,travelled:0,specialNpc:true,paralyzeMs,tetherDps:paralyzeMs?b.rules.tetherDps||230:0};
 (s.bullets||=[]).push(shot);return {id:shot.id,origin:[...shot.pos],velocity:vel,targetId:target.id,targetPos:[...target.pos],life:shot.life};
}
export function tickNpcPattern(s,b,now,targets){
 const kind=b.rules.attackPattern,rule=NPC_PATTERNS[kind];if(!rule)return;
 if(!b.active||b.hp<=0||!targets.length){b.charge=null;b.patternDue=null;return}
 if(b.patternDue==null||now-b.patternDue>500){b.patternDue=now+rule.charge;b.charge=null}
 const round=b.patternRound||0,weapon=kind==='titan'?(round%2?'bomb':'spear'):kind==='catapult'?'bomb':kind==='stalker'?'sniper':'harpoon';
 if(!b.charge&&now>=b.patternDue-rule.charge)b.charge={kind:weapon,start:now,fireAt:Math.max(now,b.patternDue),targets:targets.map(p=>({targetId:p.id,targetPos:[...p.pos]}))};
 // The sniper tracks during its half-second warning; bombs commit to the marked area.
 if(b.charge&&kind==='stalker')b.charge.targets=targets.map(p=>({targetId:p.id,targetPos:[...p.pos]}));
 if(!b.charge||now<b.charge.fireAt)return;
 const selected=b.charge.targets.map(t=>({mark:t,player:targets.find(p=>p.id===t.targetId)})).filter(t=>t.player),shots=[];
 for(const {mark,player}of selected){
  if(weapon==='bomb'){
   const offsets=kind==='titan'?[[0,0],...[-1,0,1].map(i=>[Math.cos(round*Math.PI/4+i*2*Math.PI/3)*220,Math.sin(round*Math.PI/4+i*2*Math.PI/3)*220])]:[[0,0]];
   for(const [x,z]of offsets){const target=mark.targetPos.map((v,i)=>v+(i===0?x:i===2?z:0)),fuse=kind==='titan'?3500:1500,radius=kind==='titan'?150:180,shot={origin:[...b.pos],targetPos:target,targetId:player.id,detonateAt:now+fuse,radius,arc:kind==='catapult'?180:0};shots.push(shot);(b.bombs||=[]).push({...shot,instance:b.instanceId,damage:kind==='titan'?2070:b.rules.damage})}
  }else if(weapon==='spear'){
   const gap=[-2,-1,1,2][round%4];for(let lane=-3;lane<=3;lane++)if(lane!==gap)shots.push(bullet(s,b,player,now,'spear',b.rules.damage,lane*.13));
  }else shots.push(bullet(s,b,player,now,weapon,weapon==='harpoon'?0:b.rules.damage));
 }
 if(shots.length)event(b,now,weapon,shots);
 b.patternRound=round+1;b.patternDue=now+rule.interval;b.nextAttackAt=b.patternDue;b.charge=null;
}
export function advanceNpcHazards(s,now,eligible){
 for(const b of s.arenaEnemies||[]){
  b.patternEvents=(b.patternEvents||[]).filter(e=>now-e.time<6000);
  b.bombs=(b.bombs||[]).filter(bomb=>{
   if(b.hp<=0||bomb.instance!==b.instanceId)return false;
   if(now<bomb.detonateAt)return true;
   // No stale blast after a hibernation gap; every explosion is consumed once.
   if(now-bomb.detonateAt<=500)for(const p of s.players)if((p.clientVersion??5)>=5&&eligible(b,p,now)&&dist(p.pos,bomb.targetPos)<bomb.radius){const damage=Math.min(p.hp,defenseDamage(p,bomb.damage,now));p.hp-=damage;p.lastHit=p.lastIncoming=now;p.lastDamagedBy=b.id}
   return false;
  });
 }
 for(const p of s.players){const t=p.npcTether;if(!t)continue;const owner=s.arenaEnemies?.find(b=>b.id===t.owner&&b.instanceId===t.instance);
  if(!owner||owner.hp<=0||p.hp<=0||p.paralyzedUntil<=now||!eligible(owner,p,now)){if(p.paralyzedUntil===t.until)p.paralyzedUntil=0;p.npcTether=null;continue}
  if(!t.partnerTriggered){t.partnerTriggered=true;const partner=s.arenaEnemies.find(b=>b.id===owner.partnerId);if(partner&&partner.hp>0&&!partner.charge&&!partner.bombs?.length){partner.active=true;partner.patternDue=null}}
  const dt=Math.max(0,Math.min(.3,(now-t.tickAt)/1000));t.tickAt=now;
  const damage=Math.min(p.hp,defenseDamage(p,t.dps,now)*dt);p.hp-=damage;p.lastHit=p.lastIncoming=now;p.lastDamagedBy=owner.id;
 }
}
