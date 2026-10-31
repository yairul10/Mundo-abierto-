import {createTitanEffects,TITAN_BLAST_DURATION,titanBombTangent} from './titan-effects.js?v=352';
// Presentation only: impact, damage, paralysis and expiry are server decisions.
export function createNpcEffects(T,scene,camera,{sound,targetPosition,hidden}){
 const fx=createTitanEffects(T,()=>6),shots=[],blasts=[],warnings=new Map(),tethers=new Map();let clock=0;
 function line(color){const l=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));scene.add(l);return l}
 const points=(l,a,b)=>l.geometry.setFromPoints([a,b]);
 function clearOwner(id){for(let i=shots.length-1;i>=0;i--)if(shots[i].owner===id){dispose(shots[i]);shots.splice(i,1)}const w=warnings.get(id);if(w){fx.dispose(w.mesh);warnings.delete(id)}}
 function dispose(p){fx.dispose(p.mesh);if(p.marker)fx.dispose(p.marker);if(p.cable)fx.dispose(p.cable)}
 function attack(r,a,now){
  if(now-a.time>5500)return;
  sound(a.projectile==='sniper'?'sniperShot':a.projectile==='bomb'?'bombLaunch':'harpoon',r.mesh.position);
  if(r.model==='catapult')r.rig?.release();if(r.model==='harpooner')r.rig?.launch();
  for(const shot of a.shots||[]){
   const bomb=a.projectile==='bomb',mesh=bomb?fx.bomb():a.projectile==='sniper'?new T.Mesh(new T.CylinderGeometry(5,5,65,8),new T.MeshBasicMaterial({color:0xff1838})):fx.spear();scene.add(mesh);
   const p={id:shot.id,owner:r.playerId,mesh,kind:a.projectile,start:new T.Vector3(...shot.origin),target:new T.Vector3(...shot.targetPos),born:a.time,expires:bomb?shot.detonateAt:a.time+shot.life*1000,radius:shot.radius||150,arc:shot.arc||0,velocity:shot.velocity?new T.Vector3(...shot.velocity):null};
   if(bomb){p.marker=fx.marker();p.marker.position.copy(p.target);p.marker.scale.setScalar(p.radius/150);scene.add(p.marker)}
   if(a.projectile==='harpoon')p.cable=line(0xc8b6a0);
   shots.push(p);
  }
 }
 function sync(r,b,now){
  clock=now;
  if(r.instance!==b.instanceId){clearOwner(b.id);r.seenPatterns=new Set()}
  r.seenPatterns||=new Set();r.patternCharge=b.charge;r.patternData=b;
  if(b.hp<=0){clearOwner(b.id);return}
  for(const a of b.patternEvents||[]){const key=b.instanceId+':'+a.seq;if(r.seenPatterns.has(key))continue;r.seenPatterns.add(key);attack(r,a,now)}
  for(const impact of b.patternImpacts||[])for(let i=shots.length-1;i>=0;i--)if(shots[i].id===impact.id){dispose(shots[i]);shots.splice(i,1)}
  if(r.seenPatterns.size>32){const keep=(b.patternEvents||[]).map(a=>b.instanceId+':'+a.seq);r.seenPatterns=new Set(keep)}
  let w=warnings.get(b.id);const charge=b.charge;
  if(!charge||!['sniper','bomb'].includes(charge.kind)){if(w){fx.dispose(w.mesh);warnings.delete(b.id)}return}
  if(!w||w.started!==charge.start){if(w)fx.dispose(w.mesh);const mesh=charge.kind==='sniper'?line(0xff243a):fx.marker();if(charge.kind==='bomb')scene.add(mesh);w={mesh,started:charge.start,kind:charge.kind};warnings.set(b.id,w);sound(charge.kind==='sniper'?'sniperCharge':'bombLaunch',r.mesh.position)}
  const target=charge.targets?.[0];if(!target)return;w.origin=r.mesh;w.target=new T.Vector3(...target.targetPos);
  if(w.kind==='sniper')points(w.mesh,r.mesh.position,w.target);else{w.mesh.position.copy(w.target);w.mesh.scale.setScalar(b.model==='catapult'?1.2:1)}
 }
 function syncTethers(players,entities,now){
  const live=new Set();for(const p of players||[]){if(!p.npcTether||p.paralyzedUntil<=now)continue;const owner=entities.get(p.npcTether.owner),target=targetPosition(p.id);if(!owner||!target||owner.dead)continue;live.add(p.id);let cable=tethers.get(p.id);if(!cable){cable=line(0xc8b6a0);tethers.set(p.id,cable)}points(cable,owner.mesh.position,target)}
  for(const [id,cable]of tethers)if(!live.has(id)){fx.dispose(cable);tethers.delete(id)}
 }
 function update(dt,entities){clock+=dt*1000;
  for(const [id,w]of warnings){const r=entities.get(id);if(!r||r.dead||!r.patternCharge||clock>r.patternCharge.fireAt+300){fx.dispose(w.mesh);warnings.delete(id);continue}w.mesh.visible=!hidden();if(w.kind==='sniper')points(w.mesh,r.mesh.position,w.target);else fx.animateMarker(w.mesh,(clock-w.started)/1000,camera)}
  for(const r of entities.values()){
   const c=r.patternCharge;if(r.kind==='granTitanPro'){const last=r.patternData?.patternEvents?.at(-1),age=last?(clock-last.time)/1000:10,open=c?Math.min(1,(clock-c.start)/1500):age<1.5?1:Math.max(0,1-(age-1.5)/1.5);r.rig?.pose(open,c?.kind||last?.projectile||'spear')}
   if(r.model==='catapult'){if(c)r.rig?.setCharge(Math.min(1,(clock-c.start)/1400));r.rig?.update(dt)}
   if(r.model==='harpooner')r.rig?.update(dt);
  }
  for(let i=shots.length-1;i>=0;i--){const p=shots[i],age=(clock-p.born)/1000,r=entities.get(p.owner),bomb=p.kind==='bomb';
   if(!r||r.dead||clock>=p.expires){if(bomb&&r&&!r.dead&&clock-p.expires<500){const mesh=fx.blast(p.target);mesh.scale.setScalar(p.radius/150);scene.add(mesh);blasts.push({mesh,age:0});sound('heavyBlast',p.target)}dispose(p);shots.splice(i,1);continue}
   p.mesh.visible=!hidden();
   if(bomb){const progress=Math.max(0,Math.min(1,(clock-p.born)/(p.expires-p.born)));p.mesh.position.lerpVectors(p.start,p.target,progress);p.mesh.position.y+=Math.sin(progress*Math.PI)*p.arc;const tangent=titanBombTangent(p.start,p.target,p.arc,progress);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...tangent).normalize());fx.animateProjectile(p.mesh,age,true);p.marker.visible=!hidden();fx.animateMarker(p.marker,progress*3.5,camera)}
   else{p.mesh.position.copy(p.start).addScaledVector(p.velocity,age);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.velocity.clone().normalize());if(p.kind!=='sniper')fx.animateProjectile(p.mesh,age);if(p.cable){p.cable.visible=!hidden();points(p.cable,r.mesh.position,p.mesh.position)}}
  }
  for(let i=blasts.length-1;i>=0;i--){const b=blasts[i];b.age+=dt;if(b.age>=TITAN_BLAST_DURATION){fx.dispose(b.mesh);blasts.splice(i,1)}else{b.mesh.visible=!hidden();fx.animateBlast(b.mesh,b.age,camera)}}
  for(const cable of tethers.values())cable.visible=!hidden();
 }
 return {sync,syncTethers,update,clearOwner};
}
