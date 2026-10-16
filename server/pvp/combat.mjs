import {clearSkills,skillActive} from './skills.mjs';
const ASSEMBLED_SHIPS={segadora:'espectro',bastion:'titan',centella:'aurora'};
const shipRole=id=>ASSEMBLED_SHIPS[id]||id;
// Prueba con equipamiento local. No concede premios ni acredita propiedad de compras.
const clamp=(n,a,b,f=a)=>Number.isFinite(Number(n))?Math.max(a,Math.min(b,Number(n))):f;
export function profile(raw){if(!raw||typeof raw!=='object')return null;const maxHp=clamp(raw.maxHp,1,100000,100),maxEnergy=clamp(raw.maxEnergy,1,100000,100);const shipId=['aurora','titan','espectro',...Object.keys(ASSEMBLED_SHIPS)].includes(raw.shipId)?raw.shipId:'aurora';return {maxHp,hp:clamp(raw.hp,1,maxHp,maxHp),maxEnergy,energy:clamp(raw.energy,0,maxEnergy,maxEnergy),attack:clamp(raw.attack,1,100000,10),defense:clamp(raw.defense,0,100000,5),speed:clamp(raw.speed,50,5000,220),level:clamp(raw.level,1,10000,1),shipId,droneCount:Math.floor(clamp(raw.droneCount,0,8)),explorerDrone:!!raw.explorerDrone,repairRobotLevel:raw.repairRobot?Math.floor(clamp(raw.repairRobotLevel,1,5)):0,missiles:1+Math.floor(clamp(raw.upgrades?.missiles,0,10)),special:Object.fromEntries(Object.entries(raw.shipSpecializations?.[shipId]||{}).filter(([k])=>['energy','overload','shield','armor','fortress','repair','crit','fury','evasion'].includes(k)).map(([k,v])=>[k,Math.floor(clamp(v,0,10))]))}}
export function makeCombatPlayer(p,raw){p.profile=profile(raw);clearSkills(p);if(p.profile){p.hp=p.profile.hp;p.energy=p.profile.energy;p.abilityUntil=0;p.lastHit=0;p.lastAttack=0;p.lastIncoming=0;p.lastSim=Date.now()}}
export function ability(p,now){const cost={aurora:40,titan:55,espectro:65}[shipRole(p.profile?.shipId)];if(!cost||p.energy<cost||p.abilityUntil>now)return false;p.energy-=cost;const id=shipRole(p.profile.shipId),sp=p.profile.special;p.abilityUntil=now+1000*((id==='titan'?6:5)+(sp[id==='aurora'?'overload':id==='titan'?'fortress':'fury']||0)*(id==='titan'?.3:.25));return true}
export function defenseDamage(p,amount,now,random=Math.random){const q=p.profile;if(!q)return amount;let damage=Math.max(1,amount-q.defense*.25);if(shipRole(q.shipId)==='espectro'&&random()<(q.special.evasion||0)*.008)return 0;if(shipRole(q.shipId)==='titan')damage*=1-(.1+(q.special.armor||0)*.01);if(p.abilityUntil>now)damage*=shipRole(q.shipId)==='titan'?(q.shipId==='bastion'?.2:.3):shipRole(q.shipId)==='espectro'?(q.shipId==='segadora'?1.2:1.3):1;return damage*(q.resistance||1)*(skillActive(p,'instantShield',now)?.5:1)}
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
export function volley(s,p,m,now){const q=p.profile;if(!q||!Array.isArray(m.shots)||!m.shots.length||m.shots.length>12)return null;const kind=m.weapon;if(!['laser','missile','explorer'].includes(kind))return null;const cooldown=kind==='missile'?7000:kind==='explorer'?680:p.abilityUntil>now&&shipRole(q.shipId)==='aurora'?680/(q.shipId==='centella'?1.4:1.3):680;const key='last_'+kind;if(now-(p[key]||0)<cooldown-20)return null;
 const chosen=s.players.find(x=>x.id===m.targetId&&(!s.canDamage||s.canDamage(p,x,now)))||(!s.canDamage?s.players.find(x=>x.id!==p.id):null);
 const maximum=kind==='laser'?2+q.droneCount:kind==='missile'?q.missiles:q.explorerDrone?1:0;if(m.shots.length>maximum)return null;let lasers=0,drones=0;const bullets=[];
 for(const shot of m.shots){if(!vector(shot.offset)||Math.hypot(...shot.offset)>(kind==='explorer'?(q.explorerRange||1450)+60:500)||!vector(shot.direction)||Math.abs(Math.hypot(...shot.direction)-1)>.01)return null;const missile=kind==='missile',drone=kind==='explorer'||shot.kind==='drone';if(kind==='laser'){if(drone)drones++;else lasers++;if(lasers>2||drones>q.droneCount)return null}const speed=missile?clamp(shot.speed,440,850,650):1150,damage=q.attack*(missile?3:drone?.2:.5)*(kind==='laser'&&!drone&&p.abilityUntil>now&&shipRole(q.shipId)==='espectro'?(q.shipId==='segadora'?1.7:1.6):1)*(kind==='laser'&&!drone&&shipRole(q.shipId)==='espectro'&&shot.crit?1.5:1)*(q.damageBonus||1)*(drone&&kind==='laser'?(q.droneDamage||1):1);
 bullets.push({id:crypto.randomUUID(),owner:p.id,pos:p.pos.map((v,i)=>v+shot.offset[i]),vel:shot.direction.map(v=>v*speed),life:missile?5:((kind==='laser'&&drone?q.droneRange||1200:1200)/1150+.35),range:kind==='laser'&&drone?q.droneRange||1200:1200,damage,missile,speed,delay:missile?clamp(shot.delay,.42,1.22,.55):0,age:0,travelled:0,target:missile&&shot.locked&&chosen&&!skillActive(chosen,'interference',now)?chosen.id:null});}
 p[key]=now;p.lastAttack=now;const other=chosen;if(other&&Math.hypot(...other.pos.map((v,i)=>v-p.pos[i]))<=Math.max(1200,...bullets.map(b=>b.range)))other.lastIncoming=now;s.bullets||=[];s.bullets.push(...bullets);return bullets;
}
export function stepCombat(s,now){if(s.status!=='active')return;const elapsed=Math.max(0,Math.min(.3,(now-(s.simTime||now))/1000));s.simTime=now;
 for(const p of s.players){const q=p.profile;if(!q)continue;p.energy=Math.min(q.maxEnergy,p.energy+elapsed*5*(shipRole(q.shipId)==='aurora'?1.2+(q.special.energy||0)*.04:1));if(p.hp<=0)continue;if(shipRole(q.shipId)==='aurora'&&p.abilityUntil>now)p.hp=Math.min(q.maxHp,p.hp+q.maxHp*.003*(q.special.shield||0)*elapsed);if(shipRole(q.shipId)==='titan'&&now-p.lastHit>5000)p.hp=Math.min(q.maxHp,p.hp+q.maxHp*.0015*(q.special.repair||0)*elapsed);if(q.repairRobotLevel&&now-Math.max(p.lastHit,p.lastAttack,p.lastIncoming)>=2000&&!p.firing)p.hp=Math.min(q.maxHp,p.hp+q.maxHp*.01*q.repairRobotLevel*(q.repairBonus||1)*elapsed);}
 for(let remaining=elapsed;remaining>1e-6;){const dt=Math.min(.025,remaining);remaining-=dt;
  for(const b of s.bullets||[]){
   if(b.life<=0)continue;
   const owner=s.players.find(p=>p.id===b.owner);
   if(!owner?.connected||owner.hp<=0||s.canDamage&&!s.canDamage(owner,null,now)){b.life=0;continue}
   b.age+=dt;const locked=s.players.find(p=>p.id===b.target);
   if(b.target&&(!locked||!locked.connected||locked.hp<=0||skillActive(locked,'interference',now)||s.canDamage&&!s.canDamage(owner,locked,now)))b.target=null;
   if(b.missile&&b.target&&locked){const delta=locked.pos.map((v,i)=>v-b.pos[i]),length=Math.hypot(...delta)||1,alpha=Math.min(1,dt*(b.age<b.delay?.12:3.7));b.vel=b.vel.map((v,i)=>v+(delta[i]/length*b.speed-v)*alpha)}
   const prev=[...b.pos];b.pos=b.pos.map((v,i)=>v+b.vel[i]*dt);b.life-=dt;b.travelled=(b.travelled||0)+Math.hypot(...b.vel)*dt;
   if(!b.missile&&b.travelled>(b.range||1200)){b.life=0;continue}
   const segment=b.pos.map((v,i)=>v-prev[i]),length2=segment.reduce((sum,v)=>sum+v*v,0);let victim=null,best=Infinity;
   for(const target of s.players){
    if(target.id===b.owner||!target.connected||target.hp<=0||s.canDamage&&!s.canDamage(owner,target,now))continue;
    if(!b.missile&&Math.hypot(...target.pos.map((v,i)=>v-owner.pos[i]))>(b.range||1200))continue;
    const along=Math.max(0,Math.min(1,target.pos.reduce((sum,v,i)=>sum+(v-prev[i])*segment[i],0)/(length2||1))),distance=Math.hypot(...target.pos.map((v,i)=>v-prev[i]-segment[i]*along));
    if(distance<(b.missile?44:30)&&along<best){victim=target;best=along}
   }
   if(victim){const damage=Math.min(victim.hp,defenseDamage(victim,b.damage*(skillActive(owner,'fury',now)?2:1),now));victim.hp=Math.max(0,victim.hp-damage);if(owner.hp>0&&skillActive(owner,'transfer',now))owner.hp=Math.min(owner.profile.maxHp,owner.hp+damage*.5);victim.lastHit=victim.lastIncoming=now;victim.lastDamagedBy=owner.id;b.life=0}
  }
 }
 s.bullets=(s.bullets||[]).filter(b=>b.life>0);
}
