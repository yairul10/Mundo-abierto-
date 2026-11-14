const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Decisions only: movement, damage and robot repair remain server-authoritative.
export function createCoopFarmPilot(){
 let retreat=false,targetId=null,huntPoint={x:0,y:120,z:-1700},status='AUTO PRO';
 return {reset(){retreat=false;targetId=null;status='AUTO PRO'},get retreating(){return retreat},get status(){return status},tick(s,now){
  const idle={throttle:0,strafe:0,fire:false,targetId:null};
  if(s.hp<=0)return idle;
  const ratio=s.hp/Math.max(1,s.maxHp);if(ratio<=.3){if(!retreat)huntPoint={...s.position};retreat=true;targetId=null}
  if(retreat&&ratio>=.95){retreat=false;targetId=null}
  if(retreat&&s.safe){status=s.robot?'AUTO · Reparando en zona segura':'AUTO · Esperando reparación manual';return idle}
  let goal,stopAt=650,fire=false;
  if(retreat){goal={x:0,y:120,z:-250};stopAt=80;status='AUTO · Retirada para reparar'}
  else{
   const candidates=s.enemies.filter(e=>e.hp>0&&e.visible!==false);
   let target=candidates.find(e=>e.id===targetId)||candidates.sort((a,b)=>distance(s.position,a.position)-distance(s.position,b.position))[0];
   targetId=target?.id||null;
   if(target){goal=target.position;fire=s.canFight&&distance(s.position,goal)<1100;status='AUTO · Combate evasivo'}
   else{goal=huntPoint.z<-900?huntPoint:{x:0,y:120,z:-1700};stopAt=100;status='AUTO · Buscando enemigos'}
  }
  const dx=goal.x-s.position.x,dy=goal.y-s.position.y,dz=goal.z-s.position.z,d=distance(s.position,goal),yaw=Math.atan2(-dx,-dz),pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-1.15,1.15);
  let strafe=fire?Math.sin(now*.8)*.7:0;
  for(const shot of s.threats||[]){
   const point=shot.target||shot.position;if(!point)continue;
   let nearby=distance(s.position,point)<(shot.radius||0)+280;
   if(!nearby&&shot.velocity){const delta={x:shot.position.x-s.position.x,y:shot.position.y-s.position.y,z:shot.position.z-s.position.z},v=shot.velocity,v2=v.x*v.x+v.y*v.y+v.z*v.z,t=clamp(-(delta.x*v.x+delta.y*v.y+delta.z*v.z)/Math.max(1,v2),0,.7);nearby=Math.hypot(delta.x+v.x*t,delta.y+v.y*t,delta.z+v.z*t)<150}
   if(nearby){const side=Math.cos(yaw)*(point.x-s.position.x)-Math.sin(yaw)*(point.z-s.position.z);strafe=side>=0?-1:1;break}
  }
  return {yaw,pitch,throttle:d>stopAt?clamp((d-stopAt)/160,0,1):fire&&d<450?-.6:0,strafe,fire:fire&&!retreat,targetId:retreat?null:targetId};
 }};
}
