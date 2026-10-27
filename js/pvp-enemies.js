import {createNpcEffects} from './pvp-npc-effects.js?v=339';
import {createCatapultRig} from './catapult-rig.js?v=339';
import {createHarpoonRig} from './harpoon-rig.js?v=339';
import {createGranTitan} from './gran-titan.js?v=326';
import {createNexoRig,NEXO_VISUAL} from './pvp-boss-rig.js?v=259';
import {createColosoRig} from './coloso-rig.js?v=187';
const MODELS={catapult:'./assets/models/catapulta_casco.glb?v=327',harpooner:'./assets/models/arponero_lanzador.glb?v=327',stalker:'./assets/models/acechador_optimizado.glb?v=327',raider:'./assets/models/sci_fi_combat_vessel.glb?v=113',sentinel:'./assets/models/raider_spacecraft.glb?v=112',destroyer:'./assets/models/futuristic_spacecraft.glb?v=105'};
export function createArenaEnemyView({THREE:T,scene,camera,enemies,loader,onSelect,hidden,sound=()=>{},targetPosition=()=>null,makeMissile=null}){
 const entities=new Map(),templates=new Map(),effects=[];
 const npcFx=createNpcEffects(T,scene,camera,{sound,targetPosition,hidden});
 function model(path){if(!templates.has(path))templates.set(path,loader.loadAsync(path).then(g=>g.scene));return templates.get(path).then(s=>s.clone(true))}
 function fit(source,size){const box=new T.Box3().setFromObject(source),span=Math.max(...box.getSize(new T.Vector3()).toArray()),group=new T.Group();source.position.sub(box.getCenter(new T.Vector3()));group.add(source);group.scale.setScalar(size/span);return group}
 function mount(r,data){
  const fallback=new T.Mesh(new T.BoxGeometry(data.kind==='colossusPro'?180:60,50,data.kind==='colossusPro'?580:100),new T.MeshStandardMaterial({color:0x897c49,metalness:.5,roughness:.7}));r.mesh.add(fallback);
  const replace=()=>{r.mesh.remove(fallback);fallback.geometry.dispose();fallback.material.dispose()};
  if(data.kind==='nexo'){
   replace();r.rig=createNexoRig(T,r.mesh,scene);
   model(NEXO_VISUAL.body).then(m=>r.rig.mountBody(m)).catch(()=>{});model(NEXO_VISUAL.arm).then(m=>r.rig.mountArm(m)).catch(()=>{});
  }else if(data.kind==='granTitanPro'){replace();r.rig=createGranTitan(T,r.mesh,{position:new T.Vector3()});r.rig.root.scale.setScalar(.5);model('./assets/models/gran_titan.glb?v=327').then(m=>{if(entities.has(data.id))r.rig.mount(m)}).catch(()=>{});
  }else if(data.kind==='colossusPro'){
   Promise.all([model('./assets/models/coloso.glb?v=187'),model('./assets/models/scifipanelcrate_optimizado.glb?v=159')]).then(([hull,door])=>{if(!entities.has(data.id))return;replace();r.rig=createColosoRig(T,hull,door);r.mesh.add(r.rig.root)}).catch(()=>{});
   const glow=new T.MeshBasicMaterial({color:0xffa52b,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false});r.flames=[];
   for(const x of [-60,60]){const flame=new T.Mesh(new T.ConeGeometry(12,80,12).translate(0,40,0),glow);flame.rotation.x=Math.PI/2;flame.position.set(x,-5,270);r.mesh.add(flame);r.flames.push(flame)}
  }else if(['catapult','harpooner'].includes(data.model)){
   const files=data.model==='catapult'?{hull:'catapulta_casco',stand:'catapulta_soporte',arm:'catapulta_brazo',bomb:'catapulta_bomba'}:{hull:'catapulta_casco',launcher:'arponero_lanzador',spool:'arponero_carrete',spear:'arponero_arpon'};
   Promise.all(Object.entries(files).map(async([k,f])=>[k,await model('./assets/models/'+f+'.glb?v=327')])).then(parts=>{if(!entities.has(data.id))return;replace();r.rig=(data.model==='catapult'?createCatapultRig:createHarpoonRig)(T,Object.fromEntries(parts));r.rig.root.scale.setScalar(2/3);r.mesh.add(r.rig.root)}).catch(()=>{});
  }else model(MODELS[data.model]||MODELS.raider).then(m=>{if(!entities.has(data.id))return;replace();const visual=fit(m,100);if(data.model==='raider')visual.rotation.y=Math.PI; // Asaltante GLB faces +Z; PvP movement faces -Z.
   r.mesh.add(visual)}).catch(()=>{});
 }
 function beam(attack){if(attack.projectile){sound(attack.projectile==='missile'?'missile':'enemyLaser',{x:attack.origin[0],y:attack.origin[1],z:attack.origin[2]});for(const hit of attack.targets||[]){const missile=attack.projectile==='missile',mesh=missile&&makeMissile?makeMissile():new T.Mesh(missile?new T.ConeGeometry(4,20,8):new T.CylinderGeometry(1.5,1.5,40,6),new T.MeshBasicMaterial({color:0xff964b})),goal=new T.Vector3(...hit.targetPos),velocity=goal.clone().sub(new T.Vector3(...attack.origin)).normalize().multiplyScalar(missile?650:1150);mesh.position.set(...attack.origin);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize());scene.add(mesh);effects.push({mesh,time:missile?5:1.05,age:0,missile,projectile:true,goal,targetId:hit.targetId,velocity})}return}sound('enemyLaser',{x:attack.origin[0],y:attack.origin[1],z:attack.origin[2]});for(const hit of attack.targets||[]){const start=new T.Vector3(...attack.origin),end=new T.Vector3(...hit.targetPos),delta=end.clone().sub(start);const mesh=new T.Mesh(new T.CylinderGeometry(2,2,delta.length(),6),new T.MeshBasicMaterial({color:0xff853c,transparent:true,opacity:.85,depthWrite:false}));mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());scene.add(mesh);effects.push({mesh,time:.18})}}
 function sync(list,now,players=[]){
  const present=new Set(list.map(b=>b.id));for(const [id,r]of entities)if(!present.has(id)){npcFx.clearOwner(id);scene.remove(r.mesh);r.label.remove();const i=enemies.indexOf(r);if(i>=0)enemies.splice(i,1);entities.delete(id)}
  for(const b of list){let r=entities.get(b.id);if(!r){
   const mesh=new T.Group(),label=document.createElement('div');label.className='world-nameplate';label.innerHTML='<span></span><small></small><div class="name-health"><i></i></div>';document.body.append(label);scene.add(mesh);mesh.position.set(...b.pos);
   r={pvpRemote:true,playerId:b.id,type:'pilot',mesh,label,goal:new T.Vector3(...b.pos),hp:b.hp,maxHp:b.maxHp,dead:b.hp>0?0:1,pilotName:b.name,pilotLevel:b.level||105,kind:b.kind,model:b.model,pro:['colossusPro','granTitanPro'].includes(b.kind),instance:'',attackSeq:0,teleportSeq:0};entities.set(b.id,r);enemies.push(r);mount(r,b);
   label.setAttribute('role','button');label.tabIndex=0;label.onclick=()=>onSelect(b.id);label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();label.click()}};label.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();label.click()},{passive:false});
  }
  npcFx.sync(r,b,now);
  const fresh=r.instance!==b.instanceId,jump=(b.lastTeleport?.seq||0)>r.teleportSeq;
  if(fresh||jump){r.mesh.position.set(...b.pos);r.instance=b.instanceId;r.attackSeq=b.lastAttack?.seq||0;r.teleportSeq=b.lastTeleport?.seq||0}
  r.goal.set(...b.pos);r.hp=b.hp;r.maxHp=b.maxHp;r.dead=b.hp>0?0:1;r.mesh.visible=b.hp>0;r.active=b.active;r.label.querySelector('span').textContent=b.name;
  r.label.querySelector('small').textContent=Math.ceil(b.hp).toLocaleString()+' / '+b.maxHp.toLocaleString()+' PV'+(b.kind==='reinforcement'?'':' · '+Number(b.reward).toLocaleString()+' créditos');r.label.querySelector('i').style.width=(100*Math.max(0,b.hp)/b.maxHp)+'%';
  if(r.kind==='nexo'){r.rig.assignTargets(b.aimTargets||[]);r.rig.setCharge((b.nextAttackAt-now)/1000)}
  if(b.lastAttack&&!b.lastAttack.special&&b.lastAttack.seq>r.attackSeq){r.attackSeq=b.lastAttack.seq;if(now-b.lastAttack.time<1500){if(r.kind==='nexo')r.rig.fire(b.lastAttack.targets||[b.lastAttack]);else beam(b.lastAttack)}}
 }
 npcFx.syncTethers(players,entities,now);
 }
 function update(dt){for(const r of entities.values()){
  const delta=r.goal.clone().sub(r.mesh.position);if(delta.lengthSq()>.01)r.mesh.rotation.y+=Math.atan2(Math.sin(Math.atan2(-delta.x,-delta.z)-r.mesh.rotation.y),Math.cos(Math.atan2(-delta.x,-delta.z)-r.mesh.rotation.y))*(1-Math.exp(-dt*4));r.mesh.position.lerp(r.goal,1-Math.exp(-dt*12));
  if(r.kind==='granTitanPro'){r.rig.updateEngines(performance.now()/1000,true)}
  if(r.kind==='nexo')r.rig.update(dt,performance.now()/1000);
  if(r.kind==='colossusPro'){for(const p of r.rig?.panels||[])p.hinge.rotation.x+=((r.active?p.openAngle:0)-p.hinge.rotation.x)*(1-Math.exp(-dt*6));for(const flame of r.flames||[])flame.scale.y=.9+Math.sin(performance.now()*.015)*.12}
  const point=r.mesh.position.clone().add(new T.Vector3(0,r.kind==='nexo'?235:r.kind==='colossusPro'?180:75,0)).project(camera),view=r.mesh.position.clone().sub(camera.position).dot(new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion));r.label.hidden=hidden()||!!r.dead||view<=0||point.z>1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1;r.label.style.left=((point.x+1)*50)+'%';r.label.style.top=((1-point.y)*50)+'%';
 }
 npcFx.update(dt,entities);
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time-=dt;if(e.projectile){e.age+=dt;if(e.missile){const goal=targetPosition(e.targetId)||e.goal,desired=goal.clone().sub(e.mesh.position);if(desired.length()<40)e.time=0;else e.velocity.lerp(desired.normalize().multiplyScalar(650),Math.min(1,dt*(e.age<.55?.12:3.7)))}e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),e.velocity.clone().normalize())}else e.mesh.material.opacity=Math.max(0,e.time/.18);if(e.time<=0){scene.remove(e.mesh);if(!e.projectile||!e.missile||!makeMissile){e.mesh.geometry?.dispose();e.mesh.material?.dispose()}effects.splice(i,1)}}}
 return {entities,sync,update};
}
