import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const THREE=window.THREE;if(!THREE)throw new Error('Three.js no disponible');
const $=id=>document.getElementById(id), canvas=$('world');
const CLASSES={acorazada:{name:'Acorazada',hp:150,energy:70,attack:14,defense:12,speed:205},energia:{name:'Energía',hp:85,energy:160,attack:18,defense:4,speed:215},interceptora:{name:'Interceptora',hp:105,energy:110,attack:16,defense:7,speed:235},soporte:{name:'Soporte',hp:115,energy:145,attack:9,defense:8,speed:215}};
const DEFAULT={name:'Nave Aurora',classId:null,level:1,x:0,y:0,z:0,hp:100,maxHp:100,energy:100,maxEnergy:100,attack:10,defense:5,gold:0,xp:0,speed:220,quests:{}};
let stored={};try{stored=JSON.parse(localStorage.getItem('mundoAbierto.player')||'{}')||{}}catch{}let player={...DEFAULT,...stored};player.x=Number.isFinite(+player.x)?+player.x:0;player.y=Number.isFinite(+player.y)?+player.y:0;player.z=Number.isFinite(+player.z)?+player.z:0;player.quests=player.quests||{};
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x020611);scene.fog=new THREE.FogExp2(0x020611,.00032);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,1,9000);
scene.add(new THREE.HemisphereLight(0x7bbcff,0x050713,1.8));const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-600,900,-400);scene.add(sun);
const starsGeo=new THREE.BufferGeometry(),sp=[];for(let i=0;i<1600;i++)sp.push((Math.random()-.5)*8000,(Math.random()-.5)*4500,(Math.random()-.5)*8000);starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xbad9ff,size:3,sizeAttenuation:true})));
function mat(color,emissive=0){return new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.32,emissive,emissiveIntensity:1.4})}
function ship(color=0x65c7ff,kind='player'){const g=new THREE.Group();g.frustumCulled=false;
const isPlayer=kind==='player',hull=mat(isPlayer?0xe8e9e7:color),dark=mat(0x111a27),trim=mat(isPlayer?0x333b47:0x9bc9e8),red=mat(0xc92e32),glass=new THREE.MeshPhysicalMaterial({color:0x071a2b,metalness:.55,roughness:.08,transmission:.12,emissive:0x063f68,emissiveIntensity:1.15});
const wedge=(points,material,y=0)=>{const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);shape.closePath();const m=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:6,bevelEnabled:true,bevelSize:1.2,bevelThickness:1.2,bevelSegments:1}),material);m.rotation.x=Math.PI/2;m.position.y=y;g.add(m);return m};
// Silueta baja y afilada inspirada en el caza de referencia.
wedge([[-18,-70],[18,-70],[27,18],[18,47],[-18,47],[-27,18]],hull,-3);
wedge([[-9,-77],[9,-77],[13,-38],[-13,-38]],dark,-1);
for(const side of[-1,1]){wedge([[side*12,-38],[side*70,2],[side*61,34],[side*24,24]],hull,-5);wedge([[side*27,-13],[side*65,7],[side*57,19],[side*33,13]],red,2);
const pod=new THREE.Mesh(new THREE.CylinderGeometry(11,13,49,14),dark);pod.rotation.x=Math.PI/2;pod.position.set(side*38,-1,20);g.add(pod);
const collar=new THREE.Mesh(new THREE.TorusGeometry(10.7,2.3,8,18),trim);collar.rotation.x=Math.PI/2;collar.position.set(side*38,-1,43);g.add(collar);
const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(8.5,11,10,16),trim);nozzle.rotation.x=Math.PI/2;nozzle.position.set(side*38,-1,48);g.add(nozzle);
const fin=wedge([[side*31,19],[side*48,39],[side*43,11],[side*32,4]],hull,1);fin.rotation.z=side*.06;
const finTip=wedge([[side*43,32],[side*48,39],[side*46,27]],red,2);finTip.rotation.z=side*.06;
const intake=new THREE.Mesh(new THREE.BoxGeometry(16,8,17),dark);intake.position.set(side*36,3,-5);g.add(intake);
const blue=new THREE.Mesh(new THREE.BoxGeometry(12,2.5,4),new THREE.MeshBasicMaterial({color:0x29b8ff}));blue.position.set(side*36,7,-13);g.add(blue)}
const cockpit=new THREE.Mesh(new THREE.SphereGeometry(15,18,10),glass);cockpit.scale.set(.68,.42,1.55);cockpit.position.set(0,10,-27);g.add(cockpit);
const cockpitFrame=new THREE.Mesh(new THREE.TorusGeometry(10.5,1.25,6,20,.92*Math.PI),trim);cockpitFrame.rotation.set(Math.PI/2,0,Math.PI/2);cockpitFrame.position.set(0,11,-23);g.add(cockpitFrame);
for(const z of[-51,-8,24]){const panel=new THREE.Mesh(new THREE.BoxGeometry(22,1.4,3),z===-51?red:trim);panel.position.set(0,5,z);g.add(panel)}
if(kind==='scout'){g.scale.set(.7,.7,.82)}
if(kind==='raider'){const blade=new THREE.Mesh(new THREE.BoxGeometry(105,4,14),dark);blade.position.z=8;g.add(blade);g.scale.set(.82,.82,.92)}
if(kind==='sentinel'){const armor=new THREE.Mesh(new THREE.BoxGeometry(62,18,42),dark);armor.position.z=12;g.add(armor);g.scale.set(1.05,1.05,1.12)}
if(kind==='player'){for(const side of[-1,1]){const nav=new THREE.Mesh(new THREE.SphereGeometry(2.6,8,6),new THREE.MeshBasicMaterial({color:side<0?0xff3b3b:0x49ff83}));nav.position.set(side*62,1,19);g.add(nav);const navLight=new THREE.PointLight(side<0?0xff3333:0x44ff88,5,45,2);navLight.position.copy(nav.position);g.add(navLight)}}return g}
// El grupo raíz conserva toda la física y el guardado. El modelo visual puede
// cambiar sin alterar posición, rotación, disparos ni controles.
const playerMesh=new THREE.Group(),proceduralShip=ship();proceduralShip.scale.setScalar(.78);playerMesh.add(proceduralShip);scene.add(playerMesh);
function auroraMaterial(mesh){
 const pos=mesh.geometry.getAttribute('position');if(!pos)return;
 if(!mesh.geometry.getAttribute('normal'))mesh.geometry.computeVertexNormals();
 // Meshy entrega Aurora como una sola malla. Pintamos zonas amplias y contrastadas
 // en coordenadas locales para que el esquema se lea bien incluso en pantalla móvil.
 const colors=new Float32Array(pos.count*3),c=new THREE.Color();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),side=Math.abs(z);
  const upper=y>-.035;
  c.setRGB(.93,.95,.97); // blanco frío del casco
  // Mecánica inferior, raíces de ala y góndolas: grafito casi negro.
  if(y<-.075||(side>.54&&y<.045)||(x>.55&&side>.30))c.setRGB(.035,.045,.065);
  // Cabina: una zona central superior azul-negra, larga y claramente visible.
  if(upper&&side<.20&&x<.38&&x>-.58)c.setRGB(.008,.035,.065);
  // Franjas rojas anchas y simétricas sobre alas y hombros.
  const wingStripe=upper&&side>.34&&side<.78&&x>-.58&&x<.48;
  const shoulderStripe=upper&&side>.20&&side<.39&&x>-.42&&x<.12;
  const noseStripe=upper&&side<.12&&x<-.52;
  const tipRed=side>.78&&upper;
  if(wingStripe||shoulderStripe||noseStripe||tipRed)c.setRGB(.82,.035,.045);
  // Recupera panel blanco en el centro para que el rojo no domine todo el fuselaje.
  if(upper&&side<.075&&x>-.45&&x<.52)c.setRGB(.96,.97,.98);
  colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
 }
 mesh.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 mesh.material=new THREE.MeshStandardMaterial({
  vertexColors:true,metalness:.58,roughness:.24,
  envMapIntensity:.65
 });
 mesh.material.needsUpdate=true;
 mesh.castShadow=false;mesh.receiveShadow=false;
}
const modelLoader=new GLTFLoader();
function fitPlayerModel(model,yaw=0){
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 model.position.sub(center);model.scale.multiplyScalar(124/Math.max(size.x,size.z));model.rotation.y=yaw;
 return model;
}
function mountPlayerModel(model,key){playerMesh.add(model);proceduralShip.visible=false;playerMesh.userData[key]=model}
function loadAuroraFallback(){
 modelLoader.load('./assets/models/aurora_s1.glb?v=1',gltf=>{
  const model=gltf.scene;model.traverse(o=>{if(o.isMesh)auroraMaterial(o)});
  mountPlayerModel(fitPlayerModel(model,-Math.PI/2),'auroraModel');
 },undefined,err=>console.warn('Los modelos GLB no cargaron; se usa la nave procedural.',err));
}
modelLoader.load('./assets/models/x_wing_starfighter.glb?v=2',gltf=>{
 const model=gltf.scene,maxAnisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){for(const mapName of['map','normalMap','metalnessMap','roughnessMap'])if(material?.[mapName])material[mapName].anisotropy=maxAnisotropy}});
 // El modelo mira hacia +Z; el juego avanza hacia -Z.
 mountPlayerModel(fitPlayerModel(model,Math.PI),'xWingModel');
},undefined,err=>{console.warn('X-Wing no disponible; cargando Aurora-S1.',err);loadAuroraFallback()});
// El X-Wing tiene dos turbinas visibles: situar los efectos en ellas, no en los
// cuatro soportes del motor del modelo anterior. Sin discos blancos opacos.
const engineLights=[],engineTrails=[];
for(const x of [-19,19]){
 const y=-2,z=39;
 const l=new THREE.PointLight(0x27aaff,10,105,2);
 l.position.set(x,y,z+5);playerMesh.add(l);engineLights.push(l);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(4.1,24),new THREE.MeshBasicMaterial({color:0x4bbfff,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
 glow.position.set(x,y,z+1);playerMesh.add(glow);
 const trail=new THREE.Mesh(new THREE.ConeGeometry(3.1,40,12,1,true),new THREE.MeshBasicMaterial({color:0x168dff,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
 trail.rotation.x=Math.PI/2;trail.position.set(x,y,z+23);playerMesh.add(trail);engineTrails.push(trail);
}
const planet=new THREE.Mesh(new THREE.SphereGeometry(650,32,20),new THREE.MeshStandardMaterial({color:0x183b67,roughness:.85,emissive:0x06162b,emissiveIntensity:.6}));planet.position.set(2600,900,-3000);scene.add(planet);const moon=new THREE.Mesh(new THREE.SphereGeometry(180,20,12),mat(0x5d6270));moon.position.set(1700,500,-2400);scene.add(moon);
function station(){const g=new THREE.Group(),metal=mat(0x33465c),glow=mat(0x123d68,0x168cff);for(const r of[190,290,390,480,575]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,14,12,64),metal);ring.rotation.x=Math.PI/2;g.add(ring)}const hub=new THREE.Mesh(new THREE.CylinderGeometry(105,135,260,16),metal);g.add(hub);for(let i=0;i<8;i++){const a=i*Math.PI/4,t=new THREE.Mesh(new THREE.BoxGeometry(24,100+Math.random()*90,24),glow);t.position.set(Math.cos(a)*185,100,Math.sin(a)*185);g.add(t)}for(let i=0;i<4;i++){const arm=new THREE.Mesh(new THREE.BoxGeometry(620,16,32),metal);arm.rotation.y=i*Math.PI/2;g.add(arm)}const dock=new THREE.Mesh(new THREE.BoxGeometry(820,22,110),metal);dock.position.set(430,-35,0);g.add(dock);for(const side of[-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(720,5,8),glow);rail.position.set(430,-22,side*42);g.add(rail)}for(let i=0;i<12;i++){const a=i*Math.PI/6,windowLight=new THREE.Mesh(new THREE.BoxGeometry(16,8,5),new THREE.MeshBasicMaterial({color:0x55d7ff}));windowLight.position.set(Math.cos(a)*300,35,Math.sin(a)*300);windowLight.rotation.y=-a;g.add(windowLight)}const crown=new THREE.Mesh(new THREE.CylinderGeometry(38,75,220,10),glow);crown.position.y=210;g.add(crown);const beacon=new THREE.PointLight(0x27aaff,180,1200,2);beacon.position.set(0,100,0);g.add(beacon);g.position.set(0,0,-650);g.scale.setScalar(1.25);return g}const auroraStation=station();scene.add(auroraStation);
// La plataforma de aterrizaje y sus luces permanecen en las mismas coordenadas
// para no alterar el piloto automático ni el acceso al hangar.
modelLoader.load('./assets/models/estacion_aurora.glb?v=1',gltf=>{
 const model=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<.001)return;
 // Sustituir la estación provisional completa, incluida su pista artificial.
 // Conservar solo la baliza de iluminación para no perder visibilidad nocturna.
 const children=[...auroraStation.children];
 for(let i=0;i<children.length;i++)if(i!==34)auroraStation.remove(children[i]);
 const scale=690/longest;
 model.scale.setScalar(scale);
 model.position.copy(center).multiplyScalar(-scale);
 auroraStation.add(model);
 // Plataforma lateral plana integrada en el GLB, identificada en su geometría.
 // Coordenadas originales del modelo antes del escalado y centrado.
 const padLocal=new THREE.Vector3(-26,0.35,8.5);
 const padStation=padLocal.clone().sub(center).multiplyScalar(scale);
 const padWorld=auroraStation.localToWorld(padStation);
 LANDING_TRIGGER.copy(padWorld);
 LANDING_APPROACH.copy(padWorld).add(new THREE.Vector3(0,185,0));
 LANDING_TOUCHDOWN.copy(padWorld).add(new THREE.Vector3(0,52,0));
 landingArmed=true;
},undefined,()=>console.info('Estación Aurora GLB pendiente: se conserva la estación original.'));
const asteroidMat=mat(0x4c505a);for(let i=0;i<85;i++){const a=new THREE.Mesh(new THREE.IcosahedronGeometry(10+Math.random()*30,1),asteroidMat);a.scale.set(1+Math.random(),.7+Math.random(),.8+Math.random());a.position.set(500+Math.random()*3300,(Math.random()-.5)*1100,-2100+Math.random()*3600);a.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);scene.add(a)}
const TYPES={scout:{hp:35,damage:5,speed:120,xp:18,color:0xe65757},raider:{hp:55,damage:8,speed:150,xp:28,color:0xe78b45},sentinel:{hp:90,damage:12,speed:90,xp:45,color:0xb86bd9}};
const enemyDefs=[['scout',1150,-180],['scout',1400,260],['scout',1650,-420],['raider',1900,420],['raider',2300,-280],['sentinel',2850,350],['sentinel',3300,-450]];
const enemies=enemyDefs.map((d,i)=>{const t=TYPES[d[0]],m=ship(t.color,d[0]);scene.add(m);return{type:d[0],mesh:m,home:new THREE.Vector3(d[1],(i%3-1)*70,d[2]),hp:t.hp,maxHp:t.hp,dead:0,angle:i}});enemies.forEach(e=>e.mesh.position.copy(e.home));
// Apariencia 3D opcional de los enemigos básicos (scout). El grupo original
// mantiene posición, IA, colisiones, disparos y recompensas intactos.
// Si aún no se ha subido el GLB, las naves originales siguen funcionando.
modelLoader.load('./assets/models/futuristic_spacecraft.glb?v=1',gltf=>{
 const original=gltf.scene;
 original.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 // Ajustar escala con la caja del modelo antes de girarlo hacia el frente -Z.
 const box=new THREE.Box3().setFromObject(original);
 const size=box.getSize(new THREE.Vector3());
 const center=box.getCenter(new THREE.Vector3());
 const maxSpan=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(maxSpan)||maxSpan<.001)return;
 for(const e of enemies){
  if(e.type!=='scout')continue;
  const visual=original.clone(true);
  visual.position.copy(center).multiplyScalar(-1);
  visual.scale.setScalar(85/maxSpan);
  const pivot=new THREE.Group();
  pivot.rotation.y=0; // El GLB ya apunta en el sentido correcto; evitar giro de 180 grados.
  pivot.add(visual);
  e.mesh.add(pivot);
  for(const child of e.mesh.children)if(child!==pivot)child.visible=false;
 }
},undefined,err=>console.warn('Modelo scout GLB no disponible; se conserva la nave básica original.',err));
// Dos drones de apoyo: acompañan al jugador y disparan proyectiles reales.
const supportDrones=[];
player.droneCount=Math.max(0,Math.min(2,Math.floor(Number(player.droneCount)||0)));
function ownedDrones(){return player.droneCount}
for(const side of[-1,1]){
 const drone=new THREE.Group();
 const shell=new THREE.Mesh(new THREE.OctahedronGeometry(11,0),new THREE.MeshStandardMaterial({color:0x748da7,metalness:.65,roughness:.3,emissive:0x102d4c}));
 shell.scale.set(1.4,.55,1.7);drone.add(shell);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(4,8,6),new THREE.MeshBasicMaterial({color:0x3be7ff}));eye.position.z=-14;drone.add(eye);
 for(const wing of[-1,1]){const fin=new THREE.Mesh(new THREE.BoxGeometry(13,2,17),new THREE.MeshStandardMaterial({color:0x243c59,metalness:.6,roughness:.3}));fin.position.x=wing*16;drone.add(fin)}
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(3,4,18,8),new THREE.MeshStandardMaterial({color:0x365c86,metalness:.75,roughness:.3,emissive:0x063f72}));muzzle.rotation.x=Math.PI/2;muzzle.position.z=-18;drone.add(muzzle);
 scene.add(drone);supportDrones.push({mesh:drone,side,cooldown:side===-1?.3:.8});
}
// Sustituye la geometría provisional cuando esté disponible el GLB de Sloyd.
// Conserva el cañón lógico, la formación, los disparos y las compras existentes.
modelLoader.load('./assets/models/sci_fi_fighter_spacecraft.glb?v=1',gltf=>{
 const source=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(source);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<.001)return;
 for(const d of supportDrones){
  const pivot=new THREE.Group();
  const visual=source.clone(true);
  visual.scale.setScalar(47/longest);
  visual.position.copy(center).multiplyScalar(-47/longest);
  pivot.add(visual);
  d.mesh.add(pivot);
  for(const part of d.mesh.children)if(part!==pivot)part.visible=false;
 }
},undefined,()=>console.info('Modelo de dron pendiente: se usa el diseño provisional.'));
function updateSupportDrones(dt,now){
 const active=!docked&&!landing&&!panel.classList.contains('hidden');
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const target=lockedEnemy&&!lockedEnemy.dead?lockedEnemy:nearest();
 for(let i=0;i<supportDrones.length;i++){
  const d=supportDrones[i];d.mesh.visible=i<ownedDrones();if(!d.mesh.visible)continue;
  const desired=playerMesh.position.clone().addScaledVector(right,d.side*102).addScaledVector(forward,-27);
  desired.y+=14+Math.sin(now*.002+d.side)*4;
  d.mesh.position.lerp(desired,Math.min(1,dt*6));d.mesh.rotation.y=yaw;
  d.cooldown-=dt;
  if(!active||!target||target.dead||d.cooldown>0||target.mesh.position.distanceTo(d.mesh.position)>720)continue;
  if(inSafeZone(d.mesh.position))continue;
  const start=d.mesh.position.clone().addScaledVector(forward,26);
  const direction=target.mesh.position.clone().sub(start).normalize();
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,42,8),new THREE.MeshBasicMaterial({color:0x49d8ff,transparent:true,opacity:.95}));
  bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);bolt.position.copy(start);scene.add(bolt);
  shots.push({mesh:bolt,vel:direction.multiplyScalar(950),life:1,damage:Math.max(1,player.attack*.17)});
  d.cooldown=1.1;
 }
}
const shots=[];function nearest(){let b=null,d=650;for(const e of enemies){if(e.dead)continue;const x=e.mesh.position.distanceTo(playerMesh.position);if(x<d){d=x;b=e}}return b}
let fireCd=0,skillCd=0;
// Apuntado asistido: sólo objetivos vivos dentro del cono central de la pantalla.
let lockedEnemy=null;
const lockFrame=$('targetLock');
function updateTargetLock(){
 camera.updateMatrixWorld();
 let candidate=null,best=Infinity,screen=null;
 const forwardView=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 for(const e of enemies){
  if(e.dead||!e.mesh.visible)continue;
  const to=e.mesh.position.clone().sub(camera.position),distance=to.length();
  if(distance>1550||distance<40||to.dot(forwardView)<=0)continue;
  const p=e.mesh.position.clone().project(camera);
  if(p.z<-1||p.z>1||Math.abs(p.x)>.34||Math.abs(p.y)>.30)continue;
  const score=p.x*p.x+p.y*p.y+distance/18000;
  if(score<best){best=score;candidate=e;screen=p}
 }
 lockedEnemy=candidate;
 if(candidate&&screen&&!document.body.classList.contains('inventory-open')){
  lockFrame.classList.remove('hidden');
  lockFrame.style.left=((screen.x+1)*50)+'%';
  lockFrame.style.top=((1-screen.y)*50)+'%';
 }else lockFrame.classList.add('hidden');
}
function fire(mult=1,count=1){
 if(fireCd>0)return;
 updateTargetLock();
 const cameraDir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
 const aimPoint=lockedEnemy?lockedEnemy.mesh.position.clone():camera.position.clone().addScaledVector(cameraDir,1600);
 const noseDir=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 // Un par de láseres por pulsación, saliendo de lados opuestos de la nave.
 for(let i=0;i<2;i++){
  const start=playerMesh.position.clone().addScaledVector(noseDir,58).addScaledVector(right,i===0?-26:26);
  const destination=aimPoint.clone();
  if(lockedEnemy){
   // Pequeña dispersión: asistencia, pero no impactos garantizados.
   const spread=13;
   destination.x+=(Math.random()-.5)*spread*2;
   destination.y+=(Math.random()-.5)*spread*2;
   destination.z+=(Math.random()-.5)*spread*2;
  }
  const dir=destination.sub(start).normalize();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,48,7),new THREE.MeshBasicMaterial({color:0x65edff,transparent:true,opacity:.95,depthWrite:false}));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  mesh.position.copy(start);scene.add(mesh);
  shots.push({mesh,vel:dir.multiplyScalar(1150),life:1.65,damage:player.attack*mult*.5});
 }
 fireCd=.28;
}
function xpNeed(){return 100+(player.level-1)*65}function gainXp(n){player.xp+=n;while(player.xp>=xpNeed()){player.xp-=xpNeed();player.level++;player.maxHp+=10;player.maxEnergy+=5;player.attack+=2;player.defense++;player.hp=player.maxHp;player.energy=player.maxEnergy;$('levelToast').innerHTML='⭐ NIVEL '+player.level+'<small>Sistemas de la nave mejorados</small>';$('levelToast').classList.remove('hidden');setTimeout(()=>$('levelToast').classList.add('hidden'),2200)}}
// Botín físico: queda flotando tras destruir un enemigo y se recoge al acercarse.
const LOOT_TYPES=[
 {id:'chatarra',name:'Chatarra espacial',color:0x9ca8b5,rarity:'Común',description:'Restos recuperados de naves y drones. Material básico de fabricación.'},
 {id:'aleacion',name:'Aleación reforzada',color:0x55c6ff,rarity:'Poco común',description:'Metal resistente para reforzar casco y estructuras.'},
 {id:'nucleo',name:'Núcleo de energía',color:0xc783ff,rarity:'Raro',description:'Fuente de energía concentrada para sistemas avanzados.'},
 {id:'reliquia',name:'Componente ancestral',color:0xffca58,rarity:'Épico',description:'Tecnología antigua de origen desconocido y gran valor.'}
];
player.loot=player.loot&&typeof player.loot==='object'?player.loot:{};
// Mejoras permanentes: bonificaciones guardadas por separado de la clase.
const UPGRADES=[
 {id:'casco',name:'Blindaje del casco',icon:'🛠',stat:'maxHp',amount:15,material:'chatarra',base:2,credits:20},
 {id:'escudo',name:'Escudo reforzado',icon:'🛡',stat:'defense',amount:2,material:'aleacion',base:1,credits:35},
 {id:'armas',name:'Armas mejoradas',icon:'⚡',stat:'attack',amount:2,material:'aleacion',base:1,credits:35},
 {id:'motor',name:'Propulsión avanzada',icon:'🚀',stat:'speed',amount:12,material:'nucleo',base:1,credits:60}
];
player.upgrades=player.upgrades&&typeof player.upgrades==='object'?player.upgrades:{};
function upgradeLevel(id){return Math.max(0,Math.min(10,Math.floor(Number(player.upgrades[id])||0)))}
function upgradeBonus(stat){return UPGRADES.filter(u=>u.stat===stat).reduce((n,u)=>n+upgradeLevel(u.id)*u.amount,0)}
function renderDrones(){
 const el=$('droneShop');if(!el)return;
 const count=ownedDrones(),price=count===0?100:200;
 el.innerHTML='<div class="upgrade-card"><div><strong>🤖 Drones de combate · '+count+'/2</strong><small>Cada dron dispara su propio láser automático contra enemigos cercanos.</small><small>'+(count>=2?'Dos drones equipados':'Siguiente dron: '+price+' créditos')+'</small></div><button id="buyDroneBtn" '+(count>=2||player.gold<price?'disabled':'')+'>'+(count>=2?'Máximo':'Comprar')+'</button></div>';
 const button=$('buyDroneBtn');button.onclick=()=>{
  const owned=ownedDrones(),cost=owned===0?100:200;
  if(owned>=2||player.gold<cost)return;
  player.gold-=cost;player.droneCount=owned+1;save();hud();renderDrones();
  lootToast('🤖 Dron '+player.droneCount+' adquirido y equipado');
 };
}
function renderUpgrades(){
 const el=$('upgradeList');if(!el)return;
 el.innerHTML=UPGRADES.map(u=>{
  const lv=upgradeLevel(u.id),max=lv>=10,need=u.base+lv,price=u.credits*(lv+1);
  const available=(Number(player.loot[u.material])||0)>=need&&player.gold>=price;
  const resource=LOOT_TYPES.find(t=>t.id===u.material);
  return '<div class="upgrade-card"><div><strong>'+u.icon+' '+u.name+'</strong><small>Nivel '+lv+'/10 · +'+u.amount+' '+({maxHp:'casco',defense:'escudo',attack:'potencia',speed:'velocidad'}[u.stat])+' por nivel</small><small>'+ (max?'Mejora máxima':'Costo: '+need+' '+resource.name+' + '+price+' créditos')+'</small></div><button data-upgrade="'+u.id+'" '+(max||!available?'disabled':'')+'>'+(max?'Máximo':'Mejorar')+'</button></div>';
 }).join('');
 el.querySelectorAll('button[data-upgrade]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgrade));
}
function buyUpgrade(id){
 const u=UPGRADES.find(v=>v.id===id);if(!u)return;
 const lv=upgradeLevel(id),need=u.base+lv,price=u.credits*(lv+1);
 if(lv>=10||(Number(player.loot[u.material])||0)<need||player.gold<price)return;
 player.loot[u.material]-=need;player.gold-=price;player.upgrades[id]=lv+1;
 player[u.stat]+=u.amount;
 if(u.stat==='maxHp')player.hp=Math.min(player.maxHp,player.hp+u.amount);
 save();hud();renderUpgrades();renderInventory();
}
function renderInventory(){
 $('lootInventory').innerHTML=LOOT_TYPES.map(t=>'<div class="inventory-item"><span class="inventory-gem" style="background:#'+t.color.toString(16).padStart(6,'0')+'"></span><div><strong>'+t.name+'</strong><small>'+t.rarity+' · '+t.description+'</small></div><b>×'+(Math.max(0,Number(player.loot[t.id])||0))+'</b></div>').join('');
}
const drops=[];const dropGeo=new THREE.OctahedronGeometry(16,0);
function spawnLoot(e){
 const roll=Math.random(),item=LOOT_TYPES[roll<.53?0:roll<.81?1:roll<.96?2:3];
 const mesh=new THREE.Mesh(dropGeo,new THREE.MeshBasicMaterial({color:item.color,depthTest:false}));mesh.renderOrder=5;
 mesh.position.copy(e.mesh.position);mesh.position.y+=14;scene.add(mesh);
 const halo=new THREE.PointLight(item.color,7,150,2);mesh.add(halo);
 const marker=new THREE.Sprite(new THREE.SpriteMaterial({color:item.color,transparent:true,opacity:.55,depthTest:false}));marker.scale.set(52,52,1);mesh.add(marker);drops.push({mesh,item,age:0,baseY:mesh.position.y});
}
function lootToast(message){
 const el=$('lootToast');if(!el)return;
 el.textContent=message;el.classList.remove('hidden');
 clearTimeout(lootToast.timer);lootToast.timer=setTimeout(()=>el.classList.add('hidden'),2200);
}
function updateLoot(dt){
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.age+=dt;d.mesh.rotation.y+=dt*1.5;d.mesh.rotation.z+=dt*.65;
  d.mesh.position.y=d.baseY+Math.sin(d.age*2.7)*8;
  if(d.mesh.position.distanceTo(playerMesh.position)<90){
   player.loot[d.item.id]=(player.loot[d.item.id]||0)+1;
   lootToast('✦ '+d.item.name+' · '+d.item.rarity);
   scene.remove(d.mesh);d.mesh.material.dispose();drops.splice(i,1);save();
  }else if(d.age>90){scene.remove(d.mesh);d.mesh.material.dispose();drops.splice(i,1)}
 }
}
function kill(e){const t=TYPES[e.type];e.dead=performance.now()/1000+8;e.mesh.visible=false;player.gold+=5;spawnLoot(e);gainXp(t.xp);save()}
function skill(){if(skillCd>0||!player.classId)return;const id=player.classId;if(id==='soporte'&&player.energy>=30){player.energy-=30;player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*.35));skillCd=8}else if(id==='interceptora'&&player.energy>=30){player.energy-=30;fire(1.2,3);skillCd=5}else if(id==='acorazada'&&player.energy>=25){player.energy-=25;fire(2.4);skillCd=5}else if(id==='energia'&&player.energy>=35){player.energy-=35;for(const e of enemies)if(!e.dead&&e.mesh.position.distanceTo(playerMesh.position)<250){e.hp-=player.attack*1.8;if(e.hp<=0)kill(e)}skillCd=7}}
// Estación centrada en (0,0,-650), con radio de protección independiente del minimapa.
const SAFE_ZONE_CENTER=new THREE.Vector3(0,0,-650),SAFE_ZONE_RADIUS=760;
function inSafeZone(position){return position.distanceTo(SAFE_ZONE_CENTER)<SAFE_ZONE_RADIUS}
let lastZoneLabel='';
function updateZone(){
 const safe=inSafeZone(playerMesh.position);
 const label=safe?'ESTACIÓN AURORA|Zona segura':'SECTOR AURORA|Espacio abierto';
 if(label!==lastZoneLabel){
  const [title,subtitle]=label.split('|'),el=$('targetInfo');
  el.replaceChildren(document.createTextNode(title),document.createElement('br'));
  const small=document.createElement('small');small.textContent=subtitle;el.appendChild(small);
  el.classList.toggle('outside-zone',!safe);lastZoneLabel=label;
 }
 return safe;
}
// Radar 2D orientado según la nave. Coordenadas X/Z del mundo 3D.
const radar=$('miniRadar'),radarCtx=radar.getContext('2d'),radarDistance=$('stationDistance');
const RADAR_RANGE=1100,RADAR_SIZE=156,RADAR_CENTER=78,RADAR_RADIUS=66;
let radarElapsed=0;
function radarPoint(wx,wz){
 const dx=wx-playerMesh.position.x,dz=wz-playerMesh.position.z;
 const a=yaw,c=Math.cos(a),s=Math.sin(a);
 // Frente de la nave siempre arriba del radar.
 const rx=(dx*c+dz*(-s))*RADAR_RADIUS/RADAR_RANGE;
 const ry=(dx*s+dz*c)*RADAR_RADIUS/RADAR_RANGE;
 return {x:RADAR_CENTER+rx,y:RADAR_CENTER+ry,inside:rx*rx+ry*ry<RADAR_RADIUS*RADAR_RADIUS,angle:Math.atan2(ry,rx)};
}
function drawRadar(dt){
 radarElapsed+=dt;if(radarElapsed<.13)return;radarElapsed=0;
 const ctx=radarCtx;ctx.clearRect(0,0,RADAR_SIZE,RADAR_SIZE);
 ctx.fillStyle='#071829ed';ctx.beginPath();ctx.arc(78,78,72,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(78,78,66,0,Math.PI*2);ctx.clip();
 ctx.strokeStyle='#72bbdd33';ctx.lineWidth=1;
 for(const rad of [22,44,66]){ctx.beginPath();ctx.arc(78,78,rad,0,Math.PI*2);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(78,12);ctx.lineTo(78,144);ctx.moveTo(12,78);ctx.lineTo(144,78);ctx.stroke();
 const dot=(x,y,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()};
 for(const e of enemies){if(e.dead||!e.mesh.visible)continue;const p=radarPoint(e.mesh.position.x,e.mesh.position.z);if(p.inside)dot(p.x,p.y,'#ff6a6a',3)}
 for(const d of drops){const p=radarPoint(d.mesh.position.x,d.mesh.position.z);if(p.inside)dot(p.x,p.y,'#e8b5ff',2.8)}
 const station=radarPoint(SAFE_ZONE_CENTER.x,SAFE_ZONE_CENTER.z);
 if(station.inside)dot(station.x,station.y,'#56e5ff',5);
 ctx.restore();
 // La estación permanece señalada en el borde aunque quede fuera del alcance.
 if(!station.inside){const a=station.angle;const x=78+Math.cos(a)*62,y=78+Math.sin(a)*62;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle='#56e5ff';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore()}
 ctx.fillStyle='#fff7a1';ctx.beginPath();ctx.moveTo(78,68);ctx.lineTo(71,87);ctx.lineTo(78,83);ctx.lineTo(85,87);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#5bb9e4aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(78,78,72,0,Math.PI*2);ctx.stroke();
 const distance=Math.hypot(playerMesh.position.x-SAFE_ZONE_CENTER.x,playerMesh.position.z-SAFE_ZONE_CENTER.z);
 radarDistance.textContent='Aurora · '+Math.round(distance)+' m';
}
// Paso 14: atraque asistido y hangar sin cambiar de escena ni perder progreso.
const dockBtn=$('dockBtn'),hangar=$('hangarPanel'),hangarStats=$('hangarStats');
let docked=false,landing=false,landingTime=0,landingStart=null,landingYaw=0,landingPitch=0,landingArmed=true;
const LANDING_TRIGGER=new THREE.Vector3(540,0,-650);
const LANDING_RADIUS=780; // Alcance de atraque desde el centro de la estación
const LANDING_APPROACH=new THREE.Vector3(535,175,-650);
const LANDING_TOUCHDOWN=new THREE.Vector3(535,24,-650);
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t)};
function hangarRefresh(){
 const missing=Math.max(0,Math.ceil(player.maxHp-player.hp)),cost=Math.ceil(missing*.3);
 hangarStats.textContent='Casco: '+Math.ceil(player.hp)+' / '+player.maxHp+' · Energía: '+Math.ceil(player.energy)+' / '+player.maxEnergy+' · Créditos: '+player.gold;
 $('repairBtn').textContent=missing?'Reparar casco · '+cost+' créditos':'Casco en perfecto estado';
 $('repairBtn').disabled=!missing||player.gold<cost;
 $('hangarMessage').textContent=missing&&player.gold<cost?'Necesitas '+cost+' créditos para reparar.':'';
}
function resetDockControls(){
 joy.throttle=0;joy.strafe=0;$('stick').style.transform='';
 for(const key of Object.keys(keys))keys[key]=0;
}
function finishLanding(){
 landing=false;docked=true;
 playerMesh.position.copy(LANDING_TOUCHDOWN);pitch=0;yaw=0;
 resetDockControls();dockBtn.classList.add('hidden');
 document.body.classList.remove('landing');document.body.classList.add('docked');
 player.energy=player.maxEnergy;hangar.classList.remove('hidden');
 hangarRefresh();save();
}
function selectLandingPlatform(){
 // La estación GLB se carga de forma asíncrona. Buscar una superficie plana
 // directamente bajo la nave en vez de depender de coordenadas del modelo.
 const ray=new THREE.Raycaster(new THREE.Vector3(playerMesh.position.x,playerMesh.position.y+65,playerMesh.position.z),new THREE.Vector3(0,-1,0),0,1300);
 auroraStation.updateMatrixWorld(true);
 const hits=ray.intersectObjects(auroraStation.children,true);
 const hit=hits.find(h=>{
  if(!h.face)return false;
  const normal=h.face.normal.clone().transformDirection(h.object.matrixWorld);
  return normal.y>.72&&h.point.y<=playerMesh.position.y+65&&h.point.distanceTo(playerMesh.position)<450;
 });
 if(hit){
  LANDING_TRIGGER.copy(hit.point);
  LANDING_TOUCHDOWN.copy(hit.point).add(new THREE.Vector3(0,37,0));
  LANDING_APPROACH.copy(hit.point).add(new THREE.Vector3(0,165,0));
 }
}
function beginLanding(){
 if(docked||landing||!panel.classList.contains('hidden'))return;
 selectLandingPlatform();
 landing=true;landingTime=0;landingStart=playerMesh.position.clone();landingYaw=yaw;landingPitch=pitch;
 resetDockControls();document.body.classList.add('landing');
 dockBtn.classList.remove('hidden');dockBtn.disabled=true;dockBtn.textContent='🛬 Piloto automático · Aproximación';
}
dockBtn.onclick=()=>{
 if(dockBtn.disabled||dockBtn.classList.contains('hidden'))return;
 const distance=Math.hypot(playerMesh.position.x-auroraStation.position.x,playerMesh.position.z-auroraStation.position.z);
 if(distance<LANDING_RADIUS)beginLanding();
};
function advanceLanding(dt){
 if(!landing)return;
 landingTime+=dt;
 // Aproximación horizontal elevada, seguida de descenso vertical y toma de contacto.
 if(landingTime<3.4){
  const t=smooth(landingTime/3.4);
  playerMesh.position.lerpVectors(landingStart,LANDING_APPROACH,t);
  yaw=landingYaw+(0-landingYaw)*t;pitch=landingPitch*(1-t);
  dockBtn.textContent='🛬 Aproximación automática';
 }else if(landingTime<7.6){
  const t=smooth((landingTime-3.4)/4.2);
  playerMesh.position.lerpVectors(LANDING_APPROACH,LANDING_TOUCHDOWN,t);
  yaw=0;pitch=0;dockBtn.textContent='🛬 Descendiendo · '+Math.round(t*100)+'%';
 }else finishLanding();
}
function leaveHangar(){
 if(!docked)return;
 docked=false;landingArmed=false;
 hangar.classList.add('hidden');document.body.classList.remove('docked');
 // Salida fuera del pasillo de descenso, con altura suficiente sobre la plataforma.
 playerMesh.position.copy(LANDING_APPROACH).add(new THREE.Vector3(0,50,220));yaw=0;pitch=0;
 resetDockControls();save();
}
$('launchBtn').onclick=leaveHangar;
$('repairBtn').onclick=()=>{
 if(!docked)return;
 const cost=Math.ceil(Math.max(0,player.maxHp-player.hp)*.3);
 if(!cost||player.gold<cost)return;
 player.gold-=cost;player.hp=player.maxHp;hangarRefresh();save();hud();
};
function updateDock(){
 if(docked)return;
 if(landing){dockBtn.classList.remove('hidden');return}
 const distance=Math.hypot(playerMesh.position.x-auroraStation.position.x,playerMesh.position.z-auroraStation.position.z);
 if(distance>LANDING_RADIUS+110)landingArmed=true;
 // Activación sólo cerca de la plataforma, no en toda la zona segura.
 const inCorridor=distance<LANDING_RADIUS;
 const available=inCorridor&&panel.classList.contains('hidden');
 dockBtn.classList.toggle('hidden',!available);
 dockBtn.disabled=!available;
 if(available)dockBtn.textContent='🛬 Aterrizar en Estación Aurora';
}
const keys={},joy={throttle:0};let yaw=player.yaw||0,pitch=player.pitch||0;
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.code==='Space'){e.preventDefault();if(!document.body.classList.contains('inventory-open')&&!docked&&!landing)fire()}if(e.key.toLowerCase()==='q'&&!document.body.classList.contains('inventory-open')&&!docked&&!landing)skill()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const joyEl=$('joystick'),stick=$('stick');joy.strafe=0;
function throttleMove(e){if(!panel.classList.contains('hidden')||docked||landing)return;const r=joyEl.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);joy.throttle=THREE.MathUtils.clamp(-dy/(r.height*.38),-1,1);joy.strafe=THREE.MathUtils.clamp(dx/(r.width*.38),-1,1);stick.style.transform='translate('+joy.strafe*38+'px,'+(-joy.throttle*38)+'px)'}
joyEl.onpointerdown=e=>{joyEl.setPointerCapture(e.pointerId);throttleMove(e)};joyEl.onpointermove=e=>joyEl.hasPointerCapture(e.pointerId)&&throttleMove(e);joyEl.onpointerup=joyEl.onpointercancel=()=>{joy.throttle=0;joy.strafe=0;stick.style.transform=''};
const lookZone=$('lookZone');let lookId=null,lastLookX=0,lastLookY=0,bankInput=0;
lookZone.onpointerdown=e=>{if(!panel.classList.contains('hidden'))return;lookId=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;lookZone.setPointerCapture(e.pointerId)};
lookZone.onpointermove=e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch-dy*.0045,-1.15,1.15);bankInput=THREE.MathUtils.clamp(-dx*.035,-.65,.65)};
lookZone.onpointerup=lookZone.onpointercancel=e=>{if(e.pointerId===lookId){lookId=null;bankInput=0}};
$('fireBtn').onpointerdown=()=>{if(panel.classList.contains('hidden')&&!docked&&!landing)fire()};$('skillBtn').onpointerdown=()=>{if(panel.classList.contains('hidden')&&!docked&&!landing)skill()};
function save(){player.x=playerMesh.position.x;player.y=playerMesh.position.z;player.z=playerMesh.position.y;player.yaw=yaw;player.pitch=pitch;localStorage.setItem('mundoAbierto.player',JSON.stringify(player))}setInterval(save,5000);addEventListener('beforeunload',save);
playerMesh.position.set(player.x,player.z,player.y);
if(!Number.isFinite(playerMesh.position.x)||!Number.isFinite(playerMesh.position.y)||!Number.isFinite(playerMesh.position.z))playerMesh.position.set(0,0,0);
camera.position.copy(playerMesh.position).add(new THREE.Vector3(0,100,210));camera.lookAt(playerMesh.position.clone().add(new THREE.Vector3(0,8,-150)));
function hud(){$('playerName').textContent=player.name;$('classLabel').textContent=player.classId?CLASSES[player.classId].name:'Sin tipo';$('level').textContent='Nivel '+player.level;$('hpText').textContent=Math.ceil(player.hp)+'/'+player.maxHp;$('energyText').textContent=Math.ceil(player.energy)+'/'+player.maxEnergy;$('hpBar').style.width=player.hp/player.maxHp*100+'%';$('energyBar').style.width=player.energy/player.maxEnergy*100+'%';$('attack').textContent=player.attack;$('defense').textContent=player.defense;$('gold').textContent=player.gold;const lootCount=Object.values(player.loot||{}).reduce((a,b)=>a+(Number(b)||0),0);$('lootCount').textContent=lootCount;$('xpText').textContent='XP '+Math.floor(player.xp)+' / '+xpNeed();$('xpBar').style.width=player.xp/xpNeed()*100+'%';$('skillCd').textContent=skillCd>0?Math.ceil(skillCd)+'s':''}
const panel=$('characterPanel');const closeCharacterPanel=()=>{panel.classList.add('hidden');document.body.classList.remove('inventory-open')};$('characterBtn').onclick=()=>{const box=panel.querySelector('.class-grid');$('nameInput').value=player.name;$('statList').innerHTML='Nivel: '+player.level+'<br>Casco: '+player.maxHp+'<br>Energía: '+player.maxEnergy+'<br>Potencia: '+player.attack+'<br>Escudo: '+player.defense;renderInventory();renderUpgrades();renderDrones();box.innerHTML=Object.entries(CLASSES).map(([id,c])=>'<button class="class-card '+(id===player.classId?'selected':'')+'" data-id="'+id+'"><b>'+c.name+'</b><small>Casco '+c.hp+' · Potencia '+c.attack+' · Escudo '+c.defense+'</small></button>').join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const c=CLASSES[b.dataset.id];player.classId=b.dataset.id;player.maxHp=c.hp+upgradeBonus('maxHp');player.hp=player.maxHp;player.maxEnergy=c.energy;player.energy=c.energy;player.attack=c.attack+upgradeBonus('attack');player.defense=c.defense+upgradeBonus('defense');player.speed=c.speed+upgradeBonus('speed');hud();closeCharacterPanel()});panel.classList.remove('hidden');document.body.classList.add('inventory-open')};$('closePanel').onclick=closeCharacterPanel;$('saveBtn').onclick=()=>{player.name=$('nameInput').value.trim()||'Nave Aurora';save();closeCharacterPanel()};$('resetBtn').onclick=()=>{if(confirm('¿Reiniciar la nave y todo su progreso?')){localStorage.removeItem('mundoAbierto.player');location.reload()}};
$('interactBtn').classList.add('hidden');$('dialogue').classList.add('hidden');$('questTracker').classList.add('hidden');
let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.04);last=now;fireCd=Math.max(0,fireCd-dt);skillCd=Math.max(0,skillCd-dt);player.energy=Math.min(player.maxEnergy,player.energy+8*dt);
const menuOpen=docked||landing||!panel.classList.contains('hidden');const keyThrottle=menuOpen?0:(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),throttle=menuOpen?0:THREE.MathUtils.clamp(joy.throttle+keyThrottle,-1,1);
if(!docked&&!landing&&keys.arrowleft){yaw+=1.6*dt;bankInput=.42}else if(!docked&&!landing&&keys.arrowright){yaw-=1.6*dt;bankInput=-.42}else if(lookId===null)bankInput=0;if(!docked&&!landing&&keys.r)pitch=Math.min(1.15,pitch+1.1*dt);if(!docked&&!landing&&keys.f)pitch=Math.max(-1.15,pitch-1.1*dt);
const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const strafe=menuOpen?0:THREE.MathUtils.clamp(joy.strafe+(keys.d?1:0)-(keys.a?1:0),-1,1);const movementScale=Math.max(1,Math.hypot(throttle,strafe));playerMesh.position.addScaledVector(forward,player.speed*throttle*dt/movementScale);playerMesh.position.addScaledVector(right,player.speed*strafe*dt/movementScale);advanceLanding(dt);
playerMesh.position.y=THREE.MathUtils.clamp(playerMesh.position.y,-900,1200);
playerMesh.rotation.order='YXZ';playerMesh.rotation.y=yaw;playerMesh.rotation.x=pitch;const bankTarget=(bankInput-strafe*.16)*Math.min(1,.35+Math.abs(throttle)+Math.abs(strafe)*.65);playerMesh.rotation.z=THREE.MathUtils.lerp(playerMesh.rotation.z,bankTarget,1-Math.pow(.0008,dt));bankInput=THREE.MathUtils.lerp(bankInput,0,1-Math.pow(.02,dt));
for(const l of engineLights)l.intensity=18+Math.abs(throttle)*48;for(const t of engineTrails){t.scale.y=.18+Math.abs(throttle)*1.35;t.scale.x=.75+Math.abs(throttle)*.18;t.scale.z=.75+Math.abs(throttle)*.18;t.material.opacity=.12+Math.abs(throttle)*.58;}
updateLoot(dt);
drawRadar(dt);
const playerSafe=updateZone();updateDock();
for(const e of enemies){if(e.dead){if(now/1000>=e.dead){e.dead=0;e.hp=e.maxHp;e.mesh.position.copy(e.home);e.mesh.visible=true}continue}const t=TYPES[e.type],d=e.mesh.position.distanceTo(playerMesh.position);if(d<380&&!playerSafe&&!docked&&!landing){const dir=playerMesh.position.clone().sub(e.mesh.position).normalize();if(d>70)e.mesh.position.addScaledVector(dir,t.speed*dt);else player.hp=Math.max(0,player.hp-Math.max(1,t.damage-player.defense*.25)*dt)}e.mesh.lookAt(playerMesh.position)}
updateSupportDrones(dt,now);
 for(const p of shots){p.mesh.position.addScaledVector(p.vel,dt);p.life-=dt;for(const e of enemies){if(!e.dead&&p.life>0&&p.mesh.position.distanceTo(e.mesh.position)<30){e.hp-=p.damage;p.life=0;if(e.hp<=0)kill(e)}}}for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0){scene.remove(shots[i].mesh);shots.splice(i,1)}
if(player.hp<=0){playerMesh.position.set(0,0,0);player.hp=player.maxHp;player.energy=player.maxEnergy}
const back=forward.clone().multiplyScalar(-285).add(new THREE.Vector3(0,105,0));const desired=playerMesh.position.clone().add(back);camera.position.lerp(desired,1-Math.pow(.006,dt));camera.lookAt(playerMesh.position.clone().add(forward.clone().multiplyScalar(215)));if(!docked&&!landing)updateTargetLock();else lockFrame.classList.add('hidden');hud();renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
hud();
