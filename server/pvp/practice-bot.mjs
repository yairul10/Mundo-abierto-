import {arenaRadius,modeRules,teamForSlot,spawnForSlot} from './pvp-teams.mjs';
import {missileLaunches} from '../../js/missile-launch.js';
import {equip,reset} from './world-rules.mjs';
import {volley,ability} from './combat.mjs';
import {activateSkill,skillActive} from './skills.mjs';
export function createPracticeBot(human,match,now,slot=1){
 const bot={id:'bot-'+match.code+(modeRules(match).capacity>2?'-'+slot:''),slot,team:teamForSlot(slot,match),name:modeRules(match).capacity===2?'Piloto de práctica · BOT':teamForSlot(slot,match)===human.team?'Aliado de práctica · BOT':'Rival '+slot+' · BOT',isBot:true,connected:true,ready:true,revision:0,clientVersion:5,realm:human.realm,roster:JSON.parse(JSON.stringify(human.roster)),spawn:spawnForSlot(slot,match),aim:[modeRules(match).freeForAll?slot*Math.PI/10:teamForSlot(slot,match)==='a'?0:Math.PI,0],lastSeen:now,lastInput:now,seq:-1};
 delete bot.roster.adminpod;equip(bot,human.profile.shipId);reset(bot,true);bot.duelId=match.code;bot.duelStartsAt=Number.MAX_SAFE_INTEGER;bot.equippedSkills=['instantShield','fury'];
 return bot;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=v=>Math.hypot(...v);
const unit=v=>{const d=length(v)||1;return v.map(x=>x/d)};
// Only decisions have a reaction delay. Every shot aims at the ship's current
// position, using the same projectile speeds, damage and cooldowns as players.
export function advancePracticeBot(s,now,canDamage,random=Math.random){
 for(const bot of s.players.filter(p=>p.isBot&&p.hp>0)){
  const enemies=s.players.filter(p=>canDamage(bot,p)).sort((a,b)=>length(a.pos.map((v,i)=>v-bot.pos[i]))-length(b.pos.map((v,i)=>v-bot.pos[i])));
  const previous=enemies.find(p=>p.id===bot.botBrain?.targetId),target=previous&&now<(bot.botBrain?.nextThinkAt||0)?previous:enemies[0];
  if(target)advanceOneBot(s,bot,target,now,canDamage,random);else bot.firing=false;
 }
}
function advanceOneBot(s,bot,target,now,canDamage,random){
 if(bot)bot.firing=false;
 if(!bot||!target||!canDamage(bot,target))return;
 const brain=bot.botBrain||={tickAt:now,engageAt:now+300,nextThinkAt:now,side:1,move:[0,0,0],phase:random()*Math.PI*2};
 brain.targetId=target.id;
 const dt=clamp((now-brain.tickAt)/1000,0,.15);brain.tickAt=now;
 const delta=target.pos.map((v,i)=>v-bot.pos[i]),distance=length(delta),toward=unit(delta);
 if(now>=brain.nextThinkAt){
  brain.nextThinkAt=now+300+random()*250;
  const nearby=(s.bullets||[]).some(b=>b.owner!==bot.id&&canDamage(s.players.find(p=>p.id===b.owner),bot)&&b.life>0&&length(b.pos.map((v,i)=>v-bot.pos[i]))<750&&b.vel.reduce((n,v,i)=>n+v*(bot.pos[i]-b.pos[i]),0)>0);
  if(now>=(brain.nextStrafeAt||0)||nearby&&random()<.55){brain.side=random()<.5?-1:1;brain.nextStrafeAt=now+1100+random()*1300}
  const retreat=bot.hp/bot.profile.maxHp<.3,forward=distance>(retreat?1000:850)?1:distance<(retreat?750:450)?-1:0;
  const lateral=unit([-toward[2],0,toward[0]]),movement=toward.map((v,i)=>v*forward*.8+lateral[i]*brain.side*(nearby?.9:.65));
  movement[1]+=.22*Math.sin(now*.0015+brain.phase);
  const radius=Math.hypot(bot.pos[0],bot.pos[2]);if(radius>arenaRadius(s.pvpMatch)*.8){movement[0]-=bot.pos[0]/radius*.8;movement[2]-=bot.pos[2]/radius*.8}
  if(Math.abs(bot.pos[1])>650)movement[1]-=Math.sign(bot.pos[1])*.5;
  const speed=Math.max(1,length(movement));brain.move=movement.map(v=>v/speed);
  if(now>=brain.engageAt){
   if(nearby||bot.hp<bot.profile.maxHp*.65)activateSkill(bot,'instantShield',now);
   if(distance<1000&&!skillActive(target,'instantShield',now))activateSkill(bot,'fury',now);
   if(distance<1050||nearby){if(ability(bot,now)&&['centella','vertigo'].includes(bot.profile.shipId))bot.paralyzedUntil=0}
  }
 }
 if((bot.paralyzedUntil||0)<=now)bot.pos=bot.pos.map((v,i)=>v+brain.move[i]*bot.profile.speed*dt);
 const radius=Math.hypot(bot.pos[0],bot.pos[2]);if(radius>arenaRadius(s.pvpMatch)){bot.pos[0]*=arenaRadius(s.pvpMatch)/radius;bot.pos[2]*=arenaRadius(s.pvpMatch)/radius}bot.pos[1]=clamp(bot.pos[1],-900,900);
 const aim=target.pos.map((v,i)=>v-bot.pos[i]);bot.aim=[Math.atan2(-aim[0],-aim[2]),clamp(Math.atan2(aim[1],Math.hypot(aim[0],aim[2])),-1.15,1.15)];
 if(now<brain.engageAt||length(aim)>1200)return;
 const shot=(offset,kind)=>({offset,kind,direction:unit(target.pos.map((v,i)=>v-bot.pos[i]-offset[i])),speed:650,delay:.55,locked:true,crit:random()<.15+(bot.profile.special.crit||0)*.01});
 const combat={players:s.players,bullets:s.bullets||[],canDamage};
 const fire=(weapon,shots)=>{const fired=volley(combat,bot,{weapon,targetId:target.id,shots},now);if(fired?.length){s.botVolleys||=[];s.botVolleys.push({owner:bot.id,shots:fired,serverTime:now});s.botVolleys=s.botVolleys.slice(-12)}};
 const lasers=[shot([-12,0,0],'laser'),shot([12,0,0],'laser')];for(let i=0;i<bot.profile.droneCount;i++)lasers.push(shot([(i%2?1:-1)*(55+Math.floor(i/2)*18),12,20],'drone'));
 fire('laser',lasers);
 if(now-(bot.last_missile||0)>=6980){const [yaw,pitch]=bot.aim,forward=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];fire('missile',missileLaunches(bot.pos,forward,target.pos,bot.profile.missiles,random).map(launch=>({...launch,kind:'missile',locked:true})));}
 if(bot.profile.explorerDrone)fire('explorer',[shot([65,25,60],'explorer')]);
 s.bullets=combat.bullets;bot.firing=true;
}


