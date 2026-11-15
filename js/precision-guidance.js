// Modest laser assistance: no target acquisition and at most eight degrees per shot.
export const PRECISION_GUIDANCE=Object.freeze({cone:20*Math.PI/180,turnRate:60*Math.PI/180,maxTurn:8*Math.PI/180,range:1200});
export function guidePrecisionLaser(shot,target,dt){
 if(!shot.guidance||!target||!Number.isFinite(dt)||dt<=0)return false;
 const speed=Math.hypot(...shot.vel),delta=target.map((v,i)=>v-shot.pos[i]),distance=Math.hypot(...delta);
 if(!speed||distance<1||distance>PRECISION_GUIDANCE.range)return false;
 const current=shot.vel.map(v=>v/speed),desired=delta.map(v=>v/distance),dot=Math.max(-1,Math.min(1,current.reduce((sum,v,i)=>sum+v*desired[i],0))),angle=Math.acos(dot);
 if(angle>PRECISION_GUIDANCE.cone||angle<1e-8)return false;
 const turn=Math.min(angle,PRECISION_GUIDANCE.turnRate*dt,Math.max(0,PRECISION_GUIDANCE.maxTurn-(shot.guidedTurn||0)));
 if(turn<=0)return false;
 const tangent=desired.map((v,i)=>v-current[i]*dot),length=Math.hypot(...tangent);
 if(length<1e-8)return false;
 shot.vel=current.map((v,i)=>(v*Math.cos(turn)+tangent[i]/length*Math.sin(turn))*speed);
 shot.guidedTurn=(shot.guidedTurn||0)+turn;return true;
}
