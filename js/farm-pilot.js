// Decision-only pilot: movement, damage, loot and recovery remain owned by the game.
export const FARM_MAPS={
 aurora:{name:'Aurora',level:1,enemies:{scout:'Explorador',raider:'Asaltante'}},
 belt:{name:'Cinturón Perdido',level:10,enemies:{sentinel:'Guardián',destroyer:'Destructor'}},
 ember:{name:'Ascuas',level:30,enemies:{destroyer:'Destructor',devastator:'Devastador',carrier:'Coloso (jefe)',sentinel:'Guardián (refuerzos)',raider:'Asaltante (refuerzos)'}},
 graveyard:{name:'Cementerio de Naves',level:40,enemies:{catapult:'Catapulta',harpooner:'Arponero',stalker:'Acechador',granTitan:'Gran Titán (jefe)'}}
};
const order=Object.keys(FARM_MAPS),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function farmConfig(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const map=FARM_MAPS[raw.map]?raw.map:'aurora',selections={},priorities={};
 for(const [id,m] of Object.entries(FARM_MAPS))selections[id]=(Array.isArray(raw.selections?.[id])?raw.selections[id]:Object.keys(m.enemies).filter(e=>!['carrier','granTitan'].includes(e))).filter(e=>e in m.enemies);
 for(const [id,m] of Object.entries(FARM_MAPS)){priorities[id]={};for(const type of Object.keys(m.enemies)){const rank=Number(raw.priorities?.[id]?.[type]);priorities[id][type]=Number.isInteger(rank)&&rank>=1&&rank<=5?rank:['carrier','granTitan'].includes(type)?1:2}}
 return {map,selections,priorities,allowCredits:raw.allowCredits===true,recovery:raw.recovery==='current'?'current':'aurora'};
}
export function nextFarmSector(from,to){const a=order.indexOf(from),b=order.indexOf(to);return a<0||b<0||a===b?null:order[a+Math.sign(b-a)]}
export function createFarmPilot(config={}){
 let settings=farmConfig(config),running=false,retreat=false,target=null,decisionAt=-Infinity,patrol=0,status='Control manual';
 const stop=(reason='Control manual')=>{running=false;target=null;status=reason};
 return {
 get running(){return running},get target(){return target},get status(){return status},get config(){return settings},
 configure(value){settings=farmConfig(value);target=null;decisionAt=-Infinity},stop,
 start(level,pvp=false){if(pvp){stop('AUTO no disponible en PvP');return false}if(level<FARM_MAPS[settings.map].level||!settings.selections[settings.map].length){stop('Selecciona enemigos y un mapa desbloqueado');return false}running=true;retreat=false;target=null;decisionAt=-Infinity;status='Buscando';return true},
 tick(s,now){
  const idle={throttle:0,strafe:0,fire:false,ability:false,target:null};
  if(!running)return idle;
  if(s.pvp||!s.active){stop(s.pvp?'AUTO no disponible en PvP':'AUTO detenido · juego inactivo');return idle}
  if(s.paused){status='AUTO en pausa · menú abierto';return idle}
  if(s.dead){
   const current=settings.recovery==='current',affordable=!current||s.gold>=1000,authorized=settings.allowCredits||!current&&s.gold===0;
   status=!affordable?'Esperando 1.000 créditos para recuperar en este mapa':!authorized?'Esperando autorización de créditos':current?'Recuperando en este mapa · 1.000 créditos':'Recuperando en Aurora';
   return {...idle,recover:authorized&&affordable,recoverCurrent:current};
  }
  if(s.hp/s.maxHp<=.3)retreat=true;
  if(retreat&&s.hp/s.maxHp>=.95){retreat=false;target=null;decisionAt=-Infinity}
  if(s.docked){status=retreat&&!s.robot&&(!settings.allowCredits||s.gold<s.repairCost)?'Esperando reparación manual en base':'Reparando en base';return {...idle,launch:!retreat,repair:retreat&&settings.allowCredits&&s.gold>=s.repairCost}}
  if(s.landing)return idle;
  let goal=null,stopAt=40,fire=false,strafe=0;
  if(retreat){target=null;goal=s.base;stopAt=55;status=s.robot?'Retirada · robot reparador':'Retirada a base';if(distance(s.position,goal)<100)return {...idle,land:!s.robot,status,ability:s.abilityReady===true&&!s.safe(s.position)};}
  else if(s.sector!==settings.map){target=null;const next=nextFarmSector(s.sector,settings.map),route=s.routes.find(r=>r.to===next);if(!route||s.level<route.level){stop('Ruta bloqueada por nivel');return idle}goal=route.pos;stopAt=35;status='Viajando por portales';}
  else {
   if(now-decisionAt>=.25||target?.dead||target&&!target.mesh.visible){
    decisionAt=now;const allowed=settings.selections[settings.map];
    const candidates=s.enemies.filter(e=>!e.dead&&e.hp>0&&e.mesh.visible&&!s.safe(e.mesh.position)&&(allowed.includes(e.type)||(e.aggressive&&distance(s.position,e.mesh.position)<450)));
    const rank=e=>allowed.includes(e.type)?settings.priorities[settings.map][e.type]:6;
    const best=candidates.reduce((n,e)=>Math.min(n,rank(e)),Infinity);
    // Keep the current enemy within a rank; preempt it when a higher priority appears.
    if(!candidates.includes(target)||rank(target)>best)target=candidates.filter(e=>rank(e)===best).sort((a,b)=>distance(s.position,a.mesh.position)-distance(s.position,b.mesh.position))[0]||null;
   }
   if(target){goal=target.mesh.position;stopAt=720;fire=distance(s.position,goal)<1050;strafe=fire?Math.sin(now*.6)*.7:0;status='Combate automático';}
   else {patrol=now*.025;goal={x:s.center.x+Math.cos(patrol)*s.radius*.58,y:180,z:s.center.z+Math.sin(patrol)*s.radius*.58};stopAt=120;status='Patrullando';}
  }
  const d=distance(s.position,goal),dx=goal.x-s.position.x,dy=goal.y-s.position.y,dz=goal.z-s.position.z;
  let yaw=Math.atan2(-dx,-dz),pitch=Math.max(-1.15,Math.min(1.15,Math.atan2(dy,Math.hypot(dx,dz)))),throttle=d>stopAt?Math.min(1,(d-stopAt)/140):fire&&d<450?-.6:0;
  // Short look-ahead sphere avoidance; bounded by the existing world population.
  if(throttle>0)for(const o of s.obstacles){const p=o.position,ox=p.x-s.position.x,oy=p.y-s.position.y,oz=p.z-s.position.z,along=(ox*dx+oy*dy+oz*dz)/Math.max(d,1),r=o.radius+65;
   if(along>0&&along<Math.min(d,300)&&ox*ox+oy*oy+oz*oz-along*along<r*r){pitch=Math.min(1.15,pitch+.65);strafe=.8;fire=false;break}}
  for(const shot of s.attacks)if(distance(s.position,shot.mesh.position)<240){strafe=Math.cos(yaw)*(shot.mesh.position.x-s.position.x)-Math.sin(yaw)*(shot.mesh.position.z-s.position.z)>0?-1:1;break}
  return {yaw,pitch,throttle,strafe,fire,ability:(fire||retreat)&&s.abilityReady===true&&!s.safe(s.position),target:fire?target:null};
 }
 };
}
