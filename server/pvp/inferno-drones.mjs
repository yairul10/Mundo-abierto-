export const INFERNO_DRONES=Object.freeze({bossHp:500000,step:50000,hp:25000,speed:640,contactRadius:55,attackerWindow:5000});
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function finish(d,now,reason){d.hp=0;d.finishedAt=now;d.finishReason=reason}
export function recordInfernoAttacker(b,owner,damage,now){
 if(b.kind==='infernoPro'&&owner?.connected!==false&&!owner?.npc&&owner?.id&&Number.isFinite(damage)&&damage>0)(b.droneAttackers||={})[owner.id]=now;
}
export function advanceInfernoDrones(s,now,eligible){
 for(const b of s.arenaEnemies.filter(x=>x.kind==='infernoPro')){
  b.droneWaves||=[];b.droneAttackers||={};
  for(const [id,at]of Object.entries(b.droneAttackers))if(now-at>INFERNO_DRONES.attackerWindow)delete b.droneAttackers[id];
  if(b.hp<=0)continue;
  for(let remaining=450000;remaining>=50000;remaining-=50000){
   if(b.hp>remaining||b.droneWaves.includes(remaining))continue;b.droneWaves.push(remaining);
   const attackers=s.players.filter(p=>eligible(p,now)&&!p.duelId&&Object.hasOwn(b.droneAttackers,p.id));
   for(const [i,p]of attackers.entries()){
    const angle=i*Math.PI*2/Math.max(1,attackers.length),id=b.id+'-drone-'+remaining+'-'+p.id;
    s.arenaEnemies.push({id,instanceId:b.instanceId+':'+remaining+':'+p.id,kind:'infernoDrone',model:'infernoDrone',npc:true,boss:false,connected:true,parentId:b.id,parentInstance:b.instanceId,targetId:p.id,level:105,pos:[b.pos[0]+Math.cos(angle)*110,b.pos[1]+30,b.pos[2]+Math.sin(angle)*110],hp:25000,maxHp:25000,hitRadius:28,active:true,motionAt:now,contributions:{},rules:{name:'Dron perseguidor',zone:b.rules.zone,corridor:true,reward:0,range:0}});
   }
  }
 }
 for(const d of s.arenaEnemies.filter(x=>x.kind==='infernoDrone'&&x.hp>0)){
  const parent=s.arenaEnemies.find(x=>x.id===d.parentId),target=s.players.find(p=>p.id===d.targetId);
  if(!parent||parent.instanceId!==d.parentInstance||!target||!eligible(target,now)||target.duelId){finish(d,now,'cancelled');continue}
  const dt=Math.max(0,Math.min(.3,(now-(d.motionAt??now))/1000));d.motionAt=now;
  const gap=distance(d.pos,target.pos),step=Math.min(gap,INFERNO_DRONES.speed*dt);
  if(gap<=INFERNO_DRONES.contactRadius+step){
   const damage=Math.min(d.hp,target.hp);target.hp=Math.max(0,target.hp-d.hp);target.lastHit=target.lastIncoming=target.shieldLastHit=now;target.lastDamagedBy=d.id;
   s.events||=[];s.events.push({type:'infernoDroneExplosion',id:d.instanceId,targetId:target.id,pos:[...target.pos],damage,time:now});d.pos=[...target.pos];finish(d,now,'detonated');
  }else if(gap>0)d.pos=d.pos.map((v,i)=>v+(target.pos[i]-v)*step/gap);
 }
}
