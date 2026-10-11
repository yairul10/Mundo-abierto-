const {GLTFLoader}=await import((window.THREE_CDN||'https://cdn.jsdelivr.net/npm/three@0.180.0')+'/examples/jsm/loaders/GLTFLoader.js');
const THREE=window.THREE;if(!THREE)throw new Error('Three.js no disponible');
const $=id=>document.getElementById(id), canvas=$('world');
let storageWarningShown=false;
function showStorageWarning(message='El navegador bloqueó el guardado. Esta sesión continuará, pero algunos cambios podrían no conservarse.'){
 if(storageWarningShown)return;storageWarningShown=true;
 const notice=document.createElement('div');notice.setAttribute('role','alert');
 notice.style.cssText='position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:1200;max-width:86vw;padding:12px 16px;border-radius:13px;background:rgba(73,27,19,.95);border:1px solid #ff8b65;color:#fff1e9;font:600 14px system-ui;text-align:center;box-shadow:0 8px 24px #0008;';
 notice.textContent='⚠️ '+message;document.body.appendChild(notice);setTimeout(()=>notice.remove(),6500);
}
function safeStorageGet(key){try{return localStorage.getItem(key)}catch{showStorageWarning();return null}}
function safeStorageSet(key,value){try{localStorage.setItem(key,value);return true}catch{showStorageWarning();return false}}
function safeStorageRemove(key){try{localStorage.removeItem(key);return true}catch{showStorageWarning();return false}}
const DEFAULT={name:'Nave Aurora',classId:null,level:1,x:0,y:0,z:0,hp:100,maxHp:100,energy:100,maxEnergy:100,attack:10,defense:5,gold:0,xp:0,speed:220,quests:{}};
const QA_FLAG='mundoAbierto.qaActive';const qaActive=safeStorageGet(QA_FLAG)==='1';const SAVE_KEY=qaActive?'mundoAbierto.qaPlayer':'mundoAbierto.player';let stored={};try{stored=JSON.parse(safeStorageGet(SAVE_KEY)||'{}')||{}}catch{showStorageWarning('El guardado estaba dañado y se inició una sesión segura.')}let player={...DEFAULT,...stored};player.x=Number.isFinite(+player.x)?+player.x:0;player.y=Number.isFinite(+player.y)?+player.y:0;player.z=Number.isFinite(+player.z)?+player.z:0;player.quests=player.quests||{};
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
// Recuperación móvil ante pérdida del contexto WebGL. Guardar antes de
// recargar evita perder posición, inventario o mejoras.
let graphicsLost=false,graphicsRecoveryTimer=null;
const graphicsRecovery=document.createElement('div');
graphicsRecovery.style.cssText='position:fixed;inset:0;z-index:1000;display:none;place-items:center;background:rgba(2,6,17,.92);padding:24px;color:#eef8ff;font:600 16px system-ui;text-align:center;';
graphicsRecovery.innerHTML='<div style="max-width:420px;padding:24px;border:1px solid #4fbfff;border-radius:18px;background:#071426"><strong style="display:block;font-size:21px;margin-bottom:10px">Recuperando gráficos…</strong><span id="graphicsRecoveryText">La partida fue guardada. Espera unos segundos.</span><button id="graphicsReloadBtn" type="button" style="display:block;margin:18px auto 0;padding:12px 18px;border:0;border-radius:12px;background:#168cff;color:white;font-weight:700">Recargar gráficos</button></div>';
document.body.appendChild(graphicsRecovery);
const graphicsRecoveryText=graphicsRecovery.querySelector('#graphicsRecoveryText');
const GRAPHICS_RECOVERY_KEY='mundoAbierto.webglRecoveryAt';
function reloadGraphics(){
 try{save()}catch{}
 try{sessionStorage.setItem(GRAPHICS_RECOVERY_KEY,String(Date.now()))}catch{}
 const url=new URL(location.href);url.searchParams.set('graphics',String(Date.now()));location.replace(url);
}
graphicsRecovery.querySelector('#graphicsReloadBtn').onclick=reloadGraphics;
canvas.addEventListener('webglcontextlost',event=>{
 event.preventDefault();graphicsLost=true;
 try{save()}catch{}
 graphicsRecovery.style.display='grid';
 let lastRecovery=0;try{lastRecovery=Number(sessionStorage.getItem(GRAPHICS_RECOVERY_KEY))||0}catch{}
 const recentlyRetried=Date.now()-lastRecovery<30000;
 graphicsRecoveryText.textContent=recentlyRetried?'Android volvió a detener los gráficos. Cierra otras aplicaciones y pulsa Recargar gráficos.':'La partida fue guardada. Intentaremos restaurar los gráficos automáticamente.';
 if(!recentlyRetried)graphicsRecoveryTimer=setTimeout(reloadGraphics,8000);
});
canvas.addEventListener('webglcontextrestored',()=>{
 graphicsLost=false;if(graphicsRecoveryTimer)clearTimeout(graphicsRecoveryTimer);
 graphicsRecoveryText.textContent='Gráficos restaurados. Reiniciando el mundo…';
 setTimeout(reloadGraphics,350);
});
const scene=new THREE.Scene();scene.background=new THREE.Color(0x020611);scene.fog=new THREE.FogExp2(0x020611,.00032);
// Fondo espacial panorámico ligero: textura generada una vez, sin geometría
// adicional ni llamadas de red. Nebulosas tenues y estrellas sobre espacio oscuro.
function createSpaceBackground(){
 const c=document.createElement('canvas');c.width=2048;c.height=1024;
 const ctx=c.getContext('2d');if(!ctx)return null;
 const base=ctx.createLinearGradient(0,0,0,c.height);
 base.addColorStop(0,'#01040d');base.addColorStop(.45,'#030716');base.addColorStop(1,'#01040b');
 ctx.fillStyle=base;ctx.fillRect(0,0,c.width,c.height);
 // Nubes superpuestas muy transparentes para no competir con la mira.
 const clouds=[
  [360,440,520,270,'55,89,160',.26],
  [850,530,620,260,'87,49,135',.21],
  [1430,375,570,290,'35,110,163',.27],
  [1900,640,450,260,'89,54,144',.20],
  [75,630,390,210,'40,100,155',.17]
 ];
 for(const [x,y,rx,ry,rgb,alpha] of clouds){
  ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);
  const g=ctx.createRadialGradient(0,0,0,0,0,rx);
  g.addColorStop(0,'rgba('+rgb+','+alpha+')');
  g.addColorStop(.4,'rgba('+rgb+','+(alpha*.45)+')');
  g.addColorStop(1,'rgba('+rgb+',0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 // Distribución reproducible para que el fondo no cambie en cada carga.
 let seed=91347;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<2900;i++){
  const x=random()*c.width,y=random()*c.height;
  const radius=random()>.982?1.8:.35+random()*.8;
  const intensity=.22+random()*.65;
  const tint=random();ctx.fillStyle=tint>.93?'rgba(168,199,255,'+intensity+')':tint>.85?'rgba(255,218,200,'+intensity+')':'rgba(228,239,255,'+intensity+')';
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
 }
 const texture=new THREE.CanvasTexture(c);
 texture.mapping=THREE.EquirectangularReflectionMapping;
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
const spaceBackground=createSpaceBackground();if(spaceBackground)scene.background=spaceBackground;
// Panorama artístico externo (2:1): si falta el archivo, conservar fondo procedural.
new THREE.TextureLoader().load('./assets/models/fondo_espacial_aurora.webp?v=105',texture=>{
 texture.mapping=THREE.EquirectangularReflectionMapping;
 texture.colorSpace=THREE.SRGBColorSpace;
 scene.background=texture;
 if(spaceBackground)spaceBackground.dispose();
},undefined,()=>console.info('Fondo espacial personalizado pendiente; usando fondo original.'));
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,1,9000);
scene.add(new THREE.HemisphereLight(0x7bbcff,0x050713,1.8));const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-600,900,-400);scene.add(sun);
const starsGeo=new THREE.BufferGeometry(),sp=[];for(let i=0;i<1600;i++)sp.push((Math.random()-.5)*8000,(Math.random()-.5)*4500,(Math.random()-.5)*8000);starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xbad9ff,size:3,sizeAttenuation:true})));
// Planeta lejano del Sector Aurora: decorativo, sin colisiones ni viajes aún.
// Materiales sin niebla para conservar su silueta desde la zona jugable.
function createAuroraPlanet(){
 const textureCanvas=document.createElement('canvas');textureCanvas.width=512;textureCanvas.height=256;
 const ctx=textureCanvas.getContext('2d');if(!ctx)return;
 const ocean=ctx.createLinearGradient(0,0,0,256);
 ocean.addColorStop(0,'#081c48');ocean.addColorStop(.28,'#175a99');ocean.addColorStop(.52,'#1c8bba');ocean.addColorStop(.78,'#123c78');ocean.addColorStop(1,'#061634');
 ctx.fillStyle=ocean;ctx.fillRect(0,0,512,256);
 let seed=46823;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<80;i++){
  const y=rnd()*256,w=100+rnd()*260;
  ctx.fillStyle=i%3===0?'rgba(150,220,242,.09)':'rgba(9,30,88,.14)';
  ctx.fillRect(rnd()*512,y,w,1+rnd()*8);
 }
 for(let i=0;i<19;i++){
  const x=rnd()*512,y=25+rnd()*205;
  ctx.fillStyle='rgba(159,217,235,'+(.05+rnd()*.11)+')';
  ctx.beginPath();ctx.ellipse(x,y,35+rnd()*100,2+rnd()*7,rnd()*.3,0,Math.PI*2);ctx.fill();
 }
 const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const planet=new THREE.Group();
 planet.position.set(2150,950,-5200);
 const globe=new THREE.Mesh(new THREE.SphereGeometry(680,48,32),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0,emissive:0x0a2b56,emissiveIntensity:.45,fog:false}));
 globe.rotation.z=.17;planet.add(globe);
 const glow=new THREE.Mesh(new THREE.SphereGeometry(708,40,24),new THREE.MeshBasicMaterial({color:0x2c9ce5,transparent:true,opacity:.085,side:THREE.BackSide,depthWrite:false,fog:false}));planet.add(glow);
 const rings=new THREE.Mesh(new THREE.RingGeometry(845,1140,96),new THREE.MeshBasicMaterial({color:0x78a9c9,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false,fog:false}));
 rings.rotation.x=1.18;rings.rotation.y=.26;planet.add(rings);
 scene.add(planet);
 const moon=new THREE.Mesh(new THREE.IcosahedronGeometry(145,3),new THREE.MeshStandardMaterial({color:0x9a9ba5,roughness:1,flatShading:true,emissive:0x20212a,emissiveIntensity:.18,fog:false}));
 moon.position.set(3350,1220,-5550);scene.add(moon);
}
// Planeta Aurora 3D: único planeta principal. No cargar el sprite 2D
// ni el planeta procedural simultáneamente.
const auroraPlanetPosition=new THREE.Vector3(2150,950,-5200);
const auroraPlanetPivot=new THREE.Group();
auroraPlanetPivot.position.copy(auroraPlanetPosition);scene.add(auroraPlanetPivot);
const auroraPlanetLoader=new GLTFLoader();
// Cola móvil: descarga y procesa un GLB secundario a la vez. La nave del
// jugador conserva carga inmediata; el resto aprovecha períodos de reposo.
let deferredModelQueue=Promise.resolve();
function deferredModelLoad(loader,path,onLoad,onProgress,onError){
 deferredModelQueue=deferredModelQueue.then(()=>new Promise(resolve=>{
  const start=()=>loader.load(path,gltf=>{
   try{if(onLoad)onLoad(gltf)}catch(error){console.error('Error al montar '+path,error)}finally{resolve()}
  },onProgress,error=>{
   try{if(onError)onError(error);else console.warn('No se pudo cargar '+path,error)}finally{resolve()}
  });
  if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1200});
  else setTimeout(start,80);
 }));
 return deferredModelQueue;
}
deferredModelLoad(auroraPlanetLoader,'./assets/models/planeta_aurora.glb?v=105',gltf=>{
 const model=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<.0001){createAuroraPlanet();return}
 const targetDiameter=2610; // 20% más grande; misma ubicación y orientación
 const factor=targetDiameter/longest;
 model.scale.setScalar(factor);
 model.position.copy(center).multiplyScalar(-factor);
 model.traverse(obj=>{
  if(!obj.isMesh)return;
  obj.frustumCulled=false;
  const materials=Array.isArray(obj.material)?obj.material:[obj.material];
  for(const material of materials){if(!material)continue;material.fog=false;material.side=THREE.FrontSide;}
 });
 // Orientación real del GLB, con ajuste interactivo en el teléfono.
 // El giro Y permite ver la cara opuesta, no solo inclinar los anillos.
 model.rotation.order='YXZ';
 const defaultAngles=[-.18,2.4,-.88];
 let angles=defaultAngles;
 try{const saved=JSON.parse(safeStorageGet('auroraPlanetAngles'));if(Array.isArray(saved)&&saved.length===3&&saved.every(Number.isFinite))angles=saved}catch{}
 const applyAngles=()=>model.rotation.set(angles[0],angles[1],angles[2]);
 applyAngles();
 // Editor retirado: conservar orientación guardada en este dispositivo.
 auroraPlanetPivot.add(model);
 const planetLight=new THREE.DirectionalLight(0xeaf6ff,5.2);
 planetLight.position.set(-950,1100,1600);
 auroraPlanetPivot.add(planetLight);
},undefined,err=>{
 console.warn('No se pudo cargar planeta_aurora.glb; se muestra el planeta de respaldo.',err);
 createAuroraPlanet();
});
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
function syncPlayerShipVisuals(){
 const titan=playerMesh.userData.titanModel,espectro=playerMesh.userData.espectroModel;
 const showTitan=player.shipId==='titan'&&!!titan;
 const showEspectro=player.shipId==='espectro'&&!!espectro;
 if(titan)titan.visible=showTitan;
 if(espectro)espectro.visible=showEspectro;
 let hasOriginal=false;
 for(const key of ['xWingModel','auroraModel']){
  const model=playerMesh.userData[key];
  if(model){model.visible=!showTitan&&!showEspectro;hasOriginal=true}
 }
 proceduralShip.visible=!showTitan&&!showEspectro&&!hasOriginal;
}
function mountPlayerModel(model,key){playerMesh.add(model);playerMesh.userData[key]=model;syncPlayerShipVisuals()}
deferredModelLoad(modelLoader,'./assets/models/titan.glb?v=115',gltf=>{
 const source=gltf.scene;
 // Acabado metálico moderado con el material estándar de Three.js.
 const maxAnisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 source.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const material of materials){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;
   material.metalness=.45;material.roughness=.5;
   material.normalScale.set(.35,.35);
   if(material.map)material.map.anisotropy=maxAnisotropy;
   material.needsUpdate=true;
  }
 });
 const box=new THREE.Box3().setFromObject(source);
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const span=Math.max(size.x,size.z);
 if(!Number.isFinite(span)||span<.001)return;
 const scale=124/span;
 source.scale.multiplyScalar(scale);
 source.position.sub(center.multiplyScalar(scale));
 const pivot=new THREE.Group();
 pivot.rotation.y=Math.PI;
 pivot.add(source);
 // Motores traseros ámbar: detalles visuales vinculados al modelo Titán.
 const nozzleMetal=new THREE.MeshStandardMaterial({color:0x34261a,metalness:.7,roughness:.5});
 const amberRing=new THREE.MeshBasicMaterial({color:0xff8c12,toneMapped:false});
 const amberCore=new THREE.MeshBasicMaterial({color:0xffd66b,toneMapped:false});
 const glowMaterial=new THREE.MeshBasicMaterial({color:0xff9d22,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
 for(const [x,y,r] of [[-24,-7,7],[24,-7,7],[-13,8,4],[13,8,4]]){
  const engine=new THREE.Group();
  engine.position.set(x,y,-size.z*scale*.5-1);
  engine.rotation.y=Math.PI;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.85,8,24),nozzleMetal);
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.62,r*.9,24),amberRing);
  ring.position.z=.4;
  const core=new THREE.Mesh(new THREE.CircleGeometry(r*.52,24),amberCore);
  core.position.z=.5;
  const glow=new THREE.Mesh(new THREE.CircleGeometry(r*1.45,24),glowMaterial);
  glow.position.z=.6;
  const flameGeometry=new THREE.ConeGeometry(r*.55,40,12,1,true);
 flameGeometry.translate(0,20,0);
 const flame=new THREE.Mesh(flameGeometry,new THREE.MeshBasicMaterial({color:0xff9a20,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
 flame.rotation.x=Math.PI/2;flame.position.z=.7;
 flame.visible=false;
 if(!pivot.userData.engineFlames)pivot.userData.engineFlames=[];
 pivot.userData.engineFlames.push(flame);
 engine.add(rim,ring,core,glow,flame);pivot.add(engine);
 }
 // Blindaje Titán: paneles sólidos blancos y amarillos sobre el casco original.
 const armor=new THREE.Group();pivot.add(armor);
 const titanWhite=new THREE.MeshStandardMaterial({color:0xe5e8ec,metalness:.5,roughness:.38});
 const titanYellow=new THREE.MeshStandardMaterial({color:0xffb900,metalness:.5,roughness:.34});
 const titanDark=new THREE.MeshStandardMaterial({color:0x181c23,metalness:.65,roughness:.42});
 const titanSteel=new THREE.MeshStandardMaterial({color:0x626971,metalness:.7,roughness:.36});
 const titanGlass=new THREE.MeshStandardMaterial({color:0x713a04,metalness:.55,roughness:.2,emissive:0x301200,emissiveIntensity:.3});
 const titanLight=new THREE.MeshBasicMaterial({color:0xffb323,toneMapped:false});
 source.updateWorldMatrix(true,true);
 const armorRay=new THREE.Raycaster();
 const armorDirection=new THREE.Vector3(0,-1,0).transformDirection(pivot.matrixWorld);
 const armorHeights=new Map();
 function titanRoof(x,z){
  const key=x.toFixed(3)+','+z.toFixed(3);
  if(armorHeights.has(key))return armorHeights.get(key);
  armorRay.set(pivot.localToWorld(new THREE.Vector3(x,50,z)),armorDirection);
  const hit=armorRay.intersectObject(source,true)[0];
  const height=hit?pivot.worldToLocal(hit.point.clone()).y:12-Math.max(0,z)*.35-Math.abs(x)*.2;
  armorHeights.set(key,height+.4);return height+.4;
 }
 function titanPanel(points,material,thickness=1.2,lift=0){
  const shape=new THREE.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1});
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getY(i),depth=p.getZ(i);
   p.setXYZ(i,x,titanRoof(x,z)+depth+lift,z);
  }
  for(let i=0;i<p.count;i+=3){
   const x=p.getX(i+1),y=p.getY(i+1),z=p.getZ(i+1);
   p.setXYZ(i+1,p.getX(i+2),p.getY(i+2),p.getZ(i+2));p.setXYZ(i+2,x,y,z);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  const panel=new THREE.Mesh(geometry,material);armor.add(panel);return panel;
 }
 // Espina central y cabina facetada con marco dorado.
 titanPanel([[-7,-48],[7,-48],[9,-31],[9,10],[6,43],[0,58],[-6,43],[-9,10],[-9,-31]],titanDark,1.4);
 titanPanel([[-5.5,-46],[5.5,-46],[7,-30],[6,-6],[0,0],[-6,-6],[-7,-30]],titanWhite,1.2,.6);
 titanPanel([[-6,-2],[6,-2],[7,9],[5,33],[0,42],[-5,33],[-7,9]],titanYellow,1.4,.7);
 titanPanel([[-4.3,2],[4.3,2],[5,10],[3.5,28],[0,35],[-3.5,28],[-5,10]],titanGlass,2.2,1);
 titanPanel([[-5,38],[5,38],[4,45],[0,56],[-4,45]],titanWhite,1.2,.7);
 titanPanel([[-1.1,44],[1.1,44],[0,56]],titanYellow,1,.9);
 // Laterales anchos: placas rectas y bandas amarillas, sin mover las toberas.
 for(const sign of [-1,1]){
  const pts=points=>points.map(([x,z])=>[x*sign,z]);
  titanPanel(pts([[11,-40],[18,-40],[22,-29],[21,15],[15,40],[10,31],[10,-16]]),titanDark,1.5);
  titanPanel(pts([[12,-37],[17,-37],[19,-26],[18,14],[14,34],[12,28],[12,-15]]),titanWhite,1.2,.7);
  titanPanel(pts([[17,-28],[20,-24],[19,7],[16,17],[16,4]]),titanYellow,1,.9);
  titanPanel(pts([[23,-33],[31,-30],[34,-19],[33,21],[29,38],[23,34],[21,18],[21,-19]]),titanDark,1.5);
  titanPanel(pts([[24,-29],[29,-27],[31,-18],[30,19],[27,32],[24,29],[23,17],[23,-18]]),titanWhite,1.3,.8);
  titanPanel(pts([[28,-25],[31,-20],[30,7],[27,14],[27,-8]]),titanYellow,1.1,1);
  titanPanel(pts([[25,18],[29,19],[27,34],[24,29]]),titanYellow,1.1,.9);
  // Panel técnico oscuro y luz del módulo lateral.
  titanPanel(pts([[24,-20],[29,-19],[29,-10],[24,-11]]),titanDark,.8,1.6);
  titanPanel(pts([[24.5,25],[27.5,25],[27,28],[24,28]]),titanLight,.5,2);
  // Aletas rectas con inserto amarillo; quedan por delante de las cuatro salidas.
  const finShape=new THREE.Shape();
  [[-57,12],[-57,27],[-46,26],[-31,12]].forEach(([z,y],i)=>i?finShape.lineTo(z,y):finShape.moveTo(z,y));finShape.closePath();
  const finGeometry=new THREE.ExtrudeGeometry(finShape,{depth:3.4,bevelEnabled:false});
  const fin=new THREE.Mesh(finGeometry,titanWhite);
  fin.rotation.y=-Math.PI/2;fin.position.x=sign*21+1.7;armor.add(fin);
  const insertShape=new THREE.Shape();
  [[-54,15],[-54,24.5],[-47,24],[-36,15]].forEach(([z,y],i)=>i?insertShape.lineTo(z,y):insertShape.moveTo(z,y));insertShape.closePath();
  const insertGeometry=new THREE.ExtrudeGeometry(insertShape,{depth:3.6,bevelEnabled:false});
  const insert=new THREE.Mesh(insertGeometry,titanYellow);
  insert.rotation.y=-Math.PI/2;insert.position.x=sign*21+1.8;armor.add(insert);
 }
 // Tres respiraderos de metal con separadores, sin texturas nuevas.
 for(const z of [-36,-22,-8]){
  titanPanel([[-2.7,z-3],[2.7,z-3],[2.7,z+3],[-2.7,z+3]],titanDark,.7,1.4);
  for(const dz of [-1.5,0,1.5]){
   titanPanel([[-2.1,z+dz-.2],[2.1,z+dz-.2],[2.1,z+dz+.2],[-2.1,z+dz+.2]],titanSteel,.3,2.2);
  }
 }

 mountPlayerModel(pivot,'titanModel');
},undefined,err=>console.warn('Modelo Titán no disponible; se conserva la apariencia original.',err));
deferredModelLoad(modelLoader,'./assets/models/espectro.glb?v=120',gltf=>{
 const source=gltf.scene;
 const maxAnisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 source.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;
   material.metalness=.4;material.roughness=.42;
   material.normalScale.set(.3,.3);
   // Conservar los paneles blancos, rojos y oscuros de la textura original.
   material.color.setRGB(1.12,1.04,1.04);
   if(material.map)material.map.anisotropy=maxAnisotropy;
   material.needsUpdate=true;
  }
 });
 const box=new THREE.Box3().setFromObject(source);
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const span=Math.max(size.x,size.z);
 if(!Number.isFinite(span)||span<.001)return;
 const scale=124/span;
 source.scale.multiplyScalar(scale);
 source.position.sub(center.multiplyScalar(scale));
 const pivot=new THREE.Group();
 pivot.rotation.y=Math.PI/2;
 pivot.add(source);
 // Carenado trasero: tres turbinas metálicas y aletas rojas como la referencia.
 const rear=new THREE.Group();
 rear.position.set(-size.x*scale*.34,0,0);
 rear.rotation.y=-Math.PI/2;
 pivot.add(rear);
 const darkMetal=new THREE.MeshStandardMaterial({color:0x161a20,metalness:.7,roughness:.38});
 const steel=new THREE.MeshStandardMaterial({color:0x555d67,metalness:.65,roughness:.4});
 const whiteArmor=new THREE.MeshStandardMaterial({color:0xe6e8eb,metalness:.45,roughness:.38});
 const redArmor=new THREE.MeshStandardMaterial({color:0xc41423,metalness:.55,roughness:.3});
 const redLight=new THREE.MeshBasicMaterial({color:0xff2810,toneMapped:false});
 const hotCore=new THREE.MeshBasicMaterial({color:0xffe6a0,toneMapped:false});
 function rearPlate(points,material,depth=1.8,z=3){
  const shape=new THREE.Shape();
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),material);
  mesh.position.z=z;rear.add(mesh);return mesh;
 }
 // Las nuevas placas cubren las antiguas cinco bocas y definen una silueta más angular.
 rearPlate([[-33,-12],[-32,9],[-15,17],[0,20],[15,17],[32,9],[33,-12],[13,-17],[-13,-17]],darkMetal,6,-4);
 for(const sign of [-1,1]){
  const pts=points=>points.map(([x,y])=>[x*sign,y]);
  rearPlate(pts([[13,8],[19,16],[30,11],[49,-2],[36,2],[25,7]]),whiteArmor);
  rearPlate(pts([[27,10],[35,8],[51,-4],[43,-2],[33,5]]),redArmor,1.6,5);
  rearPlate(pts([[18,10],[20,35],[24,12],[23,7]]),redArmor,2,0);
  rearPlate(pts([[20,13],[21,28],[22,13]]),darkMetal,1,2.2);
  rearPlate(pts([[17,-9],[25,-10],[29,-28],[20,-20]]),redArmor,2,2);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,1),redLight);
  strip.position.set(sign*34,2,6);strip.rotation.z=-sign*.25;rear.add(strip);
 }
 rearPlate([[-12,14],[-8,20],[8,20],[12,14],[8,11],[-8,11]],whiteArmor,2,4);
 const topLight=new THREE.Mesh(new THREE.BoxGeometry(10,1.5,1),redLight);
 topLight.position.set(0,13,7);rear.add(topLight);
 pivot.userData.engineFlames=[];
 for(const [side,height,radius,length] of [[-22,-5,9,1],[0,-2,12,1.3],[22,-5,9,1]]){
  const engine=new THREE.Group();engine.position.set(side,height,7);rear.add(engine);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*1.05,9,24),darkMetal);
  barrel.rotation.x=Math.PI/2;barrel.position.z=-3;engine.add(barrel);
  for(const [r,t,z,material] of [[radius,.95,2,steel],[radius*.79,.8,2.5,darkMetal],[radius*.6,.7,3,redLight]]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(r,t,6,32),material);
   ring.position.z=z;engine.add(ring);
  }
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6;
   const rib=new THREE.Mesh(new THREE.BoxGeometry(1.3,radius*.28,1.4),steel);
   rib.position.set(Math.sin(angle)*radius*.87,Math.cos(angle)*radius*.87,2.7);
   rib.rotation.z=-angle;engine.add(rib);
   const segment=new THREE.Mesh(new THREE.BoxGeometry(1,radius*.16,.6),redLight);
   segment.position.set(Math.sin(angle)*radius*.69,Math.cos(angle)*radius*.69,3.5);
   segment.rotation.z=-angle;engine.add(segment);
  }
  const face=new THREE.Mesh(new THREE.CircleGeometry(radius*.55,32),redLight);face.position.z=3.6;
  const core=new THREE.Mesh(new THREE.CircleGeometry(radius*.29,24),hotCore);core.position.z=3.7;
  const glow=new THREE.Mesh(new THREE.CircleGeometry(radius*.8,32),new THREE.MeshBasicMaterial({color:0xff3b0a,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  glow.position.z=3.9;
  const geometry=new THREE.ConeGeometry(radius*.4,46,12,1,true);geometry.translate(0,23,0);
  const flame=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xff581c,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
  flame.rotation.x=Math.PI/2;flame.position.z=4;flame.visible=false;flame.userData.lengthFactor=length;
  pivot.userData.engineFlames.push(flame);engine.add(face,core,glow,flame);
 }

 // Cubierta superior independiente; no altera el carenado trasero ni sus motores.
 const dorsal=new THREE.Group();pivot.add(dorsal);
 source.updateWorldMatrix(true,true);
 const deckRay=new THREE.Raycaster();
 const deckDirection=new THREE.Vector3(0,-1,0).transformDirection(pivot.matrixWorld);
 const deckHeights=new Map();
 function deckHeight(x,z){
  const key=x.toFixed(3)+','+z.toFixed(3);
  if(deckHeights.has(key))return deckHeights.get(key);
  const origin=pivot.localToWorld(new THREE.Vector3(x,40,z));
  deckRay.set(origin,deckDirection);
  const hit=deckRay.intersectObject(source,true)[0];
  const height=hit?pivot.worldToLocal(hit.point.clone()).y:Math.max(-4,15-Math.abs(z)*.4-Math.max(0,x)*.25);
  // Mantener las placas bajo el perfil del carenado visto directamente desde atrás.
  const ceiling=Math.abs(z)<10?19:19-Math.abs(z)*.38;
  const fitted=Math.min(height+.45,ceiling-1.8);
  deckHeights.set(key,fitted);return fitted;
 }
 function deckPlate(points,material,thickness=1.2,lift=0){
  const shape=new THREE.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1});
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),z=positions.getY(i),depth=positions.getZ(i);
   positions.setXYZ(i,x,deckHeight(x,z)+depth+lift,z);
  }
  // El intercambio de Y y Z invierte el orden de los triángulos.
  for(let i=0;i<positions.count;i+=3){
   const x=positions.getX(i+1),y=positions.getY(i+1),z=positions.getZ(i+1);
   positions.setXYZ(i+1,positions.getX(i+2),positions.getY(i+2),positions.getZ(i+2));
   positions.setXYZ(i+2,x,y,z);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  const mesh=new THREE.Mesh(geometry,material);dorsal.add(mesh);return mesh;
 }
 // Espina dorsal, proa afilada y cabina roja facetada.
 deckPlate([[-28,-6],[-28,6],[-9,8],[12,7],[39,4],[59,0],[39,-4],[12,-7],[-9,-8]],darkMetal,1.6);
 deckPlate([[-25,-4.8],[-25,4.8],[-5,6],[10,4.5],[15,0],[10,-4.5],[-5,-6]],whiteArmor,1.1,.7);
 deckPlate([[12,-6],[12,6],[29,5],[45,2.8],[57,0],[45,-2.8],[29,-5]],whiteArmor,1.1,.6);
 deckPlate([[18,-4],[18,4],[25,4.8],[36,2.7],[42,0],[36,-2.7],[25,-4.8]],redArmor,1.8,1);
 deckPlate([[44,-2],[44,2],[60,0]],redArmor,1.1,.7);
 // Blindaje simétrico: paneles blancos separados por canales de metal oscuro.
 for(const sign of [-1,1]){
  const pts=points=>points.map(([x,z])=>[x,z*sign]);
  deckPlate(pts([[-28,10],[-26,21],[-7,25],[16,18],[29,10],[8,9],[-12,9]]),darkMetal,1.5);
  deckPlate(pts([[-26,11],[-23,19],[-7,22],[12,17],[24,11],[5,11],[-12,10.8]]),whiteArmor,1.1,.6);
  deckPlate(pts([[-24,19],[-8,23],[12,18],[21,13],[13,15],[-8,20],[-23,17]]),redArmor,1,.8);
  deckPlate(pts([[-27,26],[-25,35],[-15,40],[7,31],[16,24],[-6,25]]),darkMetal,1.3);
  deckPlate(pts([[-25,27],[-23,33],[-14,37],[3,30],[11,26],[-7,27]]),whiteArmor,1,.6);
  deckPlate(pts([[-24,33],[-15,40],[7,31],[14,25],[6,29],[-14,36],[-24,31]]),redArmor,1.1,.7);
  // Pequeñas luces rojas encastradas, sin añadir luces dinámicas.
  for(const [x,z] of [[-15,14],[2,21],[-14,31]]){
   deckPlate(pts([[x-3,z-.9],[x-3,z+.9],[x+3,z+.9],[x+3,z-.9]]),darkMetal,.8,1);
   deckPlate(pts([[x-2.3,z-.4],[x-2.3,z+.4],[x+2.3,z+.4],[x+2.3,z-.4]]),redLight,.35,1.8);
  }
 }

 mountPlayerModel(pivot,'espectroModel');
},undefined,err=>console.warn('Modelo Espectro no disponible; se conserva la apariencia original.',err));
function loadAuroraFallback(){
 modelLoader.load('./assets/models/aurora_s1.glb?v=105',gltf=>{
  const model=gltf.scene;model.traverse(o=>{if(o.isMesh)auroraMaterial(o)});
  mountPlayerModel(fitPlayerModel(model,-Math.PI/2),'auroraModel');
 },undefined,err=>console.warn('Los modelos GLB no cargaron; se usa la nave procedural.',err));
}
modelLoader.load('./assets/models/x_wing_starfighter.glb?v=105',gltf=>{
 const model=gltf.scene,maxAnisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){for(const mapName of['map','normalMap','metalnessMap','roughnessMap'])if(material?.[mapName])material[mapName].anisotropy=maxAnisotropy}});
 // El modelo mira hacia +Z; el juego avanza hacia -Z.
 mountPlayerModel(fitPlayerModel(model,Math.PI),'xWingModel');
},undefined,err=>{console.warn('X-Wing no disponible; cargando Aurora-S1.',err);loadAuroraFallback()});
// El X-Wing tiene dos turbinas visibles: situar los efectos en ellas, no en los
// cuatro soportes del motor del modelo anterior. Sin discos blancos opacos.
const engineLights=[],engineTrails=[],engineGlows=[];
for(const x of [-19,19]){
 const y=-2,z=39;
 const l=new THREE.PointLight(0x27aaff,10,105,2);
 l.position.set(x,y,z+5);playerMesh.add(l);engineLights.push(l);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(4.1,24),new THREE.MeshBasicMaterial({color:0x4bbfff,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
 glow.position.set(x,y,z+1);playerMesh.add(glow);engineGlows.push(glow);
 const trail=new THREE.Mesh(new THREE.ConeGeometry(3.1,40,12,1,true),new THREE.MeshBasicMaterial({color:0x168dff,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
 trail.rotation.x=Math.PI/2;trail.position.set(x,y,z+23);playerMesh.add(trail);engineTrails.push(trail);
}
// Planeta y luna provisionales eliminados: ahora solo existe planeta_aurora.glb.
function station(){const g=new THREE.Group(),metal=mat(0x33465c),glow=mat(0x123d68,0x168cff);for(const r of[190,290,390,480,575]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,14,12,64),metal);ring.rotation.x=Math.PI/2;g.add(ring)}const hub=new THREE.Mesh(new THREE.CylinderGeometry(105,135,260,16),metal);g.add(hub);for(let i=0;i<8;i++){const a=i*Math.PI/4,t=new THREE.Mesh(new THREE.BoxGeometry(24,100+Math.random()*90,24),glow);t.position.set(Math.cos(a)*185,100,Math.sin(a)*185);g.add(t)}for(let i=0;i<4;i++){const arm=new THREE.Mesh(new THREE.BoxGeometry(620,16,32),metal);arm.rotation.y=i*Math.PI/2;g.add(arm)}const dock=new THREE.Mesh(new THREE.BoxGeometry(820,22,110),metal);dock.position.set(430,-35,0);g.add(dock);for(const side of[-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(720,5,8),glow);rail.position.set(430,-22,side*42);g.add(rail)}for(let i=0;i<12;i++){const a=i*Math.PI/6,windowLight=new THREE.Mesh(new THREE.BoxGeometry(16,8,5),new THREE.MeshBasicMaterial({color:0x55d7ff}));windowLight.position.set(Math.cos(a)*300,35,Math.sin(a)*300);windowLight.rotation.y=-a;g.add(windowLight)}const crown=new THREE.Mesh(new THREE.CylinderGeometry(38,75,220,10),glow);crown.position.y=210;g.add(crown);const beacon=new THREE.PointLight(0x27aaff,180,1200,2);beacon.position.set(0,100,0);g.add(beacon);g.position.set(0,0,-650);g.scale.setScalar(1.25);return g}const auroraStation=station();scene.add(auroraStation);
let auroraModelReady=false,auroraLandingModel=null;
let modularStationReady=false;
// Estación Aurora definitiva: tres GLB independientes unidos sobre el respaldo procedural.
// Se ensambla solo cuando se descargan correctamente las tres piezas.
const modularLandingPads=[];
const modularPaths=[
 './assets/models/scififortress_optimizado.glb?v=105',
 './assets/models/landingpad_optimizado.glb?v=105',
 './assets/models/scificorridormodule_optimizado.glb?v=105'
];
Promise.all(modularPaths.map(path=>new Promise((resolve,reject)=>deferredModelLoad(modelLoader,path,gltf=>resolve(gltf.scene),undefined,reject))))
.then(([hubSource,padSource,bridgeSource])=>{
 const assembly=new THREE.Group();
 // Ajustar cada pieza por separado sin alterar sus proporciones.
 function fitted(source,span){
  const b=new THREE.Box3().setFromObject(source),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.x+size.y+size.z)||Math.max(size.x,size.y,size.z)<.001)throw Error('Modelo de estación vacío');
  const obj=source.clone(true),scale=span/Math.max(size.x,size.z,1e-5);
  obj.scale.setScalar(scale);obj.position.copy(center).multiplyScalar(-scale);
  const group=new THREE.Group();group.add(obj);return group;
 }
 const hub=fitted(hubSource,315);assembly.add(hub);
 const positions=[[450,0],[-450,0],[0,450],[0,-450]];
 for(const [x,z] of positions){
  const pad=fitted(padSource,250);pad.position.set(x,0,z);assembly.add(pad);
  modularLandingPads.push(pad);
  const bridge=fitted(bridgeSource,245);
  // Eje largo del corredor local alineado con el radio hacia cada plataforma.
  const bridgeBounds=new THREE.Box3().setFromObject(bridge);
  const bridgeSize=bridgeBounds.getSize(new THREE.Vector3());
  const angle=Math.atan2(x,z);
  bridge.rotation.y=angle+(bridgeSize.x>bridgeSize.z?Math.PI/2:0);
  bridge.position.set(x*.56,0,z*.56);assembly.add(bridge);
 }
 // La estación conserva la posición original en el mundo y su luz.
 const old=[...auroraStation.children];for(const child of old)if(!child.isLight)auroraStation.remove(child);
 auroraStation.add(assembly);modularStationReady=true;auroraModelReady=true;
 auroraLandingModel=assembly;
 // La plataforma oriental es el punto de aterrizaje; conservar alturas seguras.
 const padWorld=auroraStation.localToWorld(new THREE.Vector3(450,15,0));
 LANDING_TRIGGER.copy(padWorld);
 LANDING_APPROACH.copy(padWorld).add(new THREE.Vector3(0,185,0));
 LANDING_TOUCHDOWN.copy(padWorld).add(new THREE.Vector3(0,52,0));
 landingArmed=true;
 console.info('Estación Aurora modular montada: 1 núcleo, 4 plataformas y 4 corredores.');
}).catch(err=>console.warn('Estación modular no disponible: se mantiene la estación anterior.',err));
// Asteroides rocosos: siluetas irregulares, tonos minerales y relieve de bajo costo.
const asteroidMaterials=[0x77746e,0x8b7765,0x5d6571,0x948b80].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,flatShading:true,emissive:color,emissiveIntensity:.075}));
const asteroidShapes=[];
for(let variant=0;variant<5;variant++){
 const geo=new THREE.IcosahedronGeometry(1,1);
 const pos=geo.attributes.position;
 for(let j=0;j<pos.count;j++){
  const v=new THREE.Vector3().fromBufferAttribute(pos,j);
  const bump=1+.16*Math.sin(v.x*11+variant*2.7)*Math.cos(v.y*9-variant)+.12*Math.sin(v.z*13+variant);
  pos.setXYZ(j,v.x*bump,v.y*bump,v.z*bump);
 }
 geo.computeVertexNormals();asteroidShapes.push(geo);
}
// Distribución radial en todo el Sector Aurora (3 km), evitando el hangar.
// Aleatorio estable por sesión para no reconstruir el escenario en cada fotograma.
let MAP_CENTER_X=0,MAP_CENTER_Z=-650;const MAP_RADIUS=3000,MAP_SAFE_RADIUS=830;
function randomSectorPosition(minRadius=MAP_SAFE_RADIUS,maxRadius=MAP_RADIUS-100){
 // Distribución volumétrica uniforme dentro de una corona esférica:
 // cubre arriba, abajo y todos los lados sin concentrar objetos en el ecuador.
 const angle=Math.random()*Math.PI*2;
 const vertical=2*Math.random()-1;
 const horizontal=Math.sqrt(1-vertical*vertical);
 const radius=Math.cbrt(minRadius**3+Math.random()*(maxRadius**3-minRadius**3));
 return new THREE.Vector3(
  MAP_CENTER_X+Math.cos(angle)*horizontal*radius,
  vertical*radius,
  MAP_CENTER_Z+Math.sin(angle)*horizontal*radius
 );
}
const asteroidField=new THREE.Group();scene.add(asteroidField);
for(let i=0;i<100;i++){
 const rock=new THREE.Mesh(asteroidShapes[i%asteroidShapes.length],asteroidMaterials[i%asteroidMaterials.length]);
 const radius=9+Math.random()*27;
 rock.scale.set(radius*(.8+Math.random()*.7),radius*(.65+Math.random()*.55),radius*(.8+Math.random()*.65));
 rock.position.copy(randomSectorPosition(850,2950));
 rock.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
 asteroidField.add(rock);
}
// Tres tipos de nave actuales: cada escalón duplica vida, daño y recompensas.
const TYPES={
 scout:{hp:35,damage:5,speed:120,xp:18,gold:10,loot:1,color:0xe65757},
 raider:{hp:70,damage:10,speed:150,xp:36,gold:20,loot:2,color:0xe78b45},
 sentinel:{hp:140,damage:20,speed:90,xp:72,gold:40,loot:4,color:0xb86bd9},destroyer:{hp:280,damage:35,speed:110,xp:130,gold:80,loot:6,color:0xff3d9b}
};
// Escalado limitado por nivel: los enemigos de Aurora siguen siendo accesibles
// para principiantes y ganan resistencia a medida que progresa el jugador.
function enemyDifficultyScale(){
 const level=Math.max(1,Math.floor(Number(player.level)||1));
 return Math.min(5,1+Math.max(0,level-1)*.10);
}
function enemyMaxHp(type){return Math.round(TYPES[type].hp*enemyDifficultyScale())}
function enemyRewardScale(){return Math.min(2.5,1+Math.max(0,(Number(player.level)||1)-1)*.035)}
const enemyKinds=[...Array(14).fill('scout'),...Array(14).fill('raider'),...Array(14).fill('sentinel'),...Array(14).fill('destroyer')]; // 28 enemigos activos por sector.
function randomEnemyHome(type){
 // Los fuertes tienden a estar más lejos, pero pueden aparecer en cualquier dirección.
 const min=type==='scout'?850:type==='raider'?1200:1700;
 return randomSectorPosition(min,2920);
}
const enemies=enemyKinds.map((type,i)=>{
 const t=TYPES[type],mesh=ship(t.color,type);scene.add(mesh);
 const home=randomEnemyHome(type);mesh.position.copy(home);mesh.visible=type==='scout'||type==='raider';
 const maxHp=enemyMaxHp(type);return {type,mesh,home,hp:maxHp,maxHp,dead:0,angle:i,fireTimer:1+Math.random()*2};
});
// Apariencia 3D opcional de los enemigos básicos (scout). El grupo original
// mantiene posición, IA, colisiones, disparos y recompensas intactos.
// Si aún no se ha subido el GLB, las naves originales siguen funcionando.
deferredModelLoad(modelLoader,'./assets/models/futuristic_spacecraft.glb?v=105',gltf=>{
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
// Apariencia 3D del segundo enemigo (raider). Solo sustituye la parte visual:
// conserva vida, daño, velocidad, IA, colisiones, disparos y recompensas.
deferredModelLoad(modelLoader,'./assets/models/sci_fi_combat_vessel.glb?v=113',gltf=>{
 const original=gltf.scene;
 original.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 const box=new THREE.Box3().setFromObject(original);
 const size=box.getSize(new THREE.Vector3());
 const center=box.getCenter(new THREE.Vector3());
 const maxSpan=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(maxSpan)||maxSpan<.001)return;
 for(const e of enemies){
  if(e.type!=='raider')continue;
  const visual=original.clone(true);
  visual.position.copy(center).multiplyScalar(-100/maxSpan);
  visual.scale.setScalar(100/maxSpan);
  const pivot=new THREE.Group();
  pivot.rotation.y=0; // Orientación del modelo de combate.
  pivot.add(visual);
  e.mesh.add(pivot);
  for(const child of e.mesh.children)if(child!==pivot)child.visible=false;
 }
},undefined,err=>console.warn('Modelo raider GLB no disponible; se conserva la nave básica original.',err));
// Apariencia 3D del tercer enemigo (sentinel). Solo sustituye la parte visual:
// conserva vida, daño, velocidad, IA, colisiones, disparos y recompensas.
deferredModelLoad(modelLoader,'./assets/models/raider_spacecraft.glb?v=112',gltf=>{
 const original=gltf.scene;
 original.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 const box=new THREE.Box3().setFromObject(original);
 const size=box.getSize(new THREE.Vector3());
 const center=box.getCenter(new THREE.Vector3());
 const maxSpan=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(maxSpan)||maxSpan<.001)return;
 for(const e of enemies){
  if(e.type!=='sentinel')continue;
  const visual=original.clone(true);
  visual.position.copy(center).multiplyScalar(-100/maxSpan);
  visual.scale.setScalar(100/maxSpan);
  const pivot=new THREE.Group();
  pivot.rotation.y=0; // Orientación del modelo raider conservada.
  pivot.add(visual);
  e.mesh.add(pivot);
  for(const child of e.mesh.children)if(child!==pivot)child.visible=false;
 }
},undefined,err=>console.warn('Modelo sentinel GLB no disponible; se conserva la nave básica original.',err));
// Dos drones de apoyo: acompañan al jugador y disparan proyectiles reales.
const supportDrones=[];
const MAX_DRONES=8;
// Los primeros dos mantienen su precio original; los siguientes son progresión futura.
const DRONE_PRICES=[100,200,5000,20000,80000,300000,1000000,4000000];
const EXPLORER_PRICE=DRONE_PRICES[7]*2;
player.explorerDrone=player.explorerDrone===true;
player.explorerRangeLevel=Math.max(1,Math.min(10,Math.floor(Number(player.explorerRangeLevel)||1)));
function explorerRange(){return 450+player.explorerRangeLevel*100}
function explorerUpgradePrice(){const raw=4000000*Math.pow(player.explorerRangeLevel/9,2);return Math.round(raw/(raw<100000?10000:100000))*(raw<100000?10000:100000)}
player.droneCount=Math.max(0,Math.min(MAX_DRONES,Math.floor(Number(player.droneCount)||0)));
player.droneFormation=player.droneFormation==='shield'?'shield':'fan';
function ownedDrones(){return player.droneCount}
for(let i=0;i<MAX_DRONES;i++){
 const side=i%2===0?-1:1;
 const drone=new THREE.Group();
 const shell=new THREE.Mesh(new THREE.OctahedronGeometry(11,0),new THREE.MeshStandardMaterial({color:0x748da7,metalness:.65,roughness:.3,emissive:0x102d4c}));
 shell.scale.set(1.4,.55,1.7);drone.add(shell);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(4,8,6),new THREE.MeshBasicMaterial({color:0x3be7ff}));eye.position.z=-14;drone.add(eye);
 for(const wing of[-1,1]){const fin=new THREE.Mesh(new THREE.BoxGeometry(13,2,17),new THREE.MeshStandardMaterial({color:0x243c59,metalness:.6,roughness:.3}));fin.position.x=wing*16;drone.add(fin)}
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(3,4,18,8),new THREE.MeshStandardMaterial({color:0x365c86,metalness:.75,roughness:.3,emissive:0x063f72}));muzzle.rotation.x=Math.PI/2;muzzle.position.z=-18;drone.add(muzzle);
 drone.scale.setScalar(0.6); // 40% menos tamaño visual, sin alterar disparos ni formación.
 scene.add(drone);supportDrones.push({mesh:drone,side,rank:Math.floor(i/2)});
}
// Noveno dron especial: mascota exploradora independiente de los ocho de combate.
const explorerMesh=new THREE.Group();
const explorerShell=new THREE.Mesh(new THREE.OctahedronGeometry(13,1),new THREE.MeshStandardMaterial({color:0xe3ad43,metalness:.6,roughness:.3,emissive:0x69410d,emissiveIntensity:.35}));
explorerShell.scale.set(1.1,.7,1.4);explorerMesh.add(explorerShell);
const explorerEye=new THREE.Mesh(new THREE.SphereGeometry(5,12,8),new THREE.MeshBasicMaterial({color:0x6effc8}));
explorerEye.position.z=-15;explorerMesh.add(explorerEye);
explorerMesh.scale.setScalar(.6);explorerMesh.visible=false;scene.add(explorerMesh);
// El GLB es exclusivamente visual: se conserva la malla raíz para el seguimiento, disparo y recogida.
deferredModelLoad(modelLoader,'./assets/models/scifidrone.glb?v=105',gltf=>{
 const visual=gltf.scene;
 visual.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(visual);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<.001)return;
 const pivot=new THREE.Group();
 const scale=90/longest; // escala legible en móvil, normalizada al tamaño real del GLB
 visual.scale.setScalar(scale);
 visual.position.copy(center).multiplyScalar(-scale);
 pivot.add(visual);
 // Detalles azul eléctrico y violeta, conservando las texturas originales de Sloyd.
 visual.traverse(part=>{
  if(!part.isMesh)return;
  const usesMaterialArray=Array.isArray(part.material);
  const materials=usesMaterialArray?part.material:[part.material];
  const tintedMaterials=materials.map(mat=>{
   if(!mat)return mat;
   const tinted=mat.clone();
   if(tinted.color){
    const hue=tinted.color.clone();
    const light=hue.r*.2126+hue.g*.7152+hue.b*.0722;
    if(light>.15 && light<.78)tinted.color.lerp(new THREE.Color(0x7cb8e8),.17);
   }
   if('emissive' in tinted){
    tinted.emissive=new THREE.Color(0x123f8e);
    tinted.emissiveIntensity=.18;
   }
   return tinted;
  });
  // Una malla de material único no puede recibir un array: sin grupos de
  // geometría Three.js no la dibuja, aunque continúe existiendo y moviéndose.
  part.material=usesMaterialArray?tintedMaterials:tintedMaterials[0];
 });
 const glow=new THREE.PointLight(0x30baff,3.5,55);
 glow.position.set(0,0,-12);
 pivot.add(glow);
 // Mantener un núcleo visible aunque el GLB tenga materiales incompatibles
 // o sea descartado por el frustum culling del navegador móvil.
 visual.traverse(part=>{
  if(!part.isMesh)return;
  part.visible=true;
  part.frustumCulled=false;
  const mats=Array.isArray(part.material)?part.material:[part.material];
  for(const mat of mats)if(mat){
   mat.side=THREE.DoubleSide;
   mat.transparent=false;
   mat.opacity=1;
   mat.depthWrite=true;
   mat.needsUpdate=true;
  }
 });
 explorerMesh.add(pivot);
 explorerMesh.scale.setScalar(1);
 // El núcleo permanece como respaldo visual detrás del GLB.
 explorerShell.material.color.setHex(0x2279c8);
 explorerShell.material.emissive.setHex(0x0753a0);
 explorerShell.scale.set(.68,.44,.78);
 explorerEye.material.color.setHex(0x65edff);
 explorerEye.position.z=-9;
 explorerEye.scale.setScalar(.65);
},undefined,error=>{console.warn('No se pudo cargar scifidrone.glb; se conserva el modelo provisional',error);lootToast('⚠️ No se pudo cargar el modelo 3D de la mascota');});
// Movimiento de compañía: paseos suaves alrededor de la nave, con pequeñas pausas.
const explorerCompanion={
 nextChange:0,destination:new THREE.Vector3(),initialized:false,targetDrop:null
};
function updateExplorer(dt,now){
 explorerMesh.visible=player.explorerDrone&&!docked&&!landing;
 if(!explorerMesh.visible){explorerCompanion.initialized=false;return}
 const c=explorerCompanion,t=now*.001,range=explorerRange();
 const radius=Math.max(120,range-45);
 if(!c.initialized){
  explorerMesh.position.copy(playerMesh.position).add(new THREE.Vector3(65,24,-40));
  c.destination.copy(explorerMesh.position);
  c.nextChange=0;c.initialized=true;
 }
 // Priorizar recursos dentro del alcance adquirido, aunque estén lejos del dron.
 let nearest=null,best=Infinity;
 for(const drop of drops){
  if(drop.mesh.position.distanceTo(playerMesh.position)>range)continue;
  const distance=drop.mesh.position.distanceTo(explorerMesh.position);
  if(distance<best){best=distance;nearest=drop}
 }
 c.targetDrop=nearest;
 if(!nearest&&(t>=c.nextChange||explorerMesh.position.distanceTo(c.destination)<30)){
  const angle=Math.random()*Math.PI*2;
  const r=radius*(.28+Math.random()*.57);
  c.destination.copy(playerMesh.position).add(new THREE.Vector3(
   Math.cos(angle)*r,(Math.random()-.5)*100,Math.sin(angle)*r
  ));
  c.nextChange=t+5+Math.random()*6;
 }
 // El objetivo del botín cambia dinámicamente; la exploración normal usa destinos estables.
 const target=nearest?nearest.mesh.position:c.destination;
 const distanceToPlayer=explorerMesh.position.distanceTo(playerMesh.position);
 // Cuando la nave se desplaza, el dron regresa hacia el radio de cobertura.
 let goal=target;
 // Si está recogiendo, permitirle llegar al recurso dentro del radio comprado.
 // Solo volver a la nave cuando no existe un objetivo válido o ya quedó muy lejos.
 if(distanceToPlayer>radius&&!nearest){
  goal=playerMesh.position.clone().addScaledVector(
   explorerMesh.position.clone().sub(playerMesh.position).normalize(),radius*.72);
  c.nextChange=0;
 } else if(distanceToPlayer>range+90){
  goal=playerMesh.position.clone().addScaledVector(
   explorerMesh.position.clone().sub(playerMesh.position).normalize(),range*.55);
  c.nextChange=0;
 }
 const motion=goal.clone().sub(explorerMesh.position);
 const distance=motion.length();
 const speed=nearest?Math.min(420,180+distance*.55):Math.min(235,85+distance*.35);
 if(distance>2)explorerMesh.position.addScaledVector(motion,Math.min(distance,speed*dt)/distance);
 if(distanceToPlayer>range+260)explorerMesh.position.copy(playerMesh.position).add(new THREE.Vector3(45,25,-35));
 if(distance>8){
  const desiredYaw=Math.atan2(-motion.x,-motion.z);
  explorerMesh.rotation.y+=Math.atan2(Math.sin(desiredYaw-explorerMesh.rotation.y),Math.cos(desiredYaw-explorerMesh.rotation.y))*Math.min(1,dt*3);
 }
 explorerMesh.rotation.z=Math.sin(t*1.6)*.055;
 explorerMesh.rotation.x=Math.sin(t*1.15)*.035;
}
// Sustituye la geometría provisional cuando esté disponible el GLB de Sloyd.
// Conserva el cañón lógico, la formación, los disparos y las compras existentes.
deferredModelLoad(modelLoader,'./assets/models/sci_fi_fighter_spacecraft.glb?v=111',gltf=>{
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
const formationBtn=$('formationBtn');
function refreshFormationButton(){
 if(!formationBtn)return;
 const shield=player.droneFormation==='shield';
 formationBtn.textContent=shield?'🛡️':'🔄';
 formationBtn.title=shield?'Escudo giratorio activo · Cambiar a abanico':'Abanico activo · Cambiar a escudo giratorio';
 formationBtn.setAttribute('aria-label',formationBtn.title);
 formationBtn.setAttribute('aria-pressed',String(shield));
}
if(formationBtn)formationBtn.onclick=()=>{
 player.droneFormation=player.droneFormation==='shield'?'fan':'shield';
 save();refreshFormationButton();
 lootToast(player.droneFormation==='shield'?'🛡️ Formación: Escudo giratorio':'🤖 Formación: Abanico');
};
refreshFormationButton();
function updateSupportDrones(dt,now){
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const up=new THREE.Vector3().crossVectors(right,forward).normalize();
 for(let i=0;i<supportDrones.length;i++){
  const d=supportDrones[i];d.mesh.visible=i<ownedDrones();if(!d.mesh.visible)continue;
  let desired;
  if(player.droneFormation==='shield'){
   // Dron central fijo y hasta siete drones girando a su alrededor.
   // El radio compacto evita tapar la nave y mantiene el conjunto delante.
   const count=ownedDrones();
   desired=playerMesh.position.clone().addScaledVector(forward,125);
   if(i>0){
    const orbitCount=Math.max(1,count-1);
    const angle=now*.00065+(i-1)*Math.PI*2/orbitCount;
    const radius=66;
    desired.addScaledVector(right,Math.cos(angle)*radius)
     .addScaledVector(up,Math.sin(angle)*radius);
   }
   desired.addScaledVector(up,12);
  }else{
   const pair=Math.floor(i/2);
   const sideOffset=[78,135,195,250][pair];
   const backOffset=[-125,-165,-190,-210][pair];
   desired=playerMesh.position.clone().addScaledVector(right,d.side*sideOffset).addScaledVector(forward,-backOffset);
   desired.addScaledVector(up,14+Math.sin(now*.002+i)*4);
  }
  d.mesh.position.lerp(desired,Math.min(1,dt*6));d.mesh.rotation.y=yaw;
 }
}
// Disparo manual sincronizado: cada dron copia la mira y la dispersión de la nave.
function fireSupportDrones(aimPoint,locked,noseDir){
 const count=ownedDrones();if(!count&&!player.explorerDrone)return;
 for(let i=0;i<count+(player.explorerDrone?1:0);i++){
  const d=i<count?supportDrones[i]:{mesh:explorerMesh};if(!d.mesh.visible)continue;
  const start=d.mesh.position.clone().addScaledVector(noseDir,26);
  const destination=aimPoint.clone();
  if(locked){
   const spread=13;
   destination.x+=(Math.random()-.5)*spread*2;
   destination.y+=(Math.random()-.5)*spread*2;
   destination.z+=(Math.random()-.5)*spread*2;
  }
  const direction=destination.sub(start).normalize();
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,48,7),new THREE.MeshBasicMaterial({color:0x49d8ff,transparent:true,opacity:.95,depthWrite:false}));
  bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  bolt.position.copy(start);scene.add(bolt);
  shots.push({mesh:bolt,vel:direction.multiplyScalar(1150),life:1.65,damage:player.attack*.2});
 }
}
// Proyectiles enemigos independientes de los disparos del jugador.
const enemyShots=[];
const enemyShotGeometry=new THREE.CylinderGeometry(2.8,2.8,44,8);
const enemyShotMaterials={scout:new THREE.MeshBasicMaterial({color:0xff5757}),raider:new THREE.MeshBasicMaterial({color:0xffa43b}),sentinel:new THREE.MeshBasicMaterial({color:0xc475ff})};
function enemyFire(e){
 const t=TYPES[e.type];
 const start=e.mesh.position.clone();
 const target=playerMesh.position.clone().add(new THREE.Vector3((Math.random()-.5)*75,(Math.random()-.5)*55,(Math.random()-.5)*75));
 const dir=target.sub(start).normalize();
 const mesh=new THREE.Mesh(enemyShotGeometry,enemyShotMaterials[e.type]);mesh.position.copy(start).addScaledVector(dir,48);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(mesh);
 enemyShots.push({mesh,velocity:dir.multiplyScalar(e.type==='sentinel'?1050:1250),life:1.8,damage:t.damage});
}
function updateEnemyShots(dt){
 for(let i=enemyShots.length-1;i>=0;i--){
  const p=enemyShots[i];p.mesh.position.addScaledVector(p.velocity,dt);p.life-=dt;
  if(!docked&&!landing&&!(activeSector==='aurora'&&inSafeZone(playerMesh.position))&&p.mesh.position.distanceTo(playerMesh.position)<45){
   applyPlayerDamage(Math.max(1,p.damage-player.defense*.25));p.life=0;
  }
  if(p.life<=0){scene.remove(p.mesh);enemyShots.splice(i,1)}
 }
}
const shots=[];function nearest(){let b=null,d=650;for(const e of enemies){if(e.dead)continue;const x=e.mesh.position.distanceTo(playerMesh.position);if(x<d){d=x;b=e}}return b}
let fireCd=0,skillCd=0,fireHeld=false,firePointerId=null;
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
  if(distance>1200||distance<40||to.dot(forwardView)<=0)continue;
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
  const info={scout:['Explorador',1],raider:['Asaltante',3],sentinel:['Guardián',5]}[candidate.type]||['Enemigo',1];
  $('targetName').textContent=info[0]+' · Nv. '+Math.max(info[1],Math.floor(Number(player.level)||1));
  $('targetHpText').textContent=Math.max(0,Math.ceil(candidate.hp))+'/'+candidate.maxHp;
  $('targetHpFill').style.width=(100*Math.max(0,Math.min(1,candidate.hp/candidate.maxHp)))+'%';
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
  shots.push({mesh,vel:dir.multiplyScalar(1150),life:1.65,damage:player.attack*mult*.5*classDamageMultiplier()*classCritMultiplier()});
 }
 fireSupportDrones(aimPoint,!!lockedEnemy,noseDir);
 fireCd=classAbilityActive('aurora')?.68/1.3:.68; // Sobrecarga aumenta la cadencia.
}
function xpNeed(){return 100+(player.level-1)*65}function gainXp(n){player.xp+=n;while(player.xp>=xpNeed()){player.xp-=xpNeed();player.level++;player.maxEnergy+=5;if(player.shipBaseStats){player.shipBaseStats.maxHp+=10;player.shipBaseStats.attack+=2;player.shipBaseStats.defense++;syncShipStats()}else{player.maxHp+=10;player.attack+=2;player.defense++}player.hp=player.maxHp;player.energy=player.maxEnergy;$('levelToast').innerHTML='⭐ NIVEL '+player.level+'<small>Sistemas de la nave mejorados</small>';$('levelToast').classList.remove('hidden');setTimeout(()=>$('levelToast').classList.add('hidden'),2200)}}
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
 const containers=[$('hangarDroneShop')].filter(Boolean);if(!containers.length)return;
 const count=ownedDrones(),price=DRONE_PRICES[count],max=count>=MAX_DRONES;
 const html='<div class="upgrade-card"><div><strong>🤖 Drones de combate · '+count+'/'+MAX_DRONES+'</strong><small>Cada dron agrega un láser extra a tu nave cuando disparas. Apunta hacia tu misma mira y conserva la misma precisión.</small><small>'+(max?'Ocho drones equipados':'Siguiente dron: '+price.toLocaleString('es')+' créditos')+'</small></div><button id="buyDroneBtn" '+(max||player.gold<price?'disabled':'')+'>'+(max?'Máximo':'Comprar')+'</button></div>';
 const rangeLevel=player.explorerRangeLevel,rangeMax=rangeLevel>=10,rangePrice=explorerUpgradePrice();
 const explorerHtml='<div class="upgrade-card"><div><strong>🛰️ Dron Explorador · 9.º especial</strong><small>Recoge automáticamente los materiales de los enemigos y agrega un láser extra a tu nave cuando disparas.</small><small>'+(player.explorerDrone?'Adquirido y equipado':'Precio: '+EXPLORER_PRICE.toLocaleString('es')+' créditos · Requiere 8 drones')+'</small></div><button class="buyExplorerBtn" '+(player.explorerDrone||count<8||player.gold<EXPLORER_PRICE?'disabled':'')+'>'+(player.explorerDrone?'Equipado':'Comprar')+'</button></div>';
 const rangeHtml='<div class="upgrade-card"><div><strong>📡 Alcance del Explorador · Nivel '+rangeLevel+'/10</strong><small>Detecta cajas hasta '+explorerRange().toLocaleString('es')+' m. Cada mejora añade 100 m de alcance.</small><small>'+(rangeMax?'Alcance máximo conseguido':'Siguiente nivel: '+rangePrice.toLocaleString('es')+' créditos')+'</small></div><button class="buyExplorerRange" '+(!player.explorerDrone||rangeMax||player.gold<rangePrice?'disabled':'')+'>'+(rangeMax?'Máximo':'Mejorar')+'</button></div>';
 for(const el of containers){el.innerHTML=html.replace('id="buyDroneBtn"','class="buyDroneBtn"')+explorerHtml+rangeHtml;
 el.querySelector('.buyExplorerRange').onclick=()=>{
  const price=explorerUpgradePrice();if(!player.explorerDrone||player.explorerRangeLevel>=10||player.gold<price)return;
  player.gold-=price;player.explorerRangeLevel++;save();hud();renderDrones();lootToast('📡 Explorador: alcance '+explorerRange()+' m');if(docked)hangarRefresh();
 };
 el.querySelector('.buyExplorerBtn').onclick=()=>{
  if(player.explorerDrone||ownedDrones()<8||player.gold<EXPLORER_PRICE)return;
  player.gold-=EXPLORER_PRICE;player.explorerDrone=true;save();hud();renderDrones();lootToast('🛰️ Dron Explorador equipado');
  if(docked)hangarRefresh();
 };el.querySelector('.buyDroneBtn').onclick=()=>{
  const owned=ownedDrones(),cost=DRONE_PRICES[owned];
  if(owned>=MAX_DRONES||player.gold<cost)return;
  player.gold-=cost;player.droneCount=owned+1;save();hud();renderDrones();
  lootToast('🤖 Dron '+player.droneCount+' adquirido y equipado');
  if(docked)hangarRefresh();
 };}
}
// Flota: las mejoras generales permanecen en el perfil; las especializaciones son por nave.
const SHIP_TYPES={
 aurora:{name:'Aurora',level:1,cost:0,hp:1,attack:1,defense:1,speed:1,description:'Equilibrada · tu nave original'},
 titan:{name:'Titán',level:15,cost:2000000,hp:1.8,attack:.85,defense:1.5,speed:.75,description:'Tanque · casco y escudos resistentes'},
 espectro:{name:'Espectro',level:25,cost:2000000,hp:.7,attack:1.35,defense:.65,speed:1.4,description:'Asalto · alta velocidad y daño'}
};
player.ownedShips=player.ownedShips&&typeof player.ownedShips==='object'?player.ownedShips:{};
player.ownedShips.aurora=true;
player.shipId=SHIP_TYPES[player.shipId]&&player.ownedShips[player.shipId]?player.shipId:'aurora';
player.shipSpecializations=player.shipSpecializations&&typeof player.shipSpecializations==='object'?player.shipSpecializations:{};
// Habilidades de clase: duración y recarga solo durante la sesión de vuelo.
const SHIP_ABILITIES={
 aurora:{name:'Sobrecarga',icon:'⚡',duration:5,cooldown:20,energy:40},
 titan:{name:'Fortaleza',icon:'🛡️',duration:6,cooldown:25,energy:55},
 espectro:{name:'Furia',icon:'🔥',duration:5,cooldown:25,energy:65}
};
const SPECIAL_UPGRADES={
 aurora:[['energy','Reactor eficiente','Regeneración de energía +4 % por nivel'],['overload','Sobrecarga avanzada','Duración +0,25 s por nivel'],['shield','Escudos recuperadores','Recupera 0,3 % del casco por segundo durante Sobrecarga']],
 titan:[['armor','Blindaje pesado','Reducción de daño +1 % por nivel'],['fortress','Fortaleza extendida','Duración +0,3 s por nivel'],['repair','Reparación táctica','Regenera 0,15 % del casco por segundo fuera de combate']],
 espectro:[['crit','Precisión letal','Probabilidad de crítico +1 % por nivel'],['fury','Furia prolongada','Duración +0,25 s por nivel'],['evasion','Maniobras evasivas','Probabilidad de evasión +0,8 % por nivel']]
};
let classAbilityCd=0,classAbilityTime=0,lastHitAt=-100;
function specialLevel(key,id=player.shipId){
 const levels=player.shipSpecializations?.[id]||{};
 return Math.max(0,Math.min(10,Math.floor(Number(levels[key])||0)));
}
function abilityDuration(){
 const a=SHIP_ABILITIES[player.shipId],key=player.shipId==='aurora'?'overload':player.shipId==='titan'?'fortress':'fury';
 return a.duration+specialLevel(key)*(player.shipId==='titan'?.3:.25);
}
function activateClassAbility(){
 if(classAbilityTime>0||docked||landing||inSafeZone(playerMesh.position))return;
 const a=SHIP_ABILITIES[player.shipId];
 if(player.energy<a.energy){lootToast('🔋 Energía insuficiente: '+a.energy+' necesarios');return}
 player.energy-=a.energy;classAbilityTime=abilityDuration();hud();
 lootToast(a.icon+' '+a.name+' activada');
}
function classAbilityActive(id){return player.shipId===id&&classAbilityTime>0}
function applyPlayerDamage(amount){
 if(docked||landing||inSafeZone(playerMesh.position))return;
 if(player.shipId==='espectro'&&Math.random()<specialLevel('evasion')*.008)return;
 let damage=Math.max(0,amount);
 if(player.shipId==='titan')damage*=1-(0.1+specialLevel('armor')*.01);
 if(classAbilityActive('titan'))damage*=.3;
 if(classAbilityActive('espectro'))damage*=1.3;
 player.hp=Math.max(0,player.hp-damage);lastHitAt=performance.now()/1000;
}
function classDamageMultiplier(){
 return classAbilityActive('espectro')?1.6:1;
}
function classCritMultiplier(){
 return player.shipId==='espectro'&&Math.random()<.15+specialLevel('crit')*.01?1.5:1;
}
function updateClassAbility(dt){
 classAbilityCd=Math.max(0,classAbilityCd-dt);
 classAbilityTime=Math.max(0,classAbilityTime-dt);
 if(classAbilityActive('aurora')&&specialLevel('shield')>0)player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.003*specialLevel('shield')*dt);
 if(player.shipId==='titan'&&specialLevel('repair')>0&&performance.now()/1000-lastHitAt>5&&!docked)
  player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.0015*specialLevel('repair')*dt);
 const btn=$('classAbilityBtn'),label=$('classAbilityCd');
 if(btn){const a=SHIP_ABILITIES[player.shipId];btn.firstChild.textContent=a.icon;btn.setAttribute('aria-label',a.name);btn.title=a.name;btn.disabled=docked||landing||classAbilityTime>0||player.energy<a.energy;
 if(label)label.textContent=classAbilityTime>0?Math.ceil(classAbilityTime)+'s':player.energy<a.energy?a.energy+'⚡':''}
}
function renderSpecialUpgrades(){
 const fleet=$('hangarShipFleet');if(!fleet)return;
 let box=$('hangarSpecialUpgrades');
 if(!box){box=document.createElement('div');box.id='hangarSpecialUpgrades';fleet.after(box)}
 box.innerHTML='<h3>✨ Mejoras exclusivas · '+SHIP_TYPES[player.shipId].name+'</h3>'+SPECIAL_UPGRADES[player.shipId].map(([key,name,desc])=>{
  const level=specialLevel(key),cost=20000*(level+1),material=2+level,can=level<10&&player.gold>=cost&&(Number(player.loot?.aleacion)||0)>=material;
  return '<div class="upgrade-card"><div><strong>'+name+'</strong><small>'+desc+'</small><small>Nivel '+level+'/10 · '+(level===10?'Máximo':cost.toLocaleString('es')+' créditos + '+material+' aleación')+'</small></div><button data-special="'+key+'" '+(!can?'disabled':'')+'>'+(level===10?'Máximo':'Mejorar')+'</button></div>';
 }).join('');
 box.querySelectorAll('button[data-special]').forEach(b=>b.onclick=()=>{
  const key=b.dataset.special,level=specialLevel(key),cost=20000*(level+1),material=2+level;
  if(level>=10||!SPECIAL_UPGRADES[player.shipId].some(x=>x[0]===key)||player.gold<cost||(Number(player.loot?.aleacion)||0)<material)return;
  player.gold-=cost;player.loot.aleacion-=material;
  if(!player.shipSpecializations[player.shipId])player.shipSpecializations[player.shipId]={};
  player.shipSpecializations[player.shipId][key]=level+1;
  save();hud();renderInventory();hangarRefresh();
 });
}
function shipBonuses(id){
 const t=SHIP_TYPES[id]||SHIP_TYPES.aurora;
 return {maxHp:Math.round(player.shipBaseStats.maxHp*(t.hp-1)),
  attack:Math.round(player.shipBaseStats.attack*(t.attack-1)),
  defense:Math.round(player.shipBaseStats.defense*(t.defense-1)),
  speed:Math.round(player.shipBaseStats.speed*(t.speed-1))};
}
function ensureShipBaseStats(){
 if(player.shipBaseStats)return;
 player.shipBaseStats={maxHp:player.maxHp,attack:player.attack,defense:player.defense,speed:player.speed};
}
function syncShipStats(){
 ensureShipBaseStats();
 const bonus=shipBonuses(player.shipId);
 const ratio=player.maxHp>0?player.hp/player.maxHp:1;
 player.maxHp=Math.max(1,player.shipBaseStats.maxHp+bonus.maxHp);
 player.attack=Math.max(1,player.shipBaseStats.attack+bonus.attack);
 player.defense=Math.max(0,player.shipBaseStats.defense+bonus.defense);
 player.speed=Math.max(50,player.shipBaseStats.speed+bonus.speed);
 player.hp=Math.max(1,Math.min(player.maxHp,Math.round(ratio*player.maxHp)));
}
function changeShip(id){
 if(!SHIP_TYPES[id]||!player.ownedShips[id]||player.shipId===id)return;
 ensureShipBaseStats();
 player.shipId=id;classAbilityCd=0;classAbilityTime=0;syncShipStats();syncPlayerShipVisuals();save();hud();renderShips();hangarRefresh();
 lootToast('🚀 Nave '+SHIP_TYPES[id].name+' equipada');
}
function renderShips(){
 const hangarShop=$('hangarUpgradeShop');if(!hangarShop)return;
 let fleet=$('hangarShipFleet');
 if(!fleet){fleet=document.createElement('div');fleet.id='hangarShipFleet';hangarShop.parentElement.insertBefore(fleet,hangarShop)}
 fleet.innerHTML='<h3>🚀 Flota de naves</h3>'+Object.entries(SHIP_TYPES).map(([id,t])=>{
  const owned=!!player.ownedShips[id],selected=player.shipId===id,canBuy=player.level>=t.level&&player.gold>=t.cost;
  return '<div class="upgrade-card"><div><strong>'+t.name+'</strong><small>'+t.description+'</small><small>'+(owned?'Adquirida':('Nivel '+t.level+' · '+t.cost.toLocaleString('es')+' créditos'))+'</small></div><button data-ship="'+id+'" '+(selected||(!owned&&!canBuy)?'disabled':'')+'>'+(selected?'Equipada':owned?'Equipar':'Comprar')+'</button></div>';
 }).join('');
 fleet.querySelectorAll('button[data-ship]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.ship,t=SHIP_TYPES[id];if(!t)return;
  if(!player.ownedShips[id]){
   if(player.level<t.level||player.gold<t.cost)return;
   player.gold-=t.cost;player.ownedShips[id]=true;
  }
  changeShip(id);save();renderShips();hangarRefresh();
 });
 renderSpecialUpgrades();
}
ensureShipBaseStats();
// El guardado ya contiene las estadísticas de la nave equipada: no aplicar el bono otra vez al cargar.
// Normalizar partidas antiguas cuyo perfil aún no tiene valores base fiables.
if(player.shipId!=='aurora'){
 const bonus=shipBonuses(player.shipId);
 const expected=player.shipBaseStats.maxHp+bonus.maxHp;
 if(Math.abs(player.maxHp-expected)>2){
  const t=SHIP_TYPES[player.shipId];
  for(const [stat,mult] of Object.entries({maxHp:t.hp,attack:t.attack,defense:t.defense,speed:t.speed})){
   const value=Number(player[stat]);if(Number.isFinite(value))player.shipBaseStats[stat]=Math.max(stat==='maxHp'?1:0,Math.round(value/mult));
  }
 }
}
function renderUpgrades(){
 const containers=[$('hangarUpgradeShop')].filter(Boolean);if(!containers.length)return;
 const html=UPGRADES.map(u=>{
  const lv=upgradeLevel(u.id),max=lv>=10,need=u.base+lv,price=u.credits*(lv+1);
  const available=(Number(player.loot[u.material])||0)>=need&&player.gold>=price;
  const resource=LOOT_TYPES.find(t=>t.id===u.material);
  return '<div class="upgrade-card"><div><strong>'+u.icon+' '+u.name+'</strong><small>Nivel '+lv+'/10 · +'+u.amount+' '+({maxHp:'casco',defense:'escudo',attack:'potencia',speed:'velocidad'}[u.stat])+' por nivel</small><small>'+ (max?'Mejora máxima':'Costo: '+need+' '+resource.name+' + '+price+' créditos')+'</small></div><button data-upgrade="'+u.id+'" '+(max||!available?'disabled':'')+'>'+(max?'Máximo':'Mejorar')+'</button></div>';
 }).join('');
 const missileLv=upgradeLevel('missiles'),missileCost=missileUpgradeCost();
 const missileAvailable=player.gold>=missileCost.credits&&(Number(player.loot.aleacion)||0)>=missileCost.material;
 const missileHtml='<div class="upgrade-card"><div><strong>🚀 Lanzamisiles múltiples</strong><small>Nivel '+missileLv+'/9 · '+(missileLv+1)+' misil(es) por lanzamiento, desde ambos lados de la nave.</small><small>'+(missileLv>=9?'Mejora máxima':'Costo: '+missileCost.material+' aleación + '+missileCost.credits.toLocaleString('es')+' créditos')+'</small></div><button class="buyMissileUpgrade" '+(missileLv>=9||!missileAvailable?'disabled':'')+'>'+(missileLv>=9?'Máximo':'Mejorar')+'</button></div>';
 for(const el of containers){el.innerHTML=html+missileHtml;el.querySelectorAll('button[data-upgrade]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgrade));
 el.querySelector('.buyMissileUpgrade').onclick=()=>{
  const lv=upgradeLevel('missiles'),cost=missileUpgradeCost();
  if(lv>=9||player.gold<cost.credits||(Number(player.loot.aleacion)||0)<cost.material)return;
  player.gold-=cost.credits;player.loot.aleacion-=cost.material;player.upgrades.missiles=lv+1;
  missionEvent('upgrade');save();hud();renderUpgrades();renderInventory();if(docked)hangarRefresh();
  lootToast('🚀 Misiles por lanzamiento: '+missileCount());
 };
 }
}
function buyUpgrade(id){
 const u=UPGRADES.find(v=>v.id===id);if(!u)return;
 const lv=upgradeLevel(id),need=u.base+lv,price=u.credits*(lv+1);
 if(lv>=10||(Number(player.loot[u.material])||0)<need||player.gold<price)return;
 player.loot[u.material]-=need;player.gold-=price;player.upgrades[id]=lv+1;
 if(player.shipBaseStats){player.shipBaseStats[u.stat]+=u.amount;syncShipStats()}
 else player[u.stat]+=u.amount;
 if(u.stat==='maxHp')player.hp=Math.min(player.maxHp,player.hp+u.amount);
 missionEvent('upgrade');save();hud();renderUpgrades();renderInventory();if(docked)hangarRefresh();
}
// Campaña inicial del Sector Aurora: progreso persistente por perfil.
const MISSIONS=[
 {title:'Primer contacto',description:'Destruye 5 exploradoras enemigas',goal:5,reward:500,xp:75},
 {title:'Recuperación espacial',description:'Recoge 3 cajas de botín',goal:3,reward:800,xp:110},
 {title:'Regreso a la base',description:'Atraca en la estación Aurora y compra una mejora',goal:2,reward:1500,xp:160}
];
player.quests=player.quests&&typeof player.quests==='object'?player.quests:{};
const campaign=player.quests.aurora&&typeof player.quests.aurora==='object'?player.quests.aurora:{index:0,progress:0,docked:false};
campaign.index=Math.max(0,Math.min(MISSIONS.length,Math.floor(Number(campaign.index)||0)));
campaign.progress=Math.max(0,Math.floor(Number(campaign.progress)||0));
campaign.docked=!!campaign.docked;
player.quests.aurora=campaign;
let questCollapsed=true;
function renderMission(){
 const el=$('questTracker'),toggle=$('questToggle');if(!el)return;
 el.classList.toggle('hidden',questCollapsed);
 toggle.textContent='📋';toggle.setAttribute('aria-expanded',String(!questCollapsed));toggle.setAttribute('aria-label',questCollapsed?'Abrir misiones':'Cerrar misiones');
 if(campaign.index>=MISSIONS.length){
  $('questTitle').textContent='🏆 Sector Aurora completado';
  $('questObjective').textContent='Las tres misiones iniciales están completas.';
  $('questProgressBar').style.width='100%';$('questReward').textContent='¡Buen trabajo!';return;
 }
 const m=MISSIONS[campaign.index];
 $('questTitle').textContent='🎯 '+(campaign.index+1)+'/3 · '+m.title;
 $('questObjective').textContent=m.description+(campaign.index===2?' · '+(campaign.docked?'Estación visitada':'Visita la estación'):'');
 $('questProgressBar').style.width=(100*Math.min(m.goal,campaign.progress)/m.goal)+'%';
 $('questReward').textContent=campaign.progress+'/'+m.goal+' · Premio: '+m.reward.toLocaleString('es')+' créditos + '+m.xp+' XP';
}
$('questToggle').onclick=()=>{questCollapsed=!questCollapsed;renderMission()};
function missionEvent(type){
 if(campaign.index>=MISSIONS.length)return;
 if(campaign.index===0&&type==='scout')campaign.progress++;
 else if(campaign.index===1&&type==='loot')campaign.progress++;
 else if(campaign.index===2){
  if(type==='dock'){campaign.docked=true;campaign.progress=Math.max(1,campaign.progress)}
  else if(type==='upgrade'&&campaign.docked)campaign.progress=2;
  else return;
 }else return;
 const m=MISSIONS[campaign.index];
 if(campaign.progress>=m.goal){
  player.gold+=m.reward;gainXp(m.xp);
  lootToast('🏆 '+m.title+' completada · +'+m.reward+' créditos · +'+m.xp+' XP');
  campaign.index++;campaign.progress=0;campaign.docked=false;
 }
 renderMission();save();
}
renderMission();
function renderInventory(){
 $('lootInventory').innerHTML=LOOT_TYPES.map(t=>'<div class="inventory-item"><span class="inventory-gem" style="background:#'+t.color.toString(16).padStart(6,'0')+'"></span><div><strong>'+t.name+'</strong><small>'+t.rarity+' · '+t.description+'</small></div><b>×'+(Math.max(0,Number(player.loot[t.id])||0))+'</b></div>').join('');
}
const drops=[];const dropGeo=new THREE.OctahedronGeometry(16,0);
// Caja 3D compartida para todas las rarezas. Si el GLB aún no existe,
// se conserva el botín original sin interrumpir el juego.
let lootCrateTemplate=null;
deferredModelLoad(modelLoader,'./assets/models/scificrate.glb?v=105',gltf=>{
 const template=gltf.scene;
 const box=new THREE.Box3().setFromObject(template);
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<.001)return;
 // Centrar ANTES de escalar, en un contenedor separado: evita desplazar
 // accidentalmente modelos exportados con origen fuera de su geometría.
 const pivot=new THREE.Group();template.position.sub(center);pivot.add(template);
 pivot.scale.setScalar(32/longest);
 lootCrateTemplate=pivot;
},undefined,()=>console.info('Caja GLB pendiente: botín original disponible.'));
function spawnLoot(e){
 const roll=Math.random(),item=LOOT_TYPES[roll<.53?0:roll<.81?1:roll<.96?2:3];
 const mesh=new THREE.Group();mesh.position.copy(e.mesh.position);mesh.position.y+=14;
 if(lootCrateTemplate){
  const crate=lootCrateTemplate.clone(true);mesh.add(crate);
  crate.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 }else{
  const fallback=new THREE.Mesh(dropGeo,new THREE.MeshBasicMaterial({color:item.color,depthTest:false}));
  fallback.renderOrder=5;mesh.add(fallback);
 }
 scene.add(mesh);
 // Sin marcador geométrico flotante: solo se ve la caja real.

 drops.push({mesh,item,age:0,baseY:mesh.position.y});
}
function lootToast(message){
 const el=$('lootToast');if(!el)return;
 el.style.setProperty('top','10px','important');el.style.setProperty('bottom','auto','important');
 el.textContent=message;el.classList.remove('hidden');
 clearTimeout(lootToast.timer);lootToast.timer=setTimeout(()=>el.classList.add('hidden'),2200);
}
function updateLoot(dt){
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.age+=dt;d.mesh.rotation.y+=dt*.65;d.mesh.rotation.z+=dt*.14;
  d.mesh.position.y=d.baseY+Math.sin(d.age*2.7)*8;
  if(d.mesh.position.distanceTo(playerMesh.position)<90||(player.explorerDrone&&explorerMesh.visible&&d.mesh.position.distanceTo(explorerMesh.position)<45)){
   player.loot[d.item.id]=(player.loot[d.item.id]||0)+1;
   lootToast('✦ '+d.item.name+' · '+d.item.rarity);
   scene.remove(d.mesh);d.mesh.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.isMesh&&o.geometry===dropGeo)o.material.dispose()});drops.splice(i,1);missionEvent('loot');save();
  }else if(d.age>90){scene.remove(d.mesh);d.mesh.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.isMesh&&o.geometry===dropGeo)o.material.dispose()});drops.splice(i,1)}
 }
}
function kill(e){const t=TYPES[e.type],reward=enemyRewardScale(),gold=Math.round(t.gold*reward),xp=Math.round(t.xp*reward);missionEvent(e.type);e.dead=performance.now()/1000+8;e.mesh.visible=false;player.gold+=gold;for(let i=0;i<t.loot;i++)spawnLoot(e);gainXp(xp);lootToast('+'+gold+' créditos · +'+xp+' XP · '+t.loot+' recursos');save()}
// Modelo 3D del misil. La geometría anterior permanece como respaldo.
let rocketTemplate=null;
deferredModelLoad(new GLTFLoader(),'./assets/models/rocket.glb?v=114',gltf=>{
 const model=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(model);
 const dimensions=bounds.getSize(new THREE.Vector3());
 const longest=Math.max(dimensions.x,dimensions.y,dimensions.z);
 if(!Number.isFinite(longest)||longest<.00001)throw new Error('Modelo de misil vacío');
 // Centrar el modelo y normalizar su eje longitudinal hacia +Y.
 const center=bounds.getCenter(new THREE.Vector3());
 model.position.sub(center);
 model.scale.setScalar(32/longest);
 rocketTemplate=model;
},undefined,error=>console.warn('Misil 3D no disponible; se conserva respaldo',error));
function createMissileMesh(){
 if(rocketTemplate){
  const group=new THREE.Group();
  group.add(rocketTemplate.clone(true));
  return group;
 }
 return new THREE.Mesh(new THREE.ConeGeometry(7,33,8),
  new THREE.MeshStandardMaterial({color:0xf3f3f3,emissive:0xff7629,emissiveIntensity:.7,metalness:.35,roughness:.4}));
}
// Efectos ligeros: una llama anclada al misil y una estela de 12 puntos.
const missileFlameGeometry=new THREE.ConeGeometry(5,23,7);
const missileFlameMaterial=new THREE.MeshBasicMaterial({color:0xff8526,transparent:true,opacity:.88,depthWrite:false});
function addMissileEffects(mesh){
 const flame=new THREE.Mesh(missileFlameGeometry,missileFlameMaterial);
 flame.rotation.z=Math.PI;flame.position.y=-23;
 mesh.add(flame);
 const positions=new Float32Array(12*3);
 for(let i=0;i<12;i++){positions[i*3]=mesh.position.x;positions[i*3+1]=mesh.position.y;positions[i*3+2]=mesh.position.z}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.LineBasicMaterial({color:0xffa34c,transparent:true,opacity:.8,depthWrite:false});
 const trail=new THREE.Line(geometry,material);
 trail.frustumCulled=false;scene.add(trail);
 return {flame,trail,positions};
}
function updateMissileEffects(p,dt){
 if(!p.missileEffects)return;
 const fx=p.missileEffects,coords=fx.positions;
 for(let j=coords.length-3;j>=3;j-=3){coords[j]=coords[j-3];coords[j+1]=coords[j-2];coords[j+2]=coords[j-1]}
 coords[0]=p.mesh.position.x;coords[1]=p.mesh.position.y;coords[2]=p.mesh.position.z;
 fx.trail.geometry.attributes.position.needsUpdate=true;
 fx.flame.scale.setScalar(.8+Math.random()*.45);
}
function removeMissileEffects(p){
 if(!p.missileEffects)return;
 const fx=p.missileEffects;scene.remove(fx.trail);fx.trail.geometry.dispose();fx.trail.material.dispose();
}
// Misil guiado: busca la fijación central, o avanza hacia la mira si no hay blanco.
function missileCount(){return 1+upgradeLevel('missiles')}
function missileUpgradeCost(){const lv=upgradeLevel('missiles');return {credits:500*(lv+1),material:2+lv}}
function skill(){
 if(skillCd>0||docked||landing||inSafeZone(playerMesh.position))return;
 updateTargetLock();
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const cameraDir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
 const target=lockedEnemy;
 const aim=target?target.mesh.position.clone():camera.position.clone().addScaledVector(cameraDir,1700);
 const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
 if(right.lengthSq()<.1)right.set(1,0,0);
 const count=missileCount();
 for(let i=0;i<count;i++){
  const up=new THREE.Vector3().crossVectors(right,forward).normalize();
  // Salva irregular: posición, rumbo, velocidad y guiado independientes.
  // Distribución angular sin parejas espejo y con variación en cada lanzamiento.
  const angle=(i*2.399963229728653+Math.random()*.95)%(Math.PI*2);
  const spread=.95+Math.random()*.85;
  const lateral=Math.cos(angle),vertical=Math.sin(angle);
  const start=playerMesh.position.clone().addScaledVector(forward,30+Math.random()*35)
   .addScaledVector(right,lateral*(45+Math.random()*55))
   .addScaledVector(up,vertical*(35+Math.random()*65));
  const dir=aim.clone().sub(start).normalize();
  const launchDir=dir.clone().multiplyScalar(.32)
   .addScaledVector(right,lateral*spread)
   .addScaledVector(up,vertical*spread*.85)
   .addScaledVector(forward,.28+Math.random()*.45).normalize();
  const missileSpeed=440+Math.random()*410;
  const missileGuideDelay=.42+Math.random()*.8;
  const mesh=createMissileMesh();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),launchDir);
  mesh.position.copy(start);scene.add(mesh);
  const missileEffects=addMissileEffects(mesh);
  shots.push({mesh,vel:launchDir.multiplyScalar(missileSpeed),life:5,damage:player.attack*3,missile:true,target,
   missileAim:target?null:aim.clone(),missileAge:0,missileSpeed,missileGuideDelay,missileEffects});
 }
 skillCd=7;
}
// Estación centrada en (0,0,-650), con radio de protección independiente del minimapa.
const SAFE_ZONE_CENTER=new THREE.Vector3(0,0,-650),SAFE_ZONE_RADIUS=760;
function inSafeZone(position){return position.distanceTo(SAFE_ZONE_CENTER)<SAFE_ZONE_RADIUS}
let lastZoneLabel='',zoneToastTimer=null;
function updateZone(){
 const safe=activeSector==='aurora'&&inSafeZone(playerMesh.position);
 const label=safe?'ESTACIÓN AURORA|Zona segura':activeSector==='belt'?'CINTURÓN PERDIDO|Sector de nivel 10+':'SECTOR AURORA|Espacio abierto';
 if(label!==lastZoneLabel){
  const [title,subtitle]=label.split('|'),el=$('targetInfo');
  el.replaceChildren(document.createTextNode(title),document.createElement('br'));
  const small=document.createElement('small');small.textContent=subtitle;el.appendChild(small);
  el.classList.toggle('outside-zone',!safe);
  el.classList.add('zone-visible');
  clearTimeout(zoneToastTimer);
  zoneToastTimer=setTimeout(()=>el.classList.remove('zone-visible'),2800);
  lastZoneLabel=label;
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
 // Mascota exploradora: punto celeste con borde blanco, distinto de los recursos.
 if(player.explorerDrone&&explorerMesh.visible){
  const pet=radarPoint(explorerMesh.position.x,explorerMesh.position.z);
  if(pet.inside){
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(pet.x,pet.y,4.5,0,Math.PI*2);ctx.stroke();
   dot(pet.x,pet.y,'#26edff',3.3);
  }
 }
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
 renderDrones();renderUpgrades();renderShips();
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
 hangarRefresh();missionEvent('dock');save();
}
// Solo aceptar una superficie horizontal realmente situada debajo de la nave.
// No usar posiciones antiguas si no existe una plataforma detectable.
function selectLandingPlatform(apply=false){
 if(!auroraModelReady)return false;
 if(modularStationReady){
  auroraStation.updateMatrixWorld(true);
  let nearest=null,best=Infinity;
  for(const pad of modularLandingPads){
   const bounds=new THREE.Box3().setFromObject(pad);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=Math.hypot(playerMesh.position.x-center.x,playerMesh.position.z-center.z);
   const deltaY=playerMesh.position.y-bounds.max.y;
   if(distance<155&&deltaY>=-30&&deltaY<240&&distance<best){
    best=distance;nearest={center,top:bounds.max.y};
   }
  }
  if(!nearest)return false;
  if(apply){
   const point=new THREE.Vector3(nearest.center.x,nearest.top,nearest.center.z);
   LANDING_TRIGGER.copy(point);
   LANDING_TOUCHDOWN.copy(point).add(new THREE.Vector3(0,37,0));
   LANDING_APPROACH.copy(point).add(new THREE.Vector3(0,155,0));
  }
  return true;
 }
 const origin=playerMesh.position.clone().add(new THREE.Vector3(0,18,0));
 const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,240);
 auroraStation.updateMatrixWorld(true);
 const hits=ray.intersectObject(auroraLandingModel,true);
 const hit=hits.find(h=>{
  if(!h.face)return false;
  const normal=h.face.normal.clone().transformDirection(h.object.matrixWorld);
  const drop=playerMesh.position.y-h.point.y;
  return normal.y>.88&&drop>=-12&&drop<220;
 });
 if(!hit)return false;
 if(apply){
  LANDING_TRIGGER.copy(hit.point);
  LANDING_TOUCHDOWN.copy(hit.point).add(new THREE.Vector3(0,37,0));
  LANDING_APPROACH.copy(hit.point).add(new THREE.Vector3(0,155,0));
 }
 return true;
}
function beginLanding(){
 if(docked||landing||!panel.classList.contains('hidden'))return;
 if(!selectLandingPlatform(true))return;
 landing=true;landingTime=0;landingStart=playerMesh.position.clone();landingYaw=yaw;landingPitch=pitch;
 resetDockControls();document.body.classList.add('landing');
 dockBtn.classList.remove('hidden');dockBtn.disabled=true;dockBtn.textContent='🛬 Piloto automático · Aproximación';
}
dockBtn.onclick=()=>{
 if(dockBtn.disabled||dockBtn.classList.contains('hidden'))return;
 const distance=Math.hypot(playerMesh.position.x-auroraStation.position.x,playerMesh.position.z-auroraStation.position.z);
 if(distance<LANDING_RADIUS&&selectLandingPlatform())beginLanding();
};
function advanceLanding(dt){
 if(!landing)return;
 landingTime+=dt;
 // Aproximación horizontal elevada, seguida de descenso vertical y toma de contacto.
 if(landingTime<3.4){
  const t=smooth(landingTime/3.4);
  playerMesh.position.lerpVectors(landingStart,LANDING_APPROACH,t);
  yaw=landingYaw+Math.atan2(Math.sin(-landingYaw),Math.cos(-landingYaw))*t;pitch=landingPitch*(1-t);
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
 playerMesh.position.set(0,165,-330);yaw=0;pitch=0;
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
 const inCorridor=distance<LANDING_RADIUS&&selectLandingPlatform();
 const available=inCorridor&&panel.classList.contains('hidden');
 dockBtn.classList.toggle('hidden',!available);
 dockBtn.disabled=!available;
 if(available)dockBtn.textContent='🛬 Aterrizar en Estación Aurora';
}
const keys={},joy={throttle:0};let yaw=player.yaw||0,pitch=player.pitch||0;
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.code==='Space'){e.preventDefault();if(!document.body.classList.contains('inventory-open')&&!docked&&!landing)fire()}if(e.key.toLowerCase()==='q'&&!document.body.classList.contains('inventory-open')&&!docked&&!landing)skill()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const joyEl=$('joystick'),stick=$('stick');joy.strafe=0;
function throttleMove(e){if(!panel.classList.contains('hidden')||docked||landing)return;const r=joyEl.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);joy.throttle=THREE.MathUtils.clamp(-dy/(r.height*.38),-1,1);joy.strafe=THREE.MathUtils.clamp(dx/(r.width*.38),-1,1);stick.style.transform='translate('+joy.strafe*38+'px,'+(-joy.throttle*38)+'px)'}
// Entradas táctiles independientes: el joystick no pierde su dedo al disparar.
let joyTouchId=null;
function resetJoystick(){joy.throttle=0;joy.strafe=0;stick.style.transform=''}
joyEl.addEventListener('touchstart',e=>{
 if(joyTouchId!==null)return;
 const t=e.changedTouches[0];if(!t)return;
 joyTouchId=t.identifier;e.preventDefault();throttleMove(t);
},{passive:false});
joyEl.addEventListener('touchmove',e=>{
 for(const t of e.changedTouches)if(t.identifier===joyTouchId){e.preventDefault();throttleMove(t);break}
},{passive:false});
const stopJoyTouch=e=>{for(const t of e.changedTouches)if(t.identifier===joyTouchId){joyTouchId=null;resetJoystick();break}};
joyEl.addEventListener('touchend',stopJoyTouch,{passive:false});
joyEl.addEventListener('touchcancel',stopJoyTouch,{passive:false});
joyEl.onpointerdown=e=>{if(e.pointerType==='touch')return;joyEl.setPointerCapture(e.pointerId);throttleMove(e)};
joyEl.onpointermove=e=>{if(e.pointerType!=='touch'&&joyEl.hasPointerCapture(e.pointerId))throttleMove(e)};
joyEl.onpointerup=joyEl.onpointercancel=e=>{if(e.pointerType!=='touch')resetJoystick()};
const lookZone=$('lookZone');let lookId=null,lastLookX=0,lastLookY=0,bankInput=0;
lookZone.onpointerdown=e=>{if(!panel.classList.contains('hidden'))return;lookId=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;lookZone.setPointerCapture(e.pointerId)};
lookZone.onpointermove=e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch-dy*.0045,-1.15,1.15);bankInput=THREE.MathUtils.clamp(-dx*.035,-.65,.65)};
lookZone.onpointerup=lookZone.onpointercancel=e=>{if(e.pointerId===lookId){lookId=null;bankInput=0}};
// El botón de fuego funciona también como zona de apuntado al arrastrar.
// Mantener pulsado dispara ráfagas; deslizar ese MISMO dedo cambia rumbo.
function aimWhileFiring(x,y){
 const dx=x-lastFireX,dy=y-lastFireY;
 lastFireX=x;lastFireY=y;
 yaw-=dx*.006;
 pitch=THREE.MathUtils.clamp(pitch-dy*.0045,-1.15,1.15);
 bankInput=THREE.MathUtils.clamp(-dx*.035,-.65,.65);
}
const fireButton=$('fireBtn');
fireButton.style.touchAction='none';
let fireTouchId=null,lastFireX=0,lastFireY=0;
fireButton.addEventListener('touchstart',e=>{
 if(fireTouchId!==null||!panel.classList.contains('hidden')||docked||landing)return;
 const t=e.changedTouches[0];if(!t)return;
 fireTouchId=t.identifier;lastFireX=t.clientX;lastFireY=t.clientY;
 fireHeld=true;e.preventDefault();fire();
},{passive:false});
fireButton.addEventListener('touchmove',e=>{
 for(const t of e.changedTouches)if(t.identifier===fireTouchId){e.preventDefault();aimWhileFiring(t.clientX,t.clientY);break}
},{passive:false});
const stopFireTouch=e=>{for(const t of e.changedTouches)if(t.identifier===fireTouchId){fireTouchId=null;fireHeld=false;bankInput=0;break}};
fireButton.addEventListener('touchend',stopFireTouch,{passive:false});
fireButton.addEventListener('touchcancel',stopFireTouch,{passive:false});
fireButton.onpointerdown=e=>{
 if(e.pointerType==='touch'||!panel.classList.contains('hidden')||docked||landing)return;
 e.preventDefault();firePointerId=e.pointerId;fireHeld=true;
 lastFireX=e.clientX;lastFireY=e.clientY;
 fireButton.setPointerCapture(e.pointerId);fire();
};
fireButton.onpointermove=e=>{if(e.pointerType!=='touch'&&e.pointerId===firePointerId)aimWhileFiring(e.clientX,e.clientY)};
function releaseFire(e){if(e.pointerType!=='touch'&&e.pointerId===firePointerId){fireHeld=false;firePointerId=null;bankInput=0}}
fireButton.onpointerup=releaseFire;
fireButton.onpointercancel=releaseFire;
fireButton.onlostpointercapture=()=>{if(fireTouchId===null){fireHeld=false;firePointerId=null;bankInput=0}};
$('skillBtn').onpointerdown=()=>{if(panel.classList.contains('hidden')&&!docked&&!landing)skill()};
$('classAbilityBtn').onpointerdown=()=>{if(panel.classList.contains('hidden'))activateClassAbility()};
function save(){player.x=playerMesh.position.x;player.y=playerMesh.position.z;player.z=playerMesh.position.y;player.yaw=yaw;player.pitch=pitch;player.sector=activeSector;return safeStorageSet(SAVE_KEY,JSON.stringify(player))}setInterval(save,5000);addEventListener('beforeunload',save);
playerMesh.position.set(player.x,player.z,player.y);
if(!Number.isFinite(playerMesh.position.x)||!Number.isFinite(playerMesh.position.y)||!Number.isFinite(playerMesh.position.z))playerMesh.position.set(0,0,0);
// Límite del Sector Aurora. Otros planetas podrán definir su propio centro/radio.
const SECTOR_AURORA={x:0,z:-650,radius:3000,warning:600,damagePerSecond:8};
const SECTOR_BELT={x:10000,z:-650,radius:3000,warning:600,damagePerSecond:8};
let activeSector=player.sector==='belt'?'belt':'aurora';
const currentSector=()=>activeSector==='belt'?SECTOR_BELT:SECTOR_AURORA;
MAP_CENTER_X=currentSector().x;MAP_CENTER_Z=currentSector().z;
for(const e of enemies)e.mesh.visible=activeSector==='aurora'?(e.type==='scout'||e.type==='raider'):(e.type==='sentinel'||e.type==='destroyer');
// Portal visible entre la estación y el planeta, a 250 m del borde esférico.
const portalDir=new THREE.Vector3(2150,950,-5200).sub(new THREE.Vector3(0,0,-650)).normalize();
const auroraPortal=new THREE.Vector3(0,0,-650).addScaledVector(portalDir,2750);
const beltPortal=new THREE.Vector3(SECTOR_BELT.x,0,SECTOR_BELT.z+2450);
// Orientaciones fijas: cada portal mira hacia el interior de su sector.
const auroraPortalRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),portalDir.clone().negate());
const beltPortalRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
const portalMat=new THREE.MeshBasicMaterial({color:0x8a65ff,transparent:true,opacity:.9,side:THREE.DoubleSide});
const portalFill=new THREE.MeshBasicMaterial({color:0x6241da,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false});
const portalMesh=new THREE.Group(),portalRing=new THREE.Mesh(new THREE.TorusGeometry(30,4,12,56),portalMat);
// Tamaño aumentado un 400 % (5 veces el original), incluyendo el GLB y los efectos.
portalMesh.scale.setScalar(5);
const portalDisk=new THREE.Mesh(new THREE.CircleGeometry(26,56),portalFill);
portalMesh.add(portalRing,portalDisk);
// El anillo provisional sigue visible hasta que termina de cargar el modelo.
const portalHalo=new THREE.Mesh(new THREE.TorusGeometry(23,.45,6,64),new THREE.MeshBasicMaterial({color:0x4fcfff,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
portalHalo.visible=false;portalMesh.add(portalHalo);
// Pulso del interior en ambas caras, sin cubrir la estructura exterior.
const portalChargeMaterial=new THREE.MeshBasicMaterial({color:0x42bfff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const portalCharge=new THREE.Group();
const portalChargeGeometry=new THREE.CircleGeometry(23,64);
const portalChargeFront=new THREE.Mesh(portalChargeGeometry,portalChargeMaterial);
const portalChargeBack=new THREE.Mesh(portalChargeGeometry,portalChargeMaterial);
portalChargeFront.position.z=.8;portalChargeBack.position.z=-.8;portalChargeBack.rotation.y=Math.PI;
portalCharge.add(portalChargeFront,portalChargeBack);portalCharge.visible=false;portalMesh.add(portalCharge);
deferredModelLoad(modelLoader,'./assets/models/scifiportal.glb?v=1',gltf=>{
 const model=gltf.scene;
 const box=new THREE.Box3().setFromObject(model);
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const span=Math.max(size.x,size.y);
 if(!Number.isFinite(span)||span<.001)return;
 const scale=68/span;
 model.scale.multiplyScalar(scale);model.position.sub(center.multiplyScalar(scale));
 const anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 model.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;
   material.metalness=.35;material.roughness=.6;
   material.normalScale.set(.4,.4);
   if(material.map){
    material.map.anisotropy=anisotropy;
    material.emissiveMap=material.map;material.emissive.setHex(0x17446b);material.emissiveIntensity=.35;
   }
   material.needsUpdate=true;
  }
 });
 portalMesh.add(model);portalMesh.userData.portalModel=model;
 portalRing.visible=false;portalDisk.visible=false;
 portalHalo.position.z=size.z*scale*.5+.3;portalHalo.visible=true;
 portalChargeFront.position.z=size.z*scale*.5+.5;portalChargeBack.position.z=-size.z*scale*.5-.5;
 portalLight.color.setHex(0x3bafff);
},undefined,err=>console.warn('Modelo de portal no disponible; se conserva el portal provisional.',err));
const portalLight=new THREE.PointLight(0x8a65ff,20,180);portalMesh.add(portalLight);scene.add(portalMesh);
const portalMessage=document.createElement('div');portalMessage.style.cssText='position:fixed;left:50%;top:24%;transform:translateX(-50%);z-index:40;background:#170e35ec;color:white;border:1px solid #9c83ff;border-radius:12px;padding:12px 16px;font:700 15px system-ui;text-align:center;pointer-events:none;display:none';document.body.appendChild(portalMessage);
let portalCountdown=0,portalLastTick=performance.now();
function portalChargePulse(seconds){
 const t=Math.max(0,Math.min(3,seconds));
 // Frecuencia continua: de 0,6 destellos/s al inicio a 5 destellos/s al final.
 const phase=2*Math.PI*(.6*t+(4.4/6)*t*t);
 return Math.pow(.5-.5*Math.cos(phase),1.6);
}
function switchSector(){
 activeSector=activeSector==='aurora'?'belt':'aurora';
 const sector=currentSector();MAP_CENTER_X=sector.x;MAP_CENTER_Z=sector.z;
 playerMesh.position.copy(activeSector==='belt'?beltPortal.clone().add(new THREE.Vector3(0,0,-110)):auroraPortal.clone().addScaledVector(portalDir,-110));
 for(const rock of asteroidField.children)rock.position.copy(randomSectorPosition(850,2950));
 for(const e of enemies){e.home.copy(randomEnemyHome(e.type));e.mesh.position.copy(e.home);e.maxHp=enemyMaxHp(e.type);e.hp=e.maxHp;e.dead=0;e.mesh.visible=activeSector==='aurora'?(e.type==='scout'||e.type==='raider'):(e.type==='sentinel'||e.type==='destroyer');e.fireTimer=1+Math.random()*2}
 for(const shot of enemyShots)scene.remove(shot.mesh);enemyShots.length=0;
 for(const shot of shots)scene.remove(shot.mesh);shots.length=0;
 player.sector=activeSector;portalCountdown=0;portalCharge.visible=false;portalChargeMaterial.opacity=0;save();lootToast(activeSector==='belt'?'🪨 Cinturón Perdido':'🌌 Sector Aurora');
}
function updateSectorPortal(){
 const dt=Math.min(.1,(performance.now()-portalLastTick)/1000);portalLastTick=performance.now();
 const pos=activeSector==='aurora'?auroraPortal:beltPortal;portalMesh.position.copy(pos);portalMesh.quaternion.copy(activeSector==='aurora'?auroraPortalRotation:beltPortalRotation);
 const distance=playerMesh.position.distanceTo(pos),near=distance<=350,unlocked=activeSector==='belt'||player.level>=10;
 const charging=distance<=100&&unlocked&&!docked&&!landing;
 if(charging){portalCountdown+=dt;if(portalCountdown>=3){switchSector();portalMessage.style.display='none';return}}else portalCountdown=0;
 const pulse=charging?portalChargePulse(portalCountdown):0;
 portalCharge.visible=charging;portalChargeMaterial.opacity=pulse*.65;
 portalRing.rotation.z=0;portalMat.color.setHex(charging?0x70faff:unlocked?0x9e75ff:0x68448f);portalFill.opacity=.25;portalLight.intensity=charging?20+pulse*70:20;
 if(portalMesh.userData.portalModel){
  portalHalo.material.opacity=unlocked?.18:.08;
  portalHalo.scale.setScalar(1);
 }
 portalMessage.style.display=near&&!docked&&!landing?'block':'none';
 if(near)portalMessage.textContent=!unlocked?'🔒 Portal bloqueado · Llega al nivel 10 para desbloquear':charging?'🌀 Portal activándose · '+Math.ceil(3-portalCountdown)+' s':'🌀 Acércate a 100 m para viajar';
}

const sectorNotice=document.createElement('div');sectorNotice.setAttribute('role','status');
sectorNotice.style.cssText='position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:35;max-width:85vw;padding:10px 15px;border-radius:12px;background:rgba(15,13,31,.82);border:1px solid rgba(255,160,75,.6);color:#ffe4ba;font:600 14px system-ui;text-align:center;pointer-events:none;display:none;';
document.body.appendChild(sectorNotice);
function sectorDistance(){const sector=currentSector();return Math.hypot(playerMesh.position.x-sector.x,playerMesh.position.y,playerMesh.position.z-sector.z)}
// Recuperar partidas anteriores guardadas muy lejos, sin borrar su progreso.
if(sectorDistance()>currentSector().radius){const sector=currentSector();playerMesh.position.set(sector.x,110,sector.z+450);player.x=sector.x;player.y=sector.z+450;player.z=110}
function updateSectorBoundary(dt){
 if(docked||landing){sectorNotice.style.display='none';return}
 const sector=currentSector(),d=sectorDistance(),remaining=sector.radius-d;
 if(remaining>sector.warning){sectorNotice.style.display='none';return}
 sectorNotice.style.display='block';
 if(remaining>=0){sectorNotice.textContent='⚠️ Límite de '+(activeSector==='belt'?'Cinturón Perdido':'Sector Aurora')+' a '+Math.ceil(remaining)+' m';return}
 player.hp=Math.max(0,player.hp-sector.damagePerSecond*dt);
 sectorNotice.textContent='☢️ Fuera del sector · -8 casco/s · Regresa al interior';
}
camera.position.copy(playerMesh.position).add(new THREE.Vector3(0,100,210));camera.lookAt(playerMesh.position.clone().add(new THREE.Vector3(0,8,-150)));
function hud(){const compact=$('hudCompactHealthFill');if(compact)compact.style.width=Math.max(0,Math.min(100,100*player.hp/player.maxHp))+'%';$('playerName').textContent=player.name;$('classLabel').textContent='Nave '+(SHIP_TYPES[player.shipId]?.name||'Aurora');$('level').textContent='Nivel '+player.level;$('hpText').textContent=Math.ceil(player.hp)+'/'+player.maxHp;$('energyText').textContent=Math.ceil(player.energy)+'/'+player.maxEnergy;$('hpBar').style.width=player.hp/player.maxHp*100+'%';$('energyBar').style.width=player.energy/player.maxEnergy*100+'%';$('attack').textContent=player.attack;$('defense').textContent=player.defense;$('gold').textContent=player.gold;const lootCount=Object.values(player.loot||{}).reduce((a,b)=>a+(Number(b)||0),0);$('lootCount').textContent=lootCount;$('xpText').textContent='XP '+Math.floor(player.xp)+' / '+xpNeed();$('xpBar').style.width=player.xp/xpNeed()*100+'%';$('skillCd').textContent=skillCd>0?Math.ceil(skillCd)+'s':''}
// Zoom discreto de cámara, sin alterar la dirección de disparo ni el joystick.
let cameraZoom=285;
function setCameraZoom(next){cameraZoom=THREE.MathUtils.clamp(next,170,540)}
$('zoomIn').onclick=()=>setCameraZoom(cameraZoom-45);
$('zoomOut').onclick=()=>setCameraZoom(cameraZoom+45);
const hudToggle=$('hudToggle'),hudPanel=$('hud');
hudToggle.onclick=()=>{
 const folded=hudPanel.classList.toggle('collapsed');
 hudToggle.textContent=folded?'⌄':'⌃';
 hudToggle.setAttribute('aria-expanded',String(!folded));
 hudToggle.setAttribute('aria-label',folded?'Desplegar información de vida':'Plegar información de vida');
};
const panel=$('characterPanel');const closeCharacterPanel=()=>{panel.classList.add('hidden');document.body.classList.remove('inventory-open')};$('characterBtn').onclick=()=>{$('nameInput').value=player.name;$('statList').innerHTML='Nave equipada: '+(SHIP_TYPES[player.shipId]?.name||'Aurora')+'<br>Nivel: '+player.level+'<br>Casco máximo: '+player.maxHp+'<br>Vida actual: '+Math.ceil(player.hp)+'<br>Energía máxima: '+player.maxEnergy+'<br>Potencia: '+player.attack+'<br>Escudo: '+player.defense+'<br>Velocidad: '+player.speed;renderInventory();renderUpgrades();renderDrones();panel.classList.remove('hidden');document.body.classList.add('inventory-open')};$('closePanel').onclick=closeCharacterPanel;$('saveBtn').onclick=()=>{player.name=$('nameInput').value.trim()||'Nave Aurora';save();closeCharacterPanel()};// QA es local y no representa autenticación segura: mantenerlo solo en pruebas.
const qaSwitch=$('qaSwitch'),qaTools=$('qaTools');
qaSwitch.textContent=qaActive?'Volver a partida normal':'Entrar a partida QA';
qaTools.classList.toggle('hidden',!qaActive);
qaSwitch.onclick=()=>{
 if(!save())return;
 const changed=qaActive?safeStorageRemove(QA_FLAG):safeStorageSet(QA_FLAG,'1');
 if(changed)location.reload();
};
function qaApply(fn){if(!qaActive)return;fn();save();hud();renderDrones();renderUpgrades();renderInventory();if(docked)hangarRefresh()}
$('qaCredits').onclick=()=>qaApply(()=>player.gold=(Number(player.gold)||0)+100000);
$('qaDrones').onclick=()=>qaApply(()=>player.droneCount=8);
$('qaHeal').onclick=()=>qaApply(()=>{player.hp=player.maxHp;player.energy=player.maxEnergy});
$('qaLevels').onclick=()=>qaApply(()=>{for(let i=0;i<5;i++){player.level++;player.maxHp+=10;player.maxEnergy+=5;player.attack+=2;player.defense++}player.hp=player.maxHp;player.energy=player.maxEnergy});
$('qaMaterials').onclick=()=>qaApply(()=>{for(const t of LOOT_TYPES)player.loot[t.id]=(Number(player.loot[t.id])||0)+100});
$('resetBtn').onclick=()=>{if(confirm('¿Reiniciar la nave y todo su progreso?')&&safeStorageRemove(SAVE_KEY))location.reload()};
$('interactBtn').classList.add('hidden');$('dialogue').classList.add('hidden');renderMission();
let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.04);last=now;if(graphicsLost){requestAnimationFrame(loop);return}fireCd=Math.max(0,fireCd-dt);skillCd=Math.max(0,skillCd-dt);updateClassAbility(dt);if(fireHeld&&!docked&&!landing&&panel.classList.contains('hidden'))fire();player.energy=Math.min(player.maxEnergy,player.energy+(docked?8:5)*dt*(player.shipId==='aurora'?1.2+specialLevel('energy')*.04:1));
const menuOpen=docked||landing||!panel.classList.contains('hidden');const keyThrottle=menuOpen?0:(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),throttle=menuOpen?0:THREE.MathUtils.clamp(joy.throttle+keyThrottle,-1,1);
if(!docked&&!landing&&keys.arrowleft){yaw+=1.6*dt;bankInput=.42}else if(!docked&&!landing&&keys.arrowright){yaw-=1.6*dt;bankInput=-.42}else if(lookId===null)bankInput=0;if(!docked&&!landing&&keys.r)pitch=Math.min(1.15,pitch+1.1*dt);if(!docked&&!landing&&keys.f)pitch=Math.max(-1.15,pitch-1.1*dt);
const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const strafe=menuOpen?0:THREE.MathUtils.clamp(joy.strafe+(keys.d?1:0)-(keys.a?1:0),-1,1);const movementScale=Math.max(1,Math.hypot(throttle,strafe));playerMesh.position.addScaledVector(forward,player.speed*throttle*dt/movementScale);playerMesh.position.addScaledVector(right,player.speed*strafe*dt/movementScale);advanceLanding(dt);
// Vuelo libre en los tres ejes: el límite esférico del sector sustituye al antiguo techo/suelo.
updateSectorBoundary(dt);updateSectorPortal();
playerMesh.rotation.order='YXZ';playerMesh.rotation.y=yaw;playerMesh.rotation.x=pitch;const bankTarget=(bankInput-strafe*.16)*Math.min(1,.35+Math.abs(throttle)+Math.abs(strafe)*.65);playerMesh.rotation.z=THREE.MathUtils.lerp(playerMesh.rotation.z,bankTarget,1-Math.pow(.0008,dt));bankInput=THREE.MathUtils.lerp(bankInput,0,1-Math.pow(.02,dt));
const titanVisual=playerMesh.userData.titanModel,espectroVisual=playerMesh.userData.espectroModel;
const titanEnginesActive=player.shipId==='titan'&&!!titanVisual?.visible;
const espectroEnginesActive=player.shipId==='espectro'&&!!espectroVisual?.visible;
const customEnginesActive=titanEnginesActive||espectroEnginesActive;
for(const glow of engineGlows)glow.visible=!customEnginesActive;
for(const l of engineLights){l.visible=!customEnginesActive;l.intensity=18+Math.abs(throttle)*48}
for(const t of engineTrails){t.visible=!customEnginesActive;t.scale.y=.18+Math.abs(throttle)*1.35;t.scale.x=.75+Math.abs(throttle)*.18;t.scale.z=.75+Math.abs(throttle)*.18;t.material.opacity=.12+Math.abs(throttle)*.58}
for(const [visual,active] of [[titanVisual,titanEnginesActive],[espectroVisual,espectroEnginesActive]]){
 for(const flame of visual?.userData.engineFlames||[]){
  const power=Math.abs(throttle);
  flame.visible=active&&power>.02&&!docked&&!landing;
  const flicker=1+Math.sin(now*.035+flame.id)*.08;
  flame.scale.set(.8+power*.2,(.15+power*1.35*flicker)*(flame.userData.lengthFactor||1),.8+power*.2);
  flame.material.opacity=.25+power*.45;
 }
}
updateLoot(dt);
drawRadar(dt);
const playerSafe=updateZone();updateDock();
for(const e of enemies){if(e.dead){if(now/1000>=e.dead){e.dead=0;e.maxHp=enemyMaxHp(e.type);e.hp=e.maxHp;e.home.copy(randomEnemyHome(e.type));e.mesh.position.copy(e.home);e.mesh.visible=activeSector==='aurora'?(e.type==='scout'||e.type==='raider'):(e.type==='sentinel'||e.type==='destroyer');e.fireTimer=1+Math.random()*2}continue}if(!e.mesh.visible)continue;const t=TYPES[e.type],d=e.mesh.position.distanceTo(playerMesh.position);if(d<1200&&!playerSafe&&!docked&&!landing){const dir=playerMesh.position.clone().sub(e.mesh.position).normalize();if(d>800)e.mesh.position.addScaledVector(dir,Math.min(t.speed*dt,d-800));else if(d<65)applyPlayerDamage(Math.max(1,t.damage-player.defense*.25)*dt);e.fireTimer-=dt;if(e.fireTimer<=0&&d>80){enemyFire(e);e.fireTimer=(e.type==='scout'?2.8:e.type==='raider'?2.0:1.5)+Math.random()*.7}}e.mesh.lookAt(playerMesh.position)}
updateEnemyShots(dt);
updateSupportDrones(dt,now);updateExplorer(dt,now);
 for(const p of shots){if(p.missile){
  p.missileAge=(p.missileAge||0)+dt;
  const aim=p.target&&!p.target.dead&&p.target.mesh.visible?p.target.mesh.position:p.missileAim;
  if(aim){const desired=aim.clone().sub(p.mesh.position).normalize().multiplyScalar(p.missileSpeed||650);
   const delay=p.missileGuideDelay||.55;
   p.vel.lerp(desired,Math.min(1,dt*(p.missileAge<delay?.12:3.7)))}
  p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.vel.clone().normalize());
 }p.mesh.position.addScaledVector(p.vel,dt);if(p.missile)updateMissileEffects(p,dt);p.life-=dt;for(const e of enemies){if(!e.dead&&p.life>0&&p.mesh.position.distanceTo(e.mesh.position)<(p.missile?44:30)){e.hp-=p.damage;p.life=0;if(e.hp<=0)kill(e)}}}for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0){removeMissileEffects(shots[i]);scene.remove(shots[i].mesh);shots.splice(i,1)}
if(player.hp<=0){playerMesh.position.set(0,110,-200);player.hp=player.maxHp;player.energy=player.maxEnergy;sectorNotice.style.display='none';save()}
const back=forward.clone().multiplyScalar(-cameraZoom).add(new THREE.Vector3(0,cameraZoom*105/285,0));const desired=playerMesh.position.clone().add(back);camera.position.lerp(desired,1-Math.pow(.006,dt));camera.lookAt(playerMesh.position.clone().add(forward.clone().multiplyScalar(215)));if(!docked&&!landing)updateTargetLock();else lockFrame.classList.add('hidden');hud();renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
hud();
