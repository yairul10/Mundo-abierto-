import {applyShieldDamage} from './shield-system.mjs';
import {defenseDamage} from './combat.mjs';
// Enemy flame footprint and visual use the same two nozzle origins and widening cones.
export const INFERNO=Object.freeze({range:900,nozzleX:46,nozzleY:-5,nozzleZ:85,mouthRadius:28,spread:.40,charge:1,fire:3,fade:.5,cooldown:3.5,damage:300});
export function inInfernoFlames(point,radius=0,c=INFERNO){
 const z=point.z-c.nozzleZ;
 if(z < -radius || z > c.range+radius)return false;
 const width=c.mouthRadius+Math.max(0,Math.min(c.range,z))*c.spread+radius;
 return [-1,1].some(side=>Math.hypot(point.x-side*c.nozzleX,point.y-c.nozzleY)<=width);
}
// Integrate flame intensity, including the linear fade, across phase boundaries.
export function infernoPower(state,c=INFERNO){return state.phase==='fire'?1:state.phase==='fade'?Math.max(0,1-state.elapsed/c.fade):0}
export function advanceInferno(state,dt,c=INFERNO){
 let firing=0,remaining=Math.max(0,dt);
 while(remaining>0){
  const duration=c[state.phase],step=Math.min(remaining,duration-state.elapsed);
  if(state.phase==='fire')firing+=step;
  if(state.phase==='fade')firing+=step*(1-(state.elapsed+step/2)/c.fade);
  state.elapsed+=step;remaining-=step;
  if(state.elapsed>=duration-1e-9){state.phase=state.phase==='charge'?'fire':state.phase==='fire'?'fade':state.phase==='fade'?'cooldown':'charge';state.elapsed=0}
 }
 return firing;
}

export const PRO_INFERNO=Object.freeze({...INFERNO,nozzleX:92,nozzleY:-10,nozzleZ:170,mouthRadius:56});
export function tickInferno(s,b,now,eligible){
 const candidates=s.players.filter(p=>eligible(p,now)&&Math.hypot(...p.pos.map((v,i)=>v-b.pos[i]))<1500);
 if(!b.active||b.hp<=0||!candidates.length){b.inferno=null;b.infernoTickAt=now;return}
 candidates.sort((a,c)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]))-Math.hypot(...c.pos.map((v,i)=>v-b.pos[i])));
 const state=b.inferno||={phase:'charge',elapsed:0,direction:[0,0,1],time:now};
 if(state.phase!=='fire'&&state.phase!=='fade'){const delta=candidates[0].pos.map((v,i)=>v-b.pos[i]),length=Math.hypot(...delta)||1;state.direction=delta.map(v=>v/length)}
 const dt=Math.max(0,Math.min(.3,(now-(b.infernoTickAt??now))/1000));b.infernoTickAt=now;
 const firing=advanceInferno(state,dt);state.time=now;
 if(!firing)return;
 const forward=state.direction,horizontal=Math.hypot(forward[0],forward[2]),right=horizontal>1e-6?[forward[2]/horizontal,0,-forward[0]/horizontal]:[1,0,0],up=[forward[1]*right[2],forward[2]*right[0]-forward[0]*right[2],-forward[1]*right[0]];
 for(const p of candidates){const delta=p.pos.map((v,i)=>v-b.pos[i]),dot=v=>delta.reduce((n,x,i)=>n+x*v[i],0);
  if(!inInfernoFlames({x:dot(right),y:dot(up),z:dot(forward)},30,PRO_INFERNO))continue;
  applyShieldDamage(p,defenseDamage(p,b.rules.damage,now)*firing,now);p.lastHit=p.lastIncoming=now;p.lastDamagedBy=b.id;
 }
}
