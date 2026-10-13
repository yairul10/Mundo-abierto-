export function advancedEnemyScale(level,baseLevel){return Math.min(2.5,1+Math.max(0,Math.floor(Number(level)||1)-baseLevel)*.02)}
export function scaledHealth(hp,oldMax,newMax){return Math.max(0,Math.min(newMax,(Number(hp)||0)/Math.max(1,Number(oldMax)||newMax)*newMax))}
// Native fallbacks and optional uploaded models work in the offline bundle.
export const GRAVEYARD={x:37000,z:-650,radius:4500,warning:900,damagePerSecond:8};
export function segmentDistance(a,b,p){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const n=dx*dx+dy*dy+dz*dz;
 const t=n?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/n)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t);
}
// Stable one-to-one squads survive resets and rejoin after respawning.
export function linkScrapPairs(enemies){
 const launchers=enemies.filter(e=>e.type==='catapult'),harpoons=enemies.filter(e=>e.type==='harpooner');
 for(let i=0;i<Math.min(launchers.length,harpoons.length);i++){launchers[i].partner=harpoons[i];harpoons[i].partner=launchers[i]}
}
export function placeScrapPairs(enemies){
 for(const e of enemies){if(e.type!=='harpooner'||!e.partner)continue;
  e.home.copy(e.partner.home).addScaledVector({x:1,y:0,z:0},150);e.mesh.position.copy(e.home);
 }
}
export function rejoinScrapPair(enemy){
 if(enemy.partner&&!enemy.partner.dead&&enemy.partner.mesh.visible){
  enemy.home.copy(enemy.partner.mesh.position).addScaledVector({x:1,y:0,z:0},enemy.type==='harpooner'?150:-150);enemy.mesh.position.copy(enemy.home);
 }
}
export function createGraveyard(THREE,scene){
 const metal=[0x505b69,0x815942,0x373b49].map(color=>new THREE.MeshStandardMaterial({color,roughness:.88,metalness:.35}));
 const lamp=new THREE.MeshBasicMaterial({color:0x57dbff});
 const box=new THREE.BoxGeometry(1,1,1);
 function piece(group,size,pos,index=0){const m=new THREE.Mesh(box,metal[index]);m.scale.set(...size);m.position.set(...pos);group.add(m);return m}
 const environment=new THREE.Group();environment.position.set(GRAVEYARD.x,0,GRAVEYARD.z);scene.add(environment);
 const wreckFallbacks=[];
 // Two exposed halves, with ribs and mismatched repair plates.
 for(const side of [-1,1]){
  const wreck=new THREE.Group();wreck.position.set(1900,260,side*600-1500);wreck.rotation.z=side*.12;
  piece(wreck,[430,90,720],[0,0,0]);
  for(let i=0;i<7;i++){piece(wreck,[470,22,24],[0,80,-320+i*100],i%3);piece(wreck,[22,170,24],[-210,35,-320+i*100]);piece(wreck,[22,170,24],[210,35,-320+i*100])}
  piece(wreck,[120,120,230],[0,100,side*240],1);environment.add(wreck);wreckFallbacks.push(wreck);
 }
 let seed=81;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<65;i++){
  const a=rand()*Math.PI*2,r=1100+rand()*3000;
  const m=piece(environment,[20+rand()*120,8+rand()*35,30+rand()*180],[Math.cos(a)*r,(rand()-.5)*1600,Math.sin(a)*r],i%3);m.rotation.set(rand()*3,rand()*3,rand()*3);
 }
 const station=new THREE.Group();station.position.copy(environment.position);scene.add(station);
 const stationFallback=new THREE.Group();station.add(stationFallback);
 piece(stationFallback,[400,80,190],[0,-40,0]);piece(stationFallback,[120,150,110],[0,45,0],1);
 const pads=[];
 for(const x of [-270,270]){
  const pad=new THREE.Group();pad.position.set(x,0,0);piece(pad,[320,20,320],[0,0,0]);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(135,3,6,32),lamp);ring.rotation.x=Math.PI/2;ring.position.y=12;pad.add(ring);
  pad.userData.landingRadius=140;station.add(pad);pads.push(pad);piece(stationFallback,[140,20,35],[x*.55,-10,0],1);
 }
 function mounted(source,span,top=false){
  source.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const factor=span/Math.max(size.x,size.z);
  if(!Number.isFinite(factor)||factor<=0)throw new Error('Modelo de Recuperación sin dimensiones válidas');
  const model=source.clone(true);model.scale.multiplyScalar(factor);
  model.position.multiplyScalar(factor).addScaledVector(new THREE.Vector3(center.x,top?bounds.max.y:0,center.z),-factor);
  const materials=new Map();
  model.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const finish=source=>{
    if(!source?.isMeshStandardMaterial)return source;
    if(materials.has(source))return materials.get(source);
    const material=source.clone();materials.set(source,material);
    material.metalness=.4;material.roughness=.78;material.metalnessMap=null;material.roughnessMap=null;
    if(material.map){material.emissiveMap=material.map;material.emissive.set(0xffffff);material.emissiveIntensity=.12}
    return material;
   };
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(finish):finish(mesh.material);
  });
  const group=new THREE.Group();group.add(model);return {group,size,center,factor};
 }
 function mountStation(hullSource,padSource){
  if(station.userData.recoveryModel)return;
  const hull=mounted(hullSource,700);
  // Uploaded hull: long axis Z; side arms end at local Y ~1.94, Z ~0.
  hull.group.position.y=-1.94*hull.factor;
  const x=hull.size.x*hull.factor/2+165-3,z=-hull.center.z*hull.factor;
  const platformModels=pads.map(()=>mounted(padSource,330,true).group);
  // Finish every clone before replacing the visible fallback or landing targets.
  station.add(hull.group);stationFallback.visible=false;
  pads.forEach((pad,i)=>{
   for(const child of [...pad.children])pad.remove(child);
   pad.add(platformModels[i]);pad.position.set(i===0?-x:x,0,z);
   pad.userData.landingRadius=140;
   const rim=new THREE.Mesh(new THREE.TorusGeometry(130,2,6,48),lamp);rim.rotation.x=Math.PI/2;rim.position.y=2;pad.add(rim);
  });
  station.userData.recoveryModel=hull.group;station.updateMatrixWorld(true);
  const target=new THREE.Object3D();target.position.y=-30;station.add(target);
  for(const [color,intensity,x,y,z]of [[0xd8eaff,1.6,400,650,300],[0x91b6d5,.8,-350,-250,-300]]){
   const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);light.target=target;station.add(light);
  }
 }
 function mountRings(source){
  if(environment.userData.ringDebris)return;
  const template=mounted(source,1).group,rings=new THREE.Group();
  // Fixed placements keep the base approach and the portal corridor unobstructed.
  const placements=[[-1600,420,-900,430,.65,.25],[-2300,-350,650,320,1.3,-.4],[950,650,-2650,480,.3,.65],[2450,-500,900,350,2.4,-.3],[-800,-650,2800,420,.9,.45],[2900,350,-1600,300,1.7,.2],[-2800,700,-1800,370,.4,-.6],[1300,-250,2700,280,2.7,.5]];
  for(const [x,y,z,span,yaw,tilt]of placements){const ring=template.clone(true);ring.scale.setScalar(span);ring.position.set(x,y,z);ring.rotation.set(tilt,yaw,tilt*.5);rings.add(ring)}
  environment.add(rings);environment.userData.ringDebris=rings;
 }
 function mountWreckShips(sources){
  if(environment.userData.wreckShips)return;
  if(sources.length!==2||sources.some(s=>!s))throw new Error('Faltan modelos');
  const placements=[[1100,260,-1500,-.03,1300],[2950,260,-1500,.03,1100]];
  const groups=sources.map((source,i)=>{
   source.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(source);
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   const longest=Math.max(size.x,size.y,size.z);
   if(!Number.isFinite(longest)||longest<=0)throw new Error('Dimensiones GLB inválidas');
   const [x,y,z,angle,span]=placements[i],model=source.clone(true),group=new THREE.Group(),factor=span/longest;
   model.scale.multiplyScalar(factor);model.position.copy(center).multiplyScalar(-factor);
   group.add(model);group.position.set(x,y,z);group.rotation.y=i===0?Math.PI:0;group.rotation.z=angle;return group;
  });
  groups.forEach(group=>environment.add(group));
  wreckFallbacks.forEach(wreck=>wreck.visible=false);
  environment.userData.wreckShips=groups;
 }
 function enemyVisual(kind){
  const group=new THREE.Group();piece(group,[55,24,100],[0,0,0]);
  piece(group,[35,12,75],[-39,0,12],1);piece(group,[25,20,60],[35,0,22],2);
  for(const x of [-28,28]){const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(9,12,22,8),metal[2]);nozzle.rotation.x=Math.PI/2;nozzle.position.set(x,-3,-48);group.add(nozzle)}
  let arm;
  if(kind==='catapult'){
   for(const x of [-20,20])piece(group,[8,40,45],[x,25,0],1);
   arm=new THREE.Group();arm.position.set(0,35,0);piece(arm,[10,10,90],[0,0,15],1);piece(arm,[28,8,28],[0,6,55],2);group.add(arm);
  }else{
   piece(group,[20,18,90],[0,28,28],1);piece(group,[34,6,8],[0,30,65],2);
   const spool=new THREE.Mesh(new THREE.CylinderGeometry(18,18,28,10),metal[2]);spool.rotation.z=Math.PI/2;spool.position.set(-25,20,-12);group.add(spool);
  }
  group.userData.catapultArm=arm;return group;
 }
 const backgroundCanvas=document.createElement('canvas');backgroundCanvas.width=1024;backgroundCanvas.height=512;
 const ctx=backgroundCanvas.getContext('2d');let background=null;
 if(ctx){ctx.fillStyle='#030717';ctx.fillRect(0,0,1024,512);
  for(const [x,y,color]of [[250,260,'#302254'],[780,180,'#142b54']]){const g=ctx.createRadialGradient(x,y,0,x,y,340);g.addColorStop(0,color);g.addColorStop(1,'#03071700');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512)}
  for(let i=0;i<1000;i++){ctx.fillStyle=i%4?'#abc3dc':'#ffffff';ctx.fillRect(rand()*1024,rand()*512,1,1)}
  background=new THREE.CanvasTexture(backgroundCanvas);background.mapping=THREE.EquirectangularReflectionMapping;background.colorSpace=THREE.SRGBColorSpace;
 }
 return {environment,station,pads,background,enemyVisual,mountStation,mountRings,mountWreckShips};
}
export function createScrapCombat(THREE,scene,{position,canHit,damage,notify}){
 const pending=[],projectiles=[],effects=[];let tether=null,immune=0;const rigs=new Set();
 const metal=new THREE.MeshStandardMaterial({color:0x7d6757,roughness:.9});
 const rockGeo=new THREE.IcosahedronGeometry(16,0),harpoonGeo=new THREE.ConeGeometry(7,35,6);
 const cableMaterial=new THREE.LineBasicMaterial({color:0xc8b6a0});
 function remove(object){scene.remove(object);const gs=new Set(),ms=new Set();object.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m)});for(const g of gs)g.dispose();for(const m of ms)m.dispose()}
 function release(){if(tether){tether.enemy.mesh.userData.harpoonRig?.retrieve();remove(tether.line);tether=null;immune=5}}
 function createImpactMarker(target){
 const marker=new THREE.Group(),geo=new THREE.TorusGeometry(180,.65,4,64),mat=new THREE.MeshBasicMaterial({color:0xff8733,transparent:true,opacity:.22,depthWrite:false});
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(geo,mat);if(i===0)ring.rotation.x=Math.PI/2;if(i===2)ring.rotation.y=Math.PI/2;marker.add(ring)}
 const dot=new THREE.Mesh(new THREE.SphereGeometry(5,8,6),new THREE.MeshBasicMaterial({color:0xffa13b,transparent:true,opacity:.8,depthWrite:false}));marker.add(dot);marker.position.copy(target);marker.userData={mat,dot,inside:false};scene.add(marker);return marker;
 }
 function updateImpactMarker(marker,remaining){
 const data=marker.userData,inside=position().distanceTo(marker.position)<180,t=Math.max(0,2.9-remaining),pulse=.5+.5*Math.sin(2*Math.PI*(.65*t+.75*t*t));
 data.mat.opacity=(inside?.025:.12)+pulse*(inside?.035:.16);data.dot.material.opacity=.5+pulse*.4;
 if(inside&&!data.inside)notify('⚠️ Zona de impacto · Sal del área');data.inside=inside;
 }
 function fire(enemy){
  if(enemy.type==='catapult'&&(pending.some(p=>p.enemy===enemy)||projectiles.some(p=>p.enemy===enemy&&p.bomb)))return;
  if(enemy.type==='catapult'){
   const rig=enemy.mesh.userData.catapultRig;if(rig){rigs.add(rig);rig.setCharge(0)}
   const target=position().clone();const marker=createImpactMarker(target);
   pending.push({enemy,target,marker,time:1.4});notify('⚠️ Catapulta cargando · Aléjate del área naranja');
  }else{
   const rig=enemy.mesh.userData.harpoonRig;if(rig)rigs.add(rig);
   const start=rig?rig.launch():enemy.mesh.position.clone(),dir=position().clone().sub(start).normalize();
   const mesh=rig?rig.projectile():new THREE.Mesh(harpoonGeo,metal);mesh.position.copy(start);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,rig?0:1,rig?1:0),dir);scene.add(mesh);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([rig?rig.cableOrigin():start,start]),cableMaterial.clone());scene.add(line);
   projectiles.push({enemy,mesh,line,velocity:dir.multiplyScalar(650),life:2.2});
  }
 }
 function update(dt){
  immune=Math.max(0,immune-dt);for(const rig of rigs)rig.update(dt);
  if(tether){if(tether.enemy.dead||!tether.enemy.mesh.visible||!canHit())release();else{const elapsed=Math.min(dt,tether.time);damage(50,elapsed);tether.time-=elapsed;if(tether.time<=1e-9)release();else tether.line.geometry.setFromPoints([tether.enemy.mesh.userData.harpoonRig?.cableOrigin()||tether.enemy.mesh.position,position()])}}
  for(let i=pending.length-1;i>=0;i--){const p=pending[i];p.time-=dt;updateImpactMarker(p.marker,p.time+1.5);
   const rig=p.enemy.mesh.userData.catapultRig;if(rig){rigs.add(rig);rig.setCharge(Math.min(1,(1.4-p.time)/1.4))}
   const arm=p.enemy.mesh.userData.catapultArm;if(arm)arm.rotation.x=-Math.min(1.1,(1.4-p.time)*.8);
   if(p.enemy.dead||!p.enemy.mesh.visible||!canHit()){remove(p.marker);rig?.reset();if(arm)arm.rotation.x=0;pending.splice(i,1);continue}
   if(p.time>0)continue;
   if(arm)arm.rotation.x=.6;
   const mesh=rig?rig.projectile():new THREE.Mesh(rockGeo,metal);mesh.position.copy(rig?rig.release():p.enemy.mesh.position);scene.add(mesh);
   projectiles.push({enemy:p.enemy,mesh,marker:p.marker,start:mesh.position.clone(),target:p.target,age:0,duration:1.5,bomb:true});pending.splice(i,1);
  }
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i],previous=p.mesh.position.clone();let done=false;
   if(p.bomb){p.age+=dt;updateImpactMarker(p.marker,p.duration-p.age);const t=Math.min(1,p.age/p.duration);p.mesh.position.lerpVectors(p.start,p.target,t);p.mesh.position.y+=Math.sin(t*Math.PI)*180;p.mesh.rotation.x+=dt*4;
    if(t>=1){if(canHit()&&position().distanceTo(p.target)<180)damage(300);
     const burst=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),new THREE.MeshBasicMaterial({color:0xffa13b,transparent:true,opacity:.7,depthWrite:false}));burst.position.copy(p.target);scene.add(burst);effects.push({mesh:burst,time:.55});done=true}
   }else{p.mesh.position.addScaledVector(p.velocity,dt);p.life-=dt;p.line.geometry.setFromPoints([p.enemy.mesh.userData.harpoonRig?.cableOrigin()||p.enemy.mesh.position,p.mesh.position]);
    if(canHit()&&segmentDistance(previous,p.mesh.position,position())<45){if(!tether&&immune<=0&&!p.enemy.dead&&p.enemy.mesh.visible){tether={enemy:p.enemy,line:p.line,time:3};p.line=null;notify('⚓ Arpón enganchado · Inmovilizado 3 s · Puedes disparar');const partner=p.enemy.partner;if(partner&&!partner.dead&&partner.mesh.visible){fire(partner);partner.fireTimer=6}}done=true}
    if(p.life<=0||p.enemy.dead||!p.enemy.mesh.visible)done=true;
   }
   if(done){if(!p.bomb&&p.line)p.enemy.mesh.userData.harpoonRig?.retrieve();scene.remove(p.mesh);if(p.line)remove(p.line);if(p.marker)remove(p.marker);projectiles.splice(i,1)}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time-=dt;e.mesh.scale.setScalar(180*(1-e.time/.55));e.mesh.material.opacity=Math.max(0,e.time);if(e.time<=0){remove(e.mesh);effects.splice(i,1)}}
 }
 function clear(){release();immune=0;for(const rig of rigs)rig.reset();rigs.clear();for(const p of pending){remove(p.marker);p.enemy.mesh.userData.catapultRig?.reset();const arm=p.enemy.mesh.userData.catapultArm;if(arm)arm.rotation.x=0}pending.length=0;
 for(const p of projectiles){scene.remove(p.mesh);if(p.line)remove(p.line);if(p.marker)remove(p.marker)}projectiles.length=0;for(const e of effects)remove(e.mesh);effects.length=0;
 }

 return {fire,update,clear,blocked:()=>!!tether&&tether.time>0&&!tether.enemy.dead&&tether.enemy.mesh.visible&&canHit()};
}

