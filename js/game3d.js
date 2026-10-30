import {PVP_MISSIONS} from './pvp-missions.js?v=349';
import {setCombatArtwork,presentCombatButton,shipCombatArtwork} from './combat-buttons.js?v=348';
import {rankedName} from './pvp-ranks.js?v=347';
import {pveRecoveryCost,settlePveRecovery} from './pve-recovery.js?v=1';
import {checkpointProfile,activeProfile} from './account-storage.js?v=344';
import {ENEMY_BASELINES} from './enemy-balance.js?v=343';
import {updateProAuras} from './pro-aura.js?v=342';
import {settleRespawn,finishPvpTransfer} from './pvp-settlement.js?v=1';
import {pvpAccountToken} from './pvp-account.js?v=3';
import {mountPvpZones} from './pvp-zones.js?v=2';
import {checkPvpVersion,showPvpUpdate} from './pvp-version.js?v=5';
import {createArenaEnemyView} from './pvp-enemies.js?v=342';
import {correctionStep} from './pvp-prediction.js?v=324';
import {mountPvpControlEditor} from './pvp-control-editor.js?v=348';
import {loadAdminPod,animateAdminPod} from './admin-pod.js?v=338';
import {loadObsidian,animateObsidian} from './obsidian-rig.js?v=308';
import {createCombatAudio,createPvpSoundObserver} from './combat-audio.js?v=299';
import {createNexoRig,NEXO_VISUAL} from './pvp-boss-rig.js?v=259';
import {saveBossReceipts} from './pvp-boss-rewards.js?v=349';
import {proMultiplier,proRewardMultiplier,proPopulation} from './pro-enemies.js?v=343';
import {shipThumbnail} from './ship-preview-catalog.js?v=337';
import {createFarmPilot} from './farm-pilot.js?v=255';
import {mountFarmPilotUI} from './farm-pilot-ui.js?v=255';
import {GRAPHICS_KEY,createGraphicsController,renderRatio,mountGraphicsSettings} from './graphics-settings.js?v=229';
import {createModelLoadQueue} from './model-load-queue.js?v=229';
import {TITAN_BOMB_FUSE,TITAN_BLAST_DURATION,titanBombProgress,createTitanEffects} from './titan-effects.js?v=230';
import {recordAction,mountJournal} from './activity-journal.js?v=225';
import {createMissionBoard,CEMETERY_MISSIONS} from './mission-board.js?v=349';
import {TITAN_STATS,titanScale,titanPattern,titanBombOffsets,titanPatrolPoint,createGranTitan,createTitanCycle,advanceTitanCycle} from './gran-titan.js?v=326';
import {attachAssembledEngines} from './assembled-engines.js?v=321';
import {ASSEMBLED_SHIPS,canAssembleShip,assembleShip,shipRole} from './assembled-ships.js?v=337';
import {createColosoRig,attachColosoExhaust} from './coloso-rig.js?v=340';
import {FORMATIONS,normalizeHangar,formationBonus,boosterBonus,tickBoosters,formationOffset} from './hangar-systems.js?v=177';
import {mountHangarUI} from './hangar-ui.js?v=337';
import {selectCompanionTask} from './companion-priority.js?v=174';
import {sharedRequested,startSharedSession} from './shared-session.js?v=348';
import {initialPvpPilot,readOfflinePilot} from './pvp-loadout.js?v=337';
import {createHangarEditor,serializeHangarEditor} from './pvp-hangar.js?v=337';
import {advancedEnemyScale,scaledHealth,segmentDistance,GRAVEYARD,createGraveyard,createScrapCombat,linkScrapPairs,placeScrapPairs,rejoinScrapPair} from './graveyard.js?v=299';
import {createCatapultRig} from './catapult-rig.js?v=182';
import {createHarpoonRig} from './harpoon-rig.js?v=187';
const PVP_MODE=sharedRequested();
if(!PVP_MODE){const key=window.MUNDO_PLAY_MODE?.mode==='test'?'mundoAbierto.qaPlayer':'mundoAbierto.player';let pending=false;try{finishPvpTransfer(localStorage,key,true);pending=!!JSON.parse(localStorage.getItem(key)||'{}').pendingPvpDeath}catch{}if(pending){const url=new URL(location.href);url.searchParams.set('pvp','1');location.replace(url.href);await new Promise(()=>{});}}
let pvpSession=null,pvpHangar=null,pvpCorrection=[0,0,0];
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
function safeStorageSet(key,value){if(PVP_MODE&&!pvpHangar)return true;try{if(key==='mundoAbierto.player'&&(window.COSMOS_PROFILE_SWITCHING||window.COSMOS_ACTIVE_PROFILE&&activeProfile(localStorage)!==window.COSMOS_ACTIVE_PROFILE))throw Error('La cuenta cambió');localStorage.setItem(key,value);if(key==='mundoAbierto.player'&&window.COSMOS_ACTIVE_PROFILE)checkpointProfile(localStorage,window.COSMOS_ACTIVE_PROFILE);return true}catch{showStorageWarning();return false}}
function safeStorageRemove(key){if(PVP_MODE)return true;try{localStorage.removeItem(key);return true}catch{showStorageWarning();return false}}
const DEFAULT={name:'Nave Aurora',classId:null,level:1,x:0,y:0,z:0,hp:100,maxHp:100,energy:100,maxEnergy:100,attack:10,defense:5,gold:0,xp:0,speed:220,quests:{}};
const QA_FLAG='mundoAbierto.qaActive';const qaActive=window.MUNDO_PLAY_MODE?.mode==='test';const SAVE_KEY=qaActive?'mundoAbierto.qaPlayer':'mundoAbierto.player';let stored={};try{stored=JSON.parse(safeStorageGet(SAVE_KEY)||'{}')||{}}catch{showStorageWarning('El guardado estaba dañado y se inició una sesión segura.')}let player={...DEFAULT,...(PVP_MODE?initialPvpPilot(stored):stored)};player.x=Number.isFinite(+player.x)?+player.x:0;player.y=Number.isFinite(+player.y)?+player.y:0;player.z=Number.isFinite(+player.z)?+player.z:0;player.quests=PVP_MODE?JSON.parse(JSON.stringify(stored.quests||{})):player.quests||{};
const combatAudio=createCombatAudio({listener:()=>playerMesh.position,storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}});
let graphicsUI=null;
let graphicsMode='auto';try{graphicsMode=localStorage.getItem(GRAPHICS_KEY)||'auto'}catch{}
const graphics=createGraphicsController({mode:graphicsMode,onChange:()=>{resizeGraphics();graphicsUI?.refresh()}});
// MSAA multiplies framebuffer memory on mobile; resolution controls edge quality.
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
function resizeGraphics(){renderer.setPixelRatio(renderRatio(graphics.profile,innerWidth,innerHeight,devicePixelRatio));renderer.setSize(innerWidth,innerHeight)}
resizeGraphics();renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
// Retry at low resolution after context loss, including when manual High was selected.
try{const recoveredAt=Number(sessionStorage.getItem('mundoAbierto.webglRecoveryAt'));if(recoveredAt&&Date.now()-recoveredAt<60000)graphics.recover()}catch{}

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
const spaceBackground=createSpaceBackground();
let auroraBackground=spaceBackground,beltBackground=spaceBackground,emberBackground=spaceBackground;
if(spaceBackground)scene.background=spaceBackground;
function syncSectorEnvironment(){
 scene.background=activeSector==='graveyard'?graveyard.background:activeSector==='ember'?emberBackground:activeSector==='belt'?beltBackground:auroraBackground;
 graveyard.environment.visible=activeSector==='graveyard'&&!PVP_MODE;
 auroraPlanetPivot.visible=activeSector==='aurora';
 emberMoonPivot.visible=emberMoonLight.visible=emberMoonFill.visible=activeSector==='ember';
 for(const light of beltSectorLights)light.visible=activeSector==='belt';
 for(const light of emberSectorLights)light.visible=activeSector==='ember';
 sectorStars.position.set(currentSector().x,0,currentSector().z);
}
new THREE.TextureLoader().load('./assets/models/fondo_espacial_cinturon.webp?v=145',texture=>{
 texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 beltBackground=texture;syncSectorEnvironment();
},undefined,()=>console.info('Fondo Cinturón no disponible; usando respaldo espacial.'));
// Mezclar la costura longitudinal y suavizar los polos del panorama al cargarlo.
function seamlessSectorPanorama(image){
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=768;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data,source=new Uint8ClampedArray(data),w=canvas.width,h=canvas.height;
 const smooth=t=>t*t*(3-2*t),band=Math.round(w*.12);
 for(let y=0;y<h;y++)for(let x=0;x<band;x++){
  const blend=1-smooth(x/(band-1)),left=(y*w+x)*4,right=(y*w+w-1-x)*4;
  for(let c=0;c<3;c++){
   const shared=(source[left+c]+source[right+c])/2;
   data[left+c]=source[left+c]*(1-blend)+shared*blend;
   data[right+c]=source[right+c]*(1-blend)+shared*blend;
  }
 }
 const pole=Math.round(h*.09);
 for(const top of [true,false]){
  const edge=top?0:h-1,average=[0,0,0];
  for(let x=0;x<w;x++)for(let c=0;c<3;c++)average[c]+=data[(edge*w+x)*4+c]/w;
  for(let row=0;row<pole;row++){
   const y=top?row:h-1-row,blend=1-smooth(row/(pole-1));
   for(let x=0;x<w;x++)for(let c=0;c<3;c++){const i=(y*w+x)*4+c;data[i]=data[i]*(1-blend)+average[c]*blend}
  }
 }
 ctx.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
new THREE.TextureLoader().load('./assets/models/fondo_espacial_ascuas.webp?v=161',texture=>{
 texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 const panorama=seamlessSectorPanorama(texture.image);emberBackground=panorama||texture;if(panorama)texture.dispose();syncSectorEnvironment();
},undefined,()=>console.info('Fondo Ascuas no disponible; usando respaldo espacial.'));
// Panorama artístico externo (2:1): si falta el archivo, conservar fondo procedural.
new THREE.TextureLoader().load('./assets/models/fondo_espacial_aurora.webp?v=105',texture=>{
 texture.mapping=THREE.EquirectangularReflectionMapping;
 texture.colorSpace=THREE.SRGBColorSpace;
 auroraBackground=texture;syncSectorEnvironment();
},undefined,()=>console.info('Fondo espacial personalizado pendiente; usando fondo original.'));
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,1,9000);
scene.add(new THREE.HemisphereLight(0x7bbcff,0x050713,1.8));const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-600,900,-400);scene.add(sun);
 // Luna alta de Ascuas: brillo visible y luz real para los objetos del sector.

const beltSectorLights=[
 new THREE.HemisphereLight(0xe6eaff,0x737c8e,1.15),
 new THREE.DirectionalLight(0xffd2ac,2.1),
 new THREE.DirectionalLight(0xcabaff,1.65)
];
beltSectorLights[1].position.set(8000,3200,-3200);beltSectorLights[2].position.set(12000,2200,-1800);
for(const light of beltSectorLights){light.visible=false;if(light.target){light.target.position.set(10000,0,-650);scene.add(light.target)}scene.add(light)}

const emberMoonPivot=new THREE.Group();emberMoonPivot.position.set(21500,5800,-2150);emberMoonPivot.visible=false;scene.add(emberMoonPivot);
const emberMoonLight=new THREE.DirectionalLight(0xffc0a0,2.6);emberMoonLight.position.copy(emberMoonPivot.position);
emberMoonLight.target.position.set(23000,0,-650);emberMoonLight.visible=false;scene.add(emberMoonLight,emberMoonLight.target);
const emberMoonFill=new THREE.HemisphereLight(0xffe9dc,0x9593a3,1.9);emberMoonFill.visible=false;scene.add(emberMoonFill);
// Relleno fijo de Ascuas desde lados opuestos, sin sombras ni luces por enemigo.
const emberSectorLights=[new THREE.DirectionalLight(0xffdfc8,1.35),new THREE.DirectionalLight(0xc8dcff,1.1)];
emberSectorLights[0].position.set(19500,1800,3300);emberSectorLights[1].position.set(26500,-1800,-4800);
for(const light of emberSectorLights){light.target.position.set(23000,0,-650);light.visible=false;scene.add(light,light.target)}
const emberMoonFallback=new THREE.Mesh(new THREE.SphereGeometry(600,32,20),new THREE.MeshStandardMaterial({color:0xd7806a,emissive:0xff6440,emissiveIntensity:.7,roughness:1,metalness:0,fog:false}));
emberMoonPivot.add(emberMoonFallback);
const moonGlowCanvas=document.createElement('canvas');moonGlowCanvas.width=moonGlowCanvas.height=128;
const moonGlowContext=moonGlowCanvas.getContext('2d');
if(moonGlowContext){
 const glow=moonGlowContext.createRadialGradient(64,64,36,64,64,64);glow.addColorStop(0,'rgba(255,95,55,0.0)');glow.addColorStop(.25,'rgba(255,105,65,0.24)');glow.addColorStop(1,'rgba(255,75,35,0)');
 moonGlowContext.fillStyle=glow;moonGlowContext.fillRect(0,0,128,128);
 const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(moonGlowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false}));
 halo.scale.set(1800,1800,1);emberMoonPivot.add(halo);
}

const starsGeo=new THREE.BufferGeometry(),sp=[];for(let i=0;i<1600;i++)sp.push((Math.random()-.5)*8000,(Math.random()-.5)*4500,(Math.random()-.5)*8000);starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));const sectorStars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xbad9ff,size:3,sizeAttenuation:true}));scene.add(sectorStars);
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
 planet.position.sub(auroraPlanetPosition);auroraPlanetPivot.add(planet);
 const moon=new THREE.Mesh(new THREE.IcosahedronGeometry(145,3),new THREE.MeshStandardMaterial({color:0x9a9ba5,roughness:1,flatShading:true,emissive:0x20212a,emissiveIntensity:.18,fog:false}));
 moon.position.set(3350,1220,-5550).sub(auroraPlanetPosition);auroraPlanetPivot.add(moon);
}
// Planeta Aurora 3D: único planeta principal. No cargar el sprite 2D
// ni el planeta procedural simultáneamente.
const auroraPlanetPosition=new THREE.Vector3(2150,950,-5200);
const auroraPlanetPivot=new THREE.Group();
auroraPlanetPivot.position.copy(auroraPlanetPosition);scene.add(auroraPlanetPivot);
const auroraPlanetLoader=new GLTFLoader();
// Cola móvil: descarga y procesa un GLB secundario a la vez. La nave del
// jugador conserva carga inmediata; el resto aprovecha períodos de reposo.
let modelSector=PVP_MODE?'aurora':player.sector||'aurora';
const graveyardModels=['rustedmetalpanel','derelicthullblock','trussgirder','girdersection','metalcrate','estacion_recuperacion','restos_anillo','spaceship%20(3)','spacecruiser%20(1)','catapulta_','arponero_','acechador_','gran_titan'];
const modelQueue=createModelLoadQueue({
 priority:path=>/spaceship%20|spacecruiser%20/.test(path)?3:/rustedmetalpanel|derelicthullblock|trussgirder|girdersection|metalcrate|restos_anillo/.test(path)?2:0,
 schedule:fn=>{if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:1200});else setTimeout(fn,80)},
 eligible:path=>{
  if(graveyardModels.some(name=>path.includes('/'+name)))return modelSector==='graveyard';
  if(/\/(moon_optimizada|coloso|devastador)\.glb/.test(path))return modelSector==='ember';
  if(path.includes('/planeta_aurora.glb'))return modelSector==='aurora';
  return true;
 }
});
function deferredModelLoad(loader,path,onLoad,onProgress,onError){return modelQueue.load(loader,path,onLoad,onProgress,onError)}
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
deferredModelLoad(modelLoader,'./assets/models/moon_optimizada.glb?v=163',gltf=>{
 const model=gltf.scene,bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const span=Math.max(size.x,size.y,size.z);if(!Number.isFinite(span)||span<.0001)return;
 const factor=1200/span;model.scale.setScalar(factor);model.position.copy(center).multiplyScalar(-factor);
 model.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.color.set(0xffb099);material.metalnessMap=null;material.roughnessMap=null;material.metalness=0;material.roughness=.95;
   material.emissive.set(0xff7048);material.emissiveMap=material.map;material.emissiveIntensity=.85;material.fog=false;
   if(material.map)material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());material.needsUpdate=true;
  }
 });
 emberMoonPivot.add(model);emberMoonFallback.visible=false;
},undefined,error=>console.warn('Luna Ascuas no disponible; se conserva la esfera iluminada.',error));

function fitPlayerModel(model,yaw=0){
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 model.position.sub(center);model.scale.multiplyScalar(124/Math.max(size.x,size.z));model.rotation.y=yaw;
 return model;
}
function syncPlayerShipVisuals(){
 const keys={adminpod:'adminpodModel',titan:'titanModel',espectro:'espectroModel',segadora:'segadoraModel',bastion:'bastionModel',centella:'centellaModel',obsidian:'obsidianModel',azote:'azoteModel',egida:'egidaModel',vertigo:'vertigoModel'};
 const selected=keys[player.shipId],loaded=!!(selected&&playerMesh.userData[selected]);
 for(const key of Object.values(keys)){const model=playerMesh.userData[key];if(model)model.visible=loaded&&key===selected}
 let hasOriginal=false;
 const waiting=!!selected&&!loaded&&!playerMesh.userData[selected+'Failed'];
 for(const key of ['xWingModel','auroraModel']){
  const model=playerMesh.userData[key];if(model){model.visible=!loaded&&!waiting;hasOriginal=true}
 }
 proceduralShip.visible=!loaded&&!waiting&&!hasOriginal;
}
function mountPlayerModel(model,key){playerMesh.add(model);playerMesh.userData[key]=model;syncPlayerShipVisuals()}
const assembledModelPaths={adminpod:'./assets/models/admin-hoverpod.glb?v=337',azote:'./assets/models/pvp-ofensiva.glb?v=327',egida:'./assets/models/pvp-defensiva.glb?v=327',vertigo:'./assets/models/pvp-agil.glb?v=327',segadora:'./assets/models/segadora.glb?v=327',bastion:'./assets/models/bastion.glb?v=208',centella:'./assets/models/centella.glb?v=327'};
function loadAssembledVisual(id){
 if(!ASSEMBLED_SHIPS[id]||playerMesh.userData[id+'Model']||playerMesh.userData[id+'Loading'])return;
 playerMesh.userData[id+'Loading']=true;
 if(id==='adminpod'){loadAdminPod(THREE,modelLoader).then(visual=>{mountPlayerModel(visual,id+'Model');playerMesh.userData[id+'Loading']=false}).catch(error=>{playerMesh.userData[id+'Loading']=false;playerMesh.userData[id+'ModelFailed']=true;syncPlayerShipVisuals();console.warn('Hoverpod Admin',error)});return}
 if(id==='obsidian'){loadObsidian(THREE,modelLoader).then(visual=>{mountPlayerModel(visual,id+'Model');playerMesh.userData[id+'Loading']=false}).catch(error=>{playerMesh.userData[id+'Loading']=false;playerMesh.userData[id+'ModelFailed']=true;syncPlayerShipVisuals();console.warn('Obsidian no disponible',error)});return}
 modelLoader.load(assembledModelPaths[id],gltf=>{
  const source=gltf.scene,box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const span=Math.max(size.x,size.z);if(!Number.isFinite(span)||span<=0)return;
  const factor=124/span;source.scale.multiplyScalar(factor);source.position.sub(center.multiplyScalar(factor));
  source.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=false;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    if(!material?.isMeshStandardMaterial)continue;
    material.metalnessMap=null;material.roughnessMap=null;material.metalness=.48;material.roughness=.62;material.normalScale.set(.4,.4);
    if(material.map)material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    material.needsUpdate=true;
   }
  });
  const pivot=new THREE.Group();pivot.rotation.y=ASSEMBLED_SHIPS[id].yaw+(id==='segadora'?-Math.PI/2:0);pivot.add(source);
  const visual=new THREE.Group();if(id==='segadora')visual.rotation.z=-0.055;visual.add(pivot);attachAssembledEngines(THREE,visual,id);
  mountPlayerModel(visual,id+'Model');playerMesh.userData[id+'Loading']=false;
 },undefined,error=>{playerMesh.userData[id+'Loading']=false;playerMesh.userData[id+'ModelFailed']=true;syncPlayerShipVisuals();console.warn('Modelo de '+id+' no disponible; se conserva la nave de respaldo.',error)});
}
deferredModelLoad(modelLoader,'./assets/models/titan.glb?v=327',gltf=>{
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
 // The supplied gunship includes its own armor and engine housings.
 const visual=new THREE.Group();visual.add(pivot);
 attachAssembledEngines(THREE,visual,'titan');
 mountPlayerModel(visual,'titanModel');
},undefined,err=>{playerMesh.userData.titanModelFailed=true;syncPlayerShipVisuals();console.warn('Modelo titan no disponible; se conserva la apariencia original.',err)});
deferredModelLoad(modelLoader,'./assets/models/espectro.glb?v=327',gltf=>{
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
   material.color.setRGB(1,1,1);
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
 const visual=new THREE.Group();visual.add(pivot);
 attachAssembledEngines(THREE,visual,'espectro');
 mountPlayerModel(visual,'espectroModel');
},undefined,err=>{playerMesh.userData.espectroModelFailed=true;syncPlayerShipVisuals();console.warn('Modelo espectro no disponible; se conserva la apariencia original.',err)});
function loadAuroraFallback(){
 modelLoader.load('./assets/models/aurora_s1.glb?v=105',gltf=>{
  const model=gltf.scene;model.traverse(o=>{if(o.isMesh)auroraMaterial(o)});
  mountPlayerModel(fitPlayerModel(model,-Math.PI/2),'auroraModel');
 },undefined,err=>{playerMesh.userData.auroraModelFailed=true;console.warn('Los modelos GLB no cargaron; se usa la nave procedural.',err)});
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

const graveyard=createGraveyard(THREE,scene);
// Load each unique debris mesh once; the graveyard reuses it across 65 placements.
const graveyardScrapFiles=['rustedmetalpanel','derelicthullblock','trussgirder','girdersection','metalcrate'];
Promise.all(graveyardScrapFiles.map(name=>new Promise((resolve,reject)=>{
 deferredModelLoad(modelLoader,'./assets/models/'+name+'.glb?v=198',gltf=>resolve(gltf.scene),undefined,reject);
}))).then(models=>{
 try{graveyard.mountScrapModels(models)}catch(error){console.warn('Restos del cementerio no se pudieron montar; se conserva respaldo.',error)}
}).catch(error=>console.warn('No se pudieron cargar los restos 3D; se conservan los bloques de respaldo.',error));
let recoveryHullSource=null,recoveryPadSource=null;
function assembleRecoveryStation(){
 if(!recoveryHullSource||!recoveryPadSource)return;
 try{graveyard.mountStation(recoveryHullSource,recoveryPadSource)}catch(error){console.warn('No se pudo montar Recuperación; se conserva su respaldo.',error)}
}
deferredModelLoad(modelLoader,'./assets/models/estacion_recuperacion.glb?v=188',gltf=>{
 recoveryHullSource=gltf.scene;assembleRecoveryStation();
},undefined,error=>console.warn('Estación de Recuperación GLB no disponible; se conserva su respaldo.',error));
deferredModelLoad(modelLoader,'./assets/models/restos_anillo.glb?v=188',gltf=>{
 graveyard.mountRings(gltf.scene);
},undefined,error=>console.warn('Anillos destruidos no disponibles; se conservan los restos de respaldo.',error));
let wreckSourceA=null,wreckSourceB=null;
function assembleWreck(){
 if(!wreckSourceA||!wreckSourceB)return;
 try{graveyard.mountWreckShips([wreckSourceA,wreckSourceB])}
 catch(error){console.warn('Restos GLB no disponibles; se conserva respaldo',error)}
}
deferredModelLoad(modelLoader,'./assets/models/spaceship%20(3).glb?v=327',gltf=>{
 wreckSourceA=gltf.scene;assembleWreck();
},undefined,error=>console.warn('No se pudo cargar spaceship (3)',error));
deferredModelLoad(modelLoader,'./assets/models/spacecruiser%20(1).glb?v=327',gltf=>{
 wreckSourceB=gltf.scene;assembleWreck();
},undefined,error=>console.warn('No se pudo cargar spacecruiser (1)',error));
const SECTOR_BELT={x:10000,z:-650,radius:3000,warning:600,damagePerSecond:8};
const SECTOR_EMBER={x:23000,z:-650,radius:4500,warning:900,damagePerSecond:8};
const emberStation=new THREE.Group();emberStation.position.set(SECTOR_EMBER.x,0,SECTOR_EMBER.z);scene.add(emberStation);
const emberLandingPads=[];
const emberMetal=new THREE.MeshStandardMaterial({color:0x566271,metalness:.6,roughness:.55});
const emberLamp=new THREE.MeshBasicMaterial({color:0xffbd64});
function createStationJunction(){
 const piece=new THREE.Group();
 const metal=new THREE.MeshStandardMaterial({color:0x7b8997,metalness:.65,roughness:.55});
 const dark=new THREE.MeshStandardMaterial({color:0x243340,metalness:.6,roughness:.6});
 const lamp=new THREE.MeshBasicMaterial({color:0x65dfff});
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(90,110,80,8),metal);shell.position.y=-35;piece.add(shell);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(62,88,24,8),dark);top.position.y=17;piece.add(top);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(68,3,8,32),lamp);ring.rotation.x=Math.PI/2;ring.position.y=31;piece.add(ring);
 for(const [x,z]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const port=new THREE.Group();port.position.set(x*105,-10,z*105);port.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x,0,z));
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(22,22,50,12),dark);port.add(tube);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(23,4,8,16),metal);collar.rotation.x=Math.PI/2;collar.position.y=24;port.add(collar);
  const glow=new THREE.Mesh(new THREE.TorusGeometry(18,2,6,16),lamp);glow.rotation.x=Math.PI/2;glow.position.y=26;port.add(glow);
  piece.add(port);
 }
 for(const side of [-1,1]){
  const antenna=new THREE.Mesh(new THREE.BoxGeometry(5,42,5),metal);antenna.position.set(side*35,47,25);piece.add(antenna);
 }
 return piece;
}

const emberHub=createStationJunction();emberStation.add(emberHub);
for(const x of [-270,270]){
 const pad=new THREE.Group();pad.position.set(x,-10,0);pad.userData.landingRadius=165;
 pad.add(new THREE.Mesh(new THREE.CylinderGeometry(180,180,18,40),emberMetal));
 const rim=new THREE.Mesh(new THREE.TorusGeometry(166,3,8,40),emberLamp);rim.rotation.x=Math.PI/2;rim.position.y=10;pad.add(rim);emberStation.add(pad);emberLandingPads.push(pad);
 const bridge=new THREE.Mesh(new THREE.BoxGeometry(180,30,35),emberMetal);bridge.position.set(x*.5,-10,0);emberStation.add(bridge);
}
const emberBeacon=new THREE.Mesh(new THREE.CylinderGeometry(30,55,90,12),emberMetal);emberBeacon.position.y=40;emberStation.add(emberBeacon);
const emberRing=new THREE.Mesh(new THREE.TorusGeometry(56,4,8,32),emberLamp);emberRing.rotation.x=Math.PI/2;emberRing.position.y=25;emberStation.add(emberRing);
const beltStation=new THREE.Group();
beltStation.position.set(SECTOR_BELT.x,0,SECTOR_BELT.z);
beltStation.scale.copy(auroraStation.scale);scene.add(beltStation);
const beltLandingPads=[];
let beltStationReady=false;
function currentStation(){return activeSector==='graveyard'?graveyard.station:activeSector==='ember'?emberStation:activeSector==='belt'?beltStation:auroraStation}
function currentStationName(){return activeSector==='graveyard'?'Estación Recuperación':activeSector==='ember'?'Estación Ascuas':activeSector==='belt'?'Estación Cinturón':'Estación Aurora'}
function currentSectorName(){return activeSector==='graveyard'?'Cementerio de Naves':activeSector==='ember'?'Ascuas':activeSector==='belt'?'Cinturón Perdido':'Sector Aurora'}
function syncStationVisibility(){
 modelSector=activeSector;modelQueue.pump();
 graveyard.station.visible=activeSector==='graveyard'&&!PVP_MODE;
 auroraStation.visible=activeSector==='aurora';beltStation.visible=activeSector==='belt';emberStation.visible=activeSector==='ember';
 syncSectorEnvironment();
}
// Respaldo propio de la nueva estación mientras se cargan las mismas tres piezas.
function buildBeltStationFallback(){
 const assembly=new THREE.Group();
 const metal=new THREE.MeshStandardMaterial({color:0x627487,metalness:.45,roughness:.55});
 const light=new THREE.MeshBasicMaterial({color:0x44caff});
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(100,110,68,24),metal);hub.position.y=-38;assembly.add(hub);
 const tower=new THREE.Mesh(new THREE.CylinderGeometry(25,50,105,12),metal);tower.position.y=38;assembly.add(tower);
 for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(15,15,64,12),metal);
  tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x,0,z));
  tube.position.set(x*125,-42,z*125);assembly.add(tube);
 }
 for(const [x,z] of [[450,0],[0,-450]]){
  const pad=new THREE.Group();pad.position.set(x,-42,z);pad.userData.landingRadius=193.75;
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(156.25,156.25,16,48),metal);pad.add(deck);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(148,2.5,6,48),light);rim.rotation.x=Math.PI/2;rim.position.y=9;pad.add(rim);
  assembly.add(pad);beltLandingPads.push(pad);
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(36,28,150),metal);
  bridge.rotation.y=Math.atan2(x,z);bridge.position.set(x*.5,-42,z*.5);assembly.add(bridge);
 }
 beltStation.add(assembly);
 const beacon=new THREE.PointLight(0x27aaff,180,1200,2);beacon.position.y=100;beltStation.add(beacon);
}
buildBeltStationFallback();

// Luz de relleno desde arriba y abajo; sin sombras adicionales para móviles.
const beltLightTarget=new THREE.Object3D();beltLightTarget.position.y=-35;beltStation.add(beltLightTarget);
for(const [color,intensity,x,y,z] of [[0xc9e5ff,1.7,350,500,250],[0x88b8e8,1.15,-300,-350,-200]]){
 const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);light.target=beltLightTarget;beltStation.add(light);
}
function illuminateBeltMaterials(assembly){
 const copies=new Map();
 assembly.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const enhance=source=>{
   if(!source?.isMeshStandardMaterial)return source;
   if(copies.has(source))return copies.get(source);
   const material=source.clone();copies.set(source,material);
   material.metalness=Math.min(material.metalness,.55);
   material.roughness=Math.max(material.roughness,.48);
   if(material.map){
    material.emissiveMap=material.map;material.emissive.set(0xffffff);material.emissiveIntensity=1.35;
    material.onBeforeCompile=shader=>{
     shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
#ifdef USE_EMISSIVEMAP
 vec3 stationLamp=texture2D(emissiveMap,vEmissiveMapUv).rgb;
 float blueLamp=smoothstep(0.04,0.22,stationLamp.b-max(stationLamp.r,stationLamp.g)*0.75);
 float amberLamp=smoothstep(0.04,0.22,min(stationLamp.r,stationLamp.g*1.8)-stationLamp.b*1.8);
 float lampBrightness=smoothstep(0.08,0.35,max(stationLamp.r,max(stationLamp.g,stationLamp.b)));
 totalEmissiveRadiance*=stationLamp*max(blueLamp,amberLamp)*lampBrightness;
#endif
`);
    };
    material.customProgramCacheKey=()=> 'belt-station-lamps-v146';
   }
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(enhance):enhance(mesh.material);
 });
}

// Medir la boca exterior y su altura real, incluidos los tubos que sobresalen.
function stationConnector(model,direction,band=8,lateralLimit=Infinity){
 model.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(model),axis=Math.abs(direction.x)>.5?'x':'z';
 const side=axis==='x'?'z':'x',sign=direction[axis];
 const tip=sign>0?bounds.max[axis]:-bounds.min[axis];
 const opening=new THREE.Box3(),point=new THREE.Vector3();
 model.traverse(mesh=>{
  const positions=mesh.isMesh?mesh.geometry?.attributes?.position:null;if(!positions)return;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
   if(point[axis]*sign>=tip-band&&Math.abs(point[side])<=lateralLimit)opening.expandByPoint(point);
  }
 });
 if(opening.isEmpty())throw new Error('No se encontró una conexión de la estación');
 const center=opening.getCenter(new THREE.Vector3());center[axis]=tip*sign;
 return {center,size:opening.getSize(new THREE.Vector3()),side};
}
function buildBeltStation(hubSource,padSource,bridgeSource,fitted){
 const assembly=new THREE.Group(),hub=fitted(hubSource,315);
 hub.name='Núcleo Cinturón';assembly.add(hub);
 const pads=[];
 for(const direction of [new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1)]){
  const port=stationConnector(hub,direction);
  const pad=fitted(padSource,312.5); // 25 % más grande; núcleo idéntico al de Aurora.
  const rim=stationConnector(pad,direction.clone().negate(),18,25);
  pad.position.copy(direction).multiplyScalar(450);
  pad.position.y=port.center.y-rim.center.y;
  pad.position[port.side]=port.center[port.side]-rim.center[port.side];
  pad.userData.landingRadius=193.75;pad.name='Plataforma Cinturón';
  const padSocket=rim.center.clone().add(pad.position);
  // Solapar ligeramente ambos extremos con las bocas para evitar fisuras.
  const start=port.center.clone().addScaledVector(direction,-3);
  const end=padSocket.clone().addScaledVector(direction,4);
  const bridge=fitted(bridgeSource,start.distanceTo(end));
  const size=new THREE.Box3().setFromObject(bridge).getSize(new THREE.Vector3());
  const longX=size.x>size.z;
  const width=Math.max(20,port.size[port.side]*1.12),height=Math.max(20,port.size.y*1.12);
  if(longX)bridge.scale.z=width/size.z;else bridge.scale.x=width/size.x;
  bridge.scale.y=height/size.y;
  bridge.rotation.y=Math.atan2(direction.x,direction.z)+(longX?Math.PI/2:0);
  bridge.position.copy(start).add(end).multiplyScalar(.5);
  bridge.name='Corredor Cinturón';
  bridge.userData.connectionStart=start;bridge.userData.connectionEnd=end;
  assembly.add(bridge,pad);pads.push(pad);
 }
 // Las copias comparten geometrías y texturas: no se descargan assets duplicados.
 for(const child of [...beltStation.children])if(!child.isLight&&child!==beltLightTarget)beltStation.remove(child);
 illuminateBeltMaterials(assembly);
 beltStation.add(assembly);beltLandingPads.splice(0,beltLandingPads.length,...pads);
 beltStationReady=true;syncStationVisibility();
 console.info('Estación Cinturón montada: núcleo, 2 plataformas grandes y corredores en L.');
}

function buildEmberStation(hubSource,padSource,bridgeSource,fitted){
 const assembly=new THREE.Group(),hub=fitted(hubSource,315),pads=[];
 hub.name='Núcleo Ascuas';assembly.add(hub);
 for(const direction of [new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0)]){
  const port=stationConnector(hub,direction);
  const pad=fitted(padSource,360);
  const rim=stationConnector(pad,direction.clone().negate(),18,25);
  pad.position.copy(direction).multiplyScalar(460);
  pad.position.y=port.center.y-rim.center.y;
  pad.position[port.side]=port.center[port.side]-rim.center[port.side];
  pad.userData.landingRadius=216;pad.name='Plataforma Ascuas';
  const padSocket=rim.center.clone().add(pad.position);
  const start=port.center.clone().addScaledVector(direction,-3);
  const end=padSocket.clone().addScaledVector(direction,4);
  if(start.distanceTo(end)<20)throw new Error('Corredor Ascuas demasiado corto');
  const bridge=fitted(bridgeSource,start.distanceTo(end));
  const size=new THREE.Box3().setFromObject(bridge).getSize(new THREE.Vector3()),longX=size.x>size.z;
  const width=Math.max(20,port.size[port.side]*1.12),height=Math.max(20,port.size.y*1.12);
  if(longX)bridge.scale.z=width/size.z;else bridge.scale.x=width/size.x;
  bridge.scale.y=height/size.y;
  bridge.rotation.y=Math.atan2(direction.x,direction.z)+(longX?Math.PI/2:0);
  bridge.position.copy(start).add(end).multiplyScalar(.5);
  bridge.name='Corredor Ascuas';bridge.userData.connectionStart=start;bridge.userData.connectionEnd=end;
  assembly.add(bridge,pad);pads.push(pad);
 }
 // Compartir geometrías/texturas, pero aislar el acabado y la luz de cada sector.
 illuminateBeltMaterials(assembly);
 const materials=new Set();assembly.traverse(mesh=>{if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material)});
 for(const material of materials){
  if(!material?.isMeshStandardMaterial)continue;
  material.color.multiply(new THREE.Color(1,.94,.88));material.emissiveIntensity=1.65;
  if(material.map){
   material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
#ifdef USE_EMISSIVEMAP
 vec3 stationLamp=texture2D(emissiveMap,vEmissiveMapUv).rgb;
 float blueLamp=smoothstep(0.04,0.22,stationLamp.b-max(stationLamp.r,stationLamp.g)*0.75);
 float amberLamp=smoothstep(0.04,0.22,min(stationLamp.r,stationLamp.g*1.8)-stationLamp.b*1.8);
 float lampBrightness=smoothstep(0.08,0.35,max(stationLamp.r,max(stationLamp.g,stationLamp.b)));
 totalEmissiveRadiance*=vec3(1.0,0.58,0.20)*max(blueLamp,amberLamp)*lampBrightness;
#endif
`);
   };material.customProgramCacheKey=()=> 'ember-station-lamps-v173';material.needsUpdate=true;
  }
 }
 // Retirar la geometría simple solo cuando la estación detallada esté completa.
 for(const child of [...emberStation.children])if(!child.isLight)emberStation.remove(child);
 emberStation.add(assembly);emberLandingPads.splice(0,emberLandingPads.length,...pads);
 const light=new THREE.PointLight(0xffc08a,220,1100,2);light.position.set(0,180,0);emberStation.add(light);
 const fill=new THREE.PointLight(0xb7d9ff,90,850,2);fill.position.set(0,-100,0);emberStation.add(fill);
 syncStationVisibility();console.info('Estación Ascuas montada: núcleo GLB, 2 plataformas detalladas y corredores conectados a los puertos.');
}

// Estación Aurora definitiva: tres GLB independientes unidos sobre el respaldo procedural.
// Se ensambla solo cuando se descargan correctamente las tres piezas.
const modularLandingPads=[];
const modularPaths=[
 './assets/models/scififortress_optimizado.glb?v=327',
 './assets/models/landingpad_optimizado.glb?v=327',
 './assets/models/scificorridormodule_optimizado.glb?v=105'
];
Promise.all(modularPaths.map(path=>new Promise((resolve,reject)=>deferredModelLoad(modelLoader,path,gltf=>resolve(gltf.scene),undefined,reject))))
.then(([hubSource,padSource,bridgeSource])=>{
 recoveryPadSource=padSource;assembleRecoveryStation();
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
  const direction=new THREE.Vector3(x,0,z).normalize();
  const port=stationConnector(hub,direction);
  const pad=fitted(padSource,250),rim=stationConnector(pad,direction.clone().negate(),18,25);
  pad.position.set(x,port.center.y-rim.center.y,z);
  pad.position[port.side]=port.center[port.side]-rim.center[port.side];
  assembly.add(pad);modularLandingPads.push(pad);
  const start=port.center.clone().addScaledVector(direction,-3);
  const end=rim.center.clone().add(pad.position).addScaledVector(direction,4);
  const bridge=fitted(bridgeSource,start.distanceTo(end));
  const bridgeSize=new THREE.Box3().setFromObject(bridge).getSize(new THREE.Vector3());
  if(bridgeSize.x>bridgeSize.z)bridge.scale.z=Math.max(20,port.size[port.side]*1.12)/bridgeSize.z;
  else bridge.scale.x=Math.max(20,port.size[port.side]*1.12)/bridgeSize.x;
  bridge.scale.y=Math.max(20,port.size.y*1.12)/bridgeSize.y;
  bridge.rotation.y=Math.atan2(x,z)+(bridgeSize.x>bridgeSize.z?Math.PI/2:0);
  bridge.position.copy(start).add(end).multiplyScalar(.5);assembly.add(bridge);
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
 for(const [name,build]of [['Cinturón',buildBeltStation],['Ascuas',buildEmberStation]]){
  try{build(hubSource,padSource,bridgeSource,fitted)}catch(error){console.warn('No se pudo montar la estación '+name+'; se conserva su respaldo.',error)}
 }
 console.info('Estación Aurora modular montada: 1 núcleo, 4 plataformas y 4 corredores.');
}).catch(err=>{beltStationReady=true;console.warn('Estación modular no disponible: se mantienen los respaldos de cada sector.',err)});
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
// Tipos de enemigos y recompensas; el Coloso escala hasta nivel 105 y conserva su progreso.
const TYPES={
 scout:{hp:35,damage:5,speed:120,xp:18,gold:10,loot:1,color:0xe65757},
 raider:{hp:70,damage:10,speed:150,xp:36,gold:20,loot:2,color:0xe78b45},
 sentinel:{hp:140,damage:20,speed:90,xp:72,gold:40,loot:4,color:0xb86bd9},destroyer:{hp:280,damage:35,speed:110,xp:130,gold:80,loot:6,color:0xff3d9b},
 devastator:{hp:196,damage:70,speed:155,xp:195,gold:120,loot:6,color:0xff7733},
 catapult:{hp:3000,damage:300,speed:75,xp:1200,gold:800,loot:8,color:0x815942},
 harpooner:{hp:5000,damage:50,speed:130,xp:1600,gold:1200,loot:7,color:0x505b69},
 stalker:{hp:4000,damage:250,speed:155,xp:2000,gold:1600,loot:8,color:0xa52a35},
 granTitan:{...TITAN_STATS,speed:0,color:0x555b63},
 carrier:{hp:40000,damage:150,speed:0,xp:15000,gold:10000,loot:30,color:0x606a78}
};
for(const [type,baseline]of Object.entries(ENEMY_BASELINES))Object.assign(TYPES[type],baseline);
// Escalado limitado por nivel: los enemigos de Aurora siguen siendo accesibles
// para principiantes y ganan resistencia a medida que progresa el jugador.
function enemyDifficultyScale(){
 const level=Math.max(1,Math.floor(Number(player.level)||1));
 return Math.min(5,1+Math.max(0,level-1)*.10);
}
function enemyMaxHp(type){return type==='granTitan'?Math.round(TITAN_STATS.hp*titanScale(player.level)):type==='carrier'?Math.round(TYPES.carrier.hp*advancedEnemyScale(player.level,30)):type==='catapult'||type==='harpooner'||type==='stalker'?Math.round(TYPES[type].hp*advancedEnemyScale(player.level,40)):type==='devastator'?Math.round(enemyMaxHp('destroyer')*.7):Math.round(TYPES[type].hp*enemyDifficultyScale())}
function enemyRewardScale(){return Math.min(2.5,1+Math.max(0,(Number(player.level)||1)-1)*.035)}
const enemyKinds=[...Array(34).fill('scout'),...Array(19).fill('raider'),...Array(20).fill('sentinel'),...Array(19).fill('destroyer'),...Array(10).fill('devastator'),...Array(12).fill('catapult'),...Array(12).fill('harpooner'),...Array(8).fill('stalker')]; // Aproximadamente +40%: 53 enemigos en Aurora y 39 en Cinturón; Ascuas conserva 16 Destructores.
function randomEnemyHome(type){
 // Los fuertes tienden a estar más lejos, pero pueden aparecer en cualquier dirección.
 const min=type==='scout'?850:type==='raider'?1200:1700;
 return randomSectorPosition(min,MAP_CENTER_X===SECTOR_EMBER.x||MAP_CENTER_X===GRAVEYARD.x?4420:2920);
}
const proBadgeTexture=(()=>{const c=document.createElement('canvas');c.width=192;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#ffce60';ctx.font='bold 45px system-ui';ctx.textAlign='center';ctx.fillText('PRO',96,49);return new THREE.CanvasTexture(c)})();
const proBadgeMaterial=new THREE.SpriteMaterial({map:proBadgeTexture,transparent:true,depthTest:false});
const enemies=[...enemyKinds.map(type=>({type})),...proPopulation()].map(({type,pro=false,proSector},i)=>{
 const t=TYPES[type],mesh=['catapult','harpooner'].includes(type)?graveyard.enemyVisual(type):ship(t.color,type);scene.add(mesh);
 const home=randomEnemyHome(type);mesh.position.copy(home);mesh.visible=type==='scout'||type==='raider';
 if(pro){const badge=new THREE.Sprite(proBadgeMaterial);badge.position.set(0,100,0);badge.scale.set(85,28,1);mesh.add(badge);mesh.userData.proBadge=badge}
 const maxHp=enemyMaxHp(type)*proMultiplier({type,pro});return {type,pro,proSector,mesh,home,hp:maxHp,maxHp,dead:0,angle:i,aggressive:!pro&&type!=='devastator',fireTimer:1+Math.random()*2};
});

linkScrapPairs(enemies.filter(e=>!e.pro));
function enemyBelongsToSector(e,rank=1){
 if(e.pro)return activeSector===e.proSector;
 if(e.titanAdd||e.type==='granTitan')return activeSector==='graveyard';
 if(activeSector==='graveyard')return e.type==='catapult'||e.type==='harpooner'||e.type==='stalker';
 if(e.bossAdd||e.type==='carrier')return activeSector==='ember';
 if(activeSector==='aurora')return e.type==='scout'||e.type==='raider';
 if(activeSector==='belt')return e.type==='sentinel'||e.type==='destroyer'&&rank<=19;
 return e.type==='destroyer'&&rank<=16||e.type==='devastator';
}

// Activate the assembled model only when every uploaded piece is ready.
const catapultParts={};
function assembleCatapultParts(){
 if(!catapultParts.hull||!catapultParts.stand||!catapultParts.arm||!catapultParts.bomb)return;
 for(const e of enemies){
  if(e.type!=='catapult'||e.mesh.userData.catapultRig)continue;
  const rig=createCatapultRig(THREE,catapultParts);
  for(const child of e.mesh.children)child.visible=false;
  e.mesh.add(rig.root);e.mesh.userData.catapultRig=rig;e.mesh.userData.catapultArm=null;
 }
}
for(const [key,file]of [['hull','catapulta_casco'],['stand','catapulta_soporte'],['arm','catapulta_brazo'],['bomb','catapulta_bomba']]){
 deferredModelLoad(modelLoader,'./assets/models/'+file+'.glb?v=182',gltf=>{
  const template=gltf.scene;template.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
  catapultParts[key]=template;assembleCatapultParts();assembleHarpoonParts();
 },undefined,error=>console.warn('Pieza de catapulta no disponible: '+file+'; se conserva el respaldo.',error));
}
const harpoonParts={};
function assembleHarpoonParts(){
 if(!catapultParts.hull||!harpoonParts.launcher||!harpoonParts.spool||!harpoonParts.spear)return;
 for(const e of enemies){if(e.type!=='harpooner'||e.mesh.userData.harpoonRig)continue;
 const rig=createHarpoonRig(THREE,{...harpoonParts,hull:catapultParts.hull});
 for(const child of e.mesh.children)child.visible=false;e.mesh.add(rig.root);e.mesh.userData.harpoonRig=rig;
 }
}
for(const [key,file]of [['launcher','arponero_lanzador'],['spool','arponero_carrete'],['spear','arponero_arpon']]){
 deferredModelLoad(modelLoader,'./assets/models/'+file+'.glb?v=186',gltf=>{
 harpoonParts[key]=gltf.scene;assembleHarpoonParts();
 },undefined,error=>console.warn('Pieza de arponero no disponible: '+file+'; se conserva el respaldo.',error));
}
// Diseño propio del Devastador: casco metálico cobrizo y dos alas largas.
for(const e of enemies.filter(e=>e.type==='devastator')){
 const armor=new THREE.MeshStandardMaterial({color:0xd86d31,metalness:.7,roughness:.5});
 for(const side of [-1,1]){
  const blade=new THREE.Mesh(new THREE.BoxGeometry(15,8,155),armor);blade.position.set(side*48,12,0);blade.rotation.y=side*.2;e.mesh.add(blade);
 }
}

deferredModelLoad(modelLoader,'./assets/models/devastador.glb?v=185',gltf=>{
 const template=gltf.scene;template.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(template),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const span=Math.max(size.x,size.y,size.z);if(!Number.isFinite(span)||span<.001)return;
 const factor=160/span;
 for(const e of enemies){
  if(e.type!=='devastator')continue;
  const visual=new THREE.Group(),model=template.clone(true);
  model.scale.multiplyScalar(factor);model.position.multiplyScalar(factor).addScaledVector(center,-factor);
  // Source nose points +X; enemy lookAt uses +Z.
  visual.rotation.y=-Math.PI/2;visual.add(model);
  visual.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
  for(const child of e.mesh.children)child.visible=false;
  e.mesh.add(visual);e.mesh.userData.devastadorModel=visual;
 }
},undefined,error=>console.warn('Devastador GLB no disponible; se conserva el respaldo.',error));
// Reutilizar una sola plantilla para todos los Acechadores, incluso los reaparecidos.
let acechadorTemplate=null,acechadorScale=1,acechadorCenter=null;
function ensureAcechadorVisual(e){
 if(e.type!=='stalker'||!acechadorTemplate||e.mesh.userData.acechadorModel)return;
 const pivot=new THREE.Group(),visual=acechadorTemplate.clone(true);
 visual.scale.setScalar(acechadorScale);
 visual.position.copy(acechadorCenter).multiplyScalar(-acechadorScale);
 pivot.add(visual);
 e.mesh.add(pivot);
 pivot.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 for(const child of e.mesh.children)if(child!==pivot)child.visible=false;
 e.mesh.userData.acechadorModel=pivot;
}
deferredModelLoad(modelLoader,'./assets/models/acechador_optimizado.glb?v=327',gltf=>{
 const template=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(template);
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const span=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(span)||span<.001)return;
 acechadorTemplate=template;
 acechadorCenter=center;
 acechadorScale=155/span;
 for(const e of enemies)ensureAcechadorVisual(e);
},undefined,error=>console.warn('Acechador GLB no disponible; se conserva la nave provisional.',error));
const rawBoss=player.carrierState&&typeof player.carrierState==='object'?player.carrierState:{};
const bossMaxHp=enemyMaxHp('carrier');
const bossState={hp:Number.isFinite(+rawBoss.hp)?scaledHealth(+rawBoss.hp,+rawBoss.maxHp||20000,bossMaxHp):bossMaxHp,
 respawnAt:Number.isFinite(+rawBoss.respawnAt)?+rawBoss.respawnAt:0,
 phases:Array.isArray(rawBoss.phases)?[...new Set(rawBoss.phases.filter(x=>[0,90,70,50,30,10].includes(x)))]:[],rewarded:!!rawBoss.rewarded};
if(bossState.rewarded)bossState.hp=0;
if(bossState.hp<=0&&!bossState.respawnAt)bossState.respawnAt=Date.now()+120000;
const carrierMesh=new THREE.Group(),carrierPanels=[];
const carrierMetal=new THREE.MeshStandardMaterial({color:0x687584,metalness:.65,roughness:.55});
const carrierDark=new THREE.MeshStandardMaterial({color:0x17222c,metalness:.55,roughness:.65});
const carrierGlow=new THREE.MeshBasicMaterial({color:0xff7136});
const carrierCore=new THREE.Mesh(new THREE.BoxGeometry(230,115,450),carrierDark);carrierMesh.add(carrierCore);
for(const side of [-1,1]){
 const hinge=new THREE.Group();hinge.position.set(side*112,0,0);carrierMesh.add(hinge);
 const panel=new THREE.Mesh(new THREE.BoxGeometry(130,105,410),carrierMetal);panel.position.x=side*58;hinge.add(panel);carrierPanels.push({hinge,side});
 for(const z of [-140,0,140]){
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(12,8,70),carrierGlow);lamp.position.set(side*118,58,z);hinge.add(lamp);
 }
}
const carrierTower=new THREE.Mesh(new THREE.BoxGeometry(110,55,120),carrierMetal);carrierTower.position.set(0,85,-85);carrierMesh.add(carrierTower);
for(const x of [-65,65]){
 const engine=new THREE.Mesh(new THREE.CylinderGeometry(25,25,25,16),carrierGlow);engine.rotation.x=Math.PI/2;engine.position.set(x,0,240);carrierMesh.add(engine);
}
carrierMesh.position.set(SECTOR_EMBER.x,180,SECTOR_EMBER.z-2400);
if(Array.isArray(rawBoss.position)&&rawBoss.position.length===3&&rawBoss.position.every(Number.isFinite)&&Math.hypot(rawBoss.position[0]-SECTOR_EMBER.x,rawBoss.position[1],rawBoss.position[2]-SECTOR_EMBER.z)<4300)carrierMesh.position.fromArray(rawBoss.position);
carrierMesh.scale.setScalar(2);carrierMesh.visible=false;scene.add(carrierMesh);
const carrierEnemy={type:'carrier',mesh:carrierMesh,home:carrierMesh.position.clone(),hp:bossState.hp,maxHp:bossMaxHp,dead:bossState.hp>0?0:Infinity,fireTimer:5};
enemies.push(carrierEnemy);
for(const enemy of enemies)enhanceEnemyMaterials(enemy.mesh);
function spawnCarrierAdd(type,guard=false,snapshot=null){
 let e=enemies.find(e=>e.bossAdd&&e.dead&&e.type===type);
 if(!e){
  const original=enemies.find(e=>!e.bossAdd&&e.type===type);
  const mesh=original?original.mesh.clone(true):ship(TYPES[type].color,type);enhanceEnemyMaterials(mesh);scene.add(mesh);
  e={type,mesh,home:new THREE.Vector3(),bossAdd:true};enemies.push(e);
 }
 const maxHp=enemyMaxHp(type);
 e.launchRemaining=0;e.launchAge=0;e.launchSlot=null;e.launchWait=0;
 e.maxHp=maxHp;e.hp=snapshot?THREE.MathUtils.clamp(Number(snapshot.hp)||maxHp,1,maxHp):maxHp;e.dead=0;e.guard=guard;e.aggressive=true;e.fireTimer=1+Math.random();
 const angle=Math.random()*Math.PI*2,radius=340+Math.random()*220;
 const position=snapshot?.position;
 if(Array.isArray(position)&&position.length===3&&position.every(Number.isFinite)&&Math.hypot(position[0]-SECTOR_EMBER.x,position[1],position[2]-SECTOR_EMBER.z)<4700)e.mesh.position.fromArray(position);
 else if(carrierMesh.userData.hangarExits?.length){
  const slot=(carrierMesh.userData.nextHangar||0)%carrierMesh.userData.hangarExits.length;carrierMesh.userData.nextHangar=slot+1;
  carrierMesh.updateMatrixWorld(true);
  e.mesh.position.copy(carrierMesh.localToWorld(carrierMesh.userData.hangarExits[slot].clone()));
  e.launchStart=e.mesh.position.clone();e.launchDirection=carrierMesh.userData.hangarDirections[slot].clone().transformDirection(carrierMesh.matrixWorld);e.launchRemaining=3;
  e.launchSlot=slot;e.launchWait=enemies.filter(other=>other!==e&&other.launchRemaining>0&&other.launchSlot===slot).reduce((wait,other)=>Math.max(wait,other.launchWait+other.launchRemaining),0);
 }else e.mesh.position.copy(carrierMesh.position).add(new THREE.Vector3(Math.cos(angle)*radius,(Math.random()-.5)*200,Math.sin(angle)*radius));
 if(snapshot?.launch&&Array.isArray(snapshot.launch.start)&&snapshot.launch.start.length===3&&snapshot.launch.start.every(Number.isFinite)&&Array.isArray(snapshot.launch.direction)&&snapshot.launch.direction.length===3&&snapshot.launch.direction.every(Number.isFinite)){
  e.launchStart=new THREE.Vector3().fromArray(snapshot.launch.start);e.launchDirection=new THREE.Vector3().fromArray(snapshot.launch.direction).normalize();
  e.launchAge=THREE.MathUtils.clamp(Number(snapshot.launch.age)||0,0,3);e.launchRemaining=3-e.launchAge;e.launchWait=THREE.MathUtils.clamp(Number(snapshot.launch.wait)||0,0,120);e.launchSlot=Number(snapshot.launch.slot)||0;
 }
 e.home.copy(e.mesh.position);e.mesh.visible=false;return e;
}
if(Array.isArray(rawBoss.adds)&&(bossState.hp>0||Date.now()<bossState.respawnAt)){
 for(const add of rawBoss.adds)if(['raider','sentinel','destroyer'].includes(add.type))spawnCarrierAdd(add.type,!!add.guard,add);
}
function persistCarrierState(){
 player.carrierState={hp:bossState.hp,maxHp:carrierEnemy.maxHp,phases:[...bossState.phases],rewarded:bossState.rewarded,respawnAt:bossState.respawnAt,position:carrierMesh.position.toArray(),
 adds:enemies.filter(e=>e.bossAdd&&!e.dead&&e.hp>0).map(e=>({type:e.type,hp:e.hp,guard:!!e.guard,position:e.mesh.position.toArray(),...(e.launchRemaining>0?{launch:{start:e.launchStart.toArray(),direction:e.launchDirection.toArray(),age:e.launchAge,wait:e.launchWait,slot:e.launchSlot}}:{})}))};
}
function triggerCarrierWaves(){
 if(bossState.hp<=0)return;
 const phases=[{at:0,type:'sentinel',count:2},{at:90,type:'raider',count:5},{at:70,type:'sentinel',count:4},{at:50,type:'sentinel',count:8},{at:30,type:'destroyer',count:7},{at:10,type:'sentinel',count:0}];
 const percent=100*bossState.hp/carrierEnemy.maxHp;
 for(const phase of phases){
  if(bossState.phases.includes(phase.at)||phase.at!==0&&percent>phase.at)continue;
  bossState.phases.push(phase.at);
  for(let i=0;i<phase.count;i++){const e=spawnCarrierAdd(phase.type);e.mesh.visible=activeSector==='ember'&&!e.launchRemaining}
 }
}
function clearCarrierAdds(){
 const removed=new Set(enemies.filter(e=>e.bossAdd));
 for(let i=enemies.length-1;i>=0;i--){
  const e=enemies[i];if(!removed.has(e))continue;
  e.hp=0;e.dead=Infinity;e.guard=false;e.launchRemaining=0;e.mesh.visible=false;
  scene.remove(e.mesh);enemies.splice(i,1);explorerThreats.delete(e);
 }
 for(let i=enemyShots.length-1;i>=0;i--){
  if(!removed.has(enemyShots[i].owner))continue;
  removeMissileEffects(enemyShots[i]);scene.remove(enemyShots[i].mesh);enemyShots.splice(i,1);
 }
 if(removed.has(lockedEnemy)){lockedEnemy=null;lockFrame.classList.add('hidden')}
 if(removed.has(explorerThreat))explorerThreat=null;
 if(removed.has(explorerManualTarget)){explorerManualTarget=null;explorerManualUntil=0}
 // No kill(): expiration gives no rewards or mission progress. Shared assets stay alive.
}
function respawnCarrier(){
 clearCarrierAdds();
 const angle=Math.random()*Math.PI*2,y=(Math.random()-.5)*.8,radius=1800+Math.random()*2300,horizontal=Math.sqrt(1-y*y);
 carrierMesh.position.set(SECTOR_EMBER.x+Math.cos(angle)*horizontal*radius,y*radius,SECTOR_EMBER.z+Math.sin(angle)*horizontal*radius);
 carrierEnemy.home.copy(carrierMesh.position);carrierEnemy.hp=carrierEnemy.maxHp=enemyMaxHp('carrier');carrierEnemy.dead=0;carrierEnemy.mesh.visible=activeSector==='ember';
 bossState.hp=carrierEnemy.maxHp;carrierEnemy.fireTimer=5;bossState.phases=[];bossState.rewarded=false;bossState.respawnAt=0;
 save();if(activeSector==='ember')lootToast('🚨 El Coloso Portanaves ha reaparecido');
}
function advanceCarrierLaunch(e,dt){
 if(activeSector!=='ember'){e.mesh.visible=false;return}
 const panel=carrierPanels[e.launchSlot];
 // Esperar a que la abertura esté despejada y dejar salir una nave por hangar.
 if(bossState.hp>0&&panel&&Math.abs(panel.hinge.rotation[panel.axis||'z'])<1.1){e.mesh.visible=false;return}
 if(e.launchWait>0){e.launchWait=Math.max(0,e.launchWait-dt);e.mesh.visible=false;return}
 e.launchAge=Math.min(3,e.launchAge+dt);e.launchRemaining=3-e.launchAge;
 e.mesh.visible=true;
 e.mesh.position.copy(e.launchStart).addScaledVector(e.launchDirection,e.launchAge*150);
 e.mesh.lookAt(e.mesh.position.clone().add(e.launchDirection));e.home.copy(e.mesh.position);
}
function patrolCarrierAdd(e,dt,now){
 if(!e.patrolTarget||now>=e.nextPatrol||e.mesh.position.distanceTo(e.patrolTarget)<60){
  const angle=Math.random()*Math.PI*2,y=(Math.random()-.5)*.9,radius=1100+Math.random()*3100,horizontal=Math.sqrt(1-y*y);
  e.patrolTarget=new THREE.Vector3(SECTOR_EMBER.x+Math.cos(angle)*horizontal*radius,y*radius,SECTOR_EMBER.z+Math.sin(angle)*horizontal*radius);e.nextPatrol=now+12+Math.random()*12;
 }
 const delta=e.patrolTarget.clone().sub(e.mesh.position),distance=delta.length();
 if(distance>1)e.mesh.position.addScaledVector(delta,Math.min(distance,TYPES[e.type].speed*.65*dt)/distance);
 e.mesh.lookAt(e.patrolTarget);
}
let carrierPatrolClock=0;
const carrierSteering=new THREE.Object3D();
function updateCarrier(dt){if(PVP_MODE)return;
 // Movimiento continuo y pausado del portanaves; no modifica cadencia de disparo.
 if(activeSector==='ember'&&bossState.hp>0){
  carrierPatrolClock+=dt;
  const origin=carrierEnemy.home;
  const target=new THREE.Vector3(origin.x+Math.cos(carrierPatrolClock*.055)*620,origin.y+Math.sin(carrierPatrolClock*.12)*35,origin.z+Math.sin(carrierPatrolClock*.055)*620);
  const step=target.clone().sub(carrierMesh.position);
  const distance=step.length();
  if(distance>2){
   // El frente del casco es +Z tras la rotación del rig. Girar y avanzar
   // sobre ese mismo eje evita desplazamientos laterales o marcha atrás.
   carrierSteering.position.copy(carrierMesh.position);carrierSteering.lookAt(target);
   carrierMesh.quaternion.slerp(carrierSteering.quaternion,1-Math.exp(-dt*1.8));
   carrierMesh.translateZ(Math.min(distance,32*dt));
  }
 }
 const flames=carrierMesh.userData.colosoFlames;
 if(flames)for(let i=0;i<flames.length;i++){
  const f=flames[i];f.scale.y=1+.13*Math.sin(carrierPatrolClock*12+i*1.7);
  f.material.opacity=.72+.16*Math.sin(carrierPatrolClock*15+i);
 }

 const maximum=enemyMaxHp('carrier');
 if(carrierEnemy.maxHp!==maximum){bossState.hp=scaledHealth(bossState.hp,carrierEnemy.maxHp,maximum);carrierEnemy.maxHp=maximum;carrierEnemy.hp=bossState.hp}
 if(activeSector==='ember'&&bossState.hp>0&&!docked&&!landing&&!inSafeZone(playerMesh.position)&&carrierMesh.position.distanceTo(playerMesh.position)<=COMBAT_RANGE){
  carrierEnemy.fireTimer-=dt;if(carrierEnemy.fireTimer<=0){fireCarrierMissile();carrierEnemy.fireTimer=5}
 }else carrierEnemy.fireTimer=5;
 if(bossState.hp<=0&&Date.now()>=bossState.respawnAt)respawnCarrier();
 for(const {hinge,side,axis='z',openAngle=-side*.62}of carrierPanels)hinge.rotation[axis]=THREE.MathUtils.lerp(hinge.rotation[axis],bossState.phases.includes(0)?openAngle:0,Math.min(1,dt*2));
 if(activeSector!=='ember'||bossState.hp<=0||!bossState.phases.includes(10))return;
 let alive=enemies.filter(e=>e.bossAdd&&e.guard&&e.type==='sentinel'&&!e.dead).length;
 while(alive++<10){const e=spawnCarrierAdd('sentinel',true);e.mesh.visible=!e.launchRemaining}
}
// Gran Titán occupies the outer Cemetery; all its transient attacks clear on travel.
const titanRig=createGranTitan(THREE,scene,{position:new THREE.Vector3(GRAVEYARD.x+2300,120,GRAVEYARD.z-1900)});
const titanSaved=player.granTitanState||{},titanMaximum=enemyMaxHp('granTitan');
const titanRespawn=Number(titanSaved.respawnAt)||0;
const titanEnemy={type:'granTitan',mesh:titanRig.root,home:titanRig.root.position.clone(),maxHp:titanMaximum,hp:titanSaved.hp===0&&Date.now()<titanRespawn?0:scaledHealth(Number.isFinite(titanSaved.hp)?titanSaved.hp:titanMaximum,titanSaved.maxHp||titanMaximum,titanMaximum),dead:0,respawnAt:titanRespawn,fireTimer:0,aggressive:false};
titanEnemy.dead=titanEnemy.hp<=0?Infinity:0;titanEnemy.mesh.visible=false;enemies.push(titanEnemy);
const titanCycle=createTitanCycle(),titanProjectiles=[],titanBlasts=[],titanEffects=createTitanEffects(THREE,()=>graphics.profile.sparks);
let titanWaveTimer=12,titanPatrolAngle=Number.isFinite(titanSaved.patrolAngle)?titanSaved.patrolAngle:Math.atan2(-1900,2300);
if(Array.isArray(titanSaved.position)&&titanSaved.position.length===3&&titanSaved.position.every(Number.isFinite)){
 const v=new THREE.Vector3().fromArray(titanSaved.position),r=Math.hypot(v.x-GRAVEYARD.x,v.z-GRAVEYARD.z);
 if(r>1800&&r<3400&&Math.abs(v.y)<350)titanEnemy.mesh.position.copy(v);
}
deferredModelLoad(new GLTFLoader(),'./assets/models/gran_titan.glb?v=327',gltf=>titanRig.mount(gltf.scene),undefined,error=>console.warn('Gran Titán: modelo no disponible',error));
function clearTitanShots(){for(const p of titanProjectiles){titanEffects.dispose(p.mesh);if(p.marker)titanEffects.dispose(p.marker)}titanProjectiles.length=0;for(const b of titanBlasts)titanEffects.dispose(b.mesh);titanBlasts.length=0}
function titanHit(point){const p=titanEnemy.mesh.worldToLocal(point.clone());return (p.x/145)**2+(p.y/170)**2+(p.z/600)**2<1}
function fireTitan(){
 const scale=titanScale(player.level),kind=titanCycle.kind;
 combatAudio.play(kind==='spear'?'harpoon':'bombLaunch',titanEnemy.mesh.position);
 titanEnemy.mesh.updateMatrixWorld(true);
 const local=titanEnemy.mesh.worldToLocal(playerMesh.position.clone()),side=local.x<0?-1:1;
 if(kind==='spear'){
  const start=titanRig.muzzle(kind,side,titanCycle.round),aim=playerMesh.position.clone().sub(start).normalize();
  let across=new THREE.Vector3().crossVectors(aim,new THREE.Vector3(0,1,0)).normalize();if(across.lengthSq()<.01)across.set(1,0,0);
  for(const lane of titanPattern(titanCycle.round)){
   const dir=aim.clone().addScaledVector(across,lane*.13).normalize();
   const mesh=titanEffects.spear();mesh.position.copy(start);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(mesh);
   titanProjectiles.push({mesh,velocity:dir.multiplyScalar(570),life:5,age:0,start:start.clone(),damage:TITAN_STATS.damage*scale});
  }
 }else for(const [i,offset]of titanBombOffsets(titanCycle.round).entries()){
  const target=playerMesh.position.clone().add(new THREE.Vector3(offset.x,0,offset.z));
  const marker=titanEffects.marker();marker.position.copy(target);scene.add(marker);
  const mesh=titanEffects.bomb();mesh.position.copy(titanRig.muzzle(kind,side,i));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),target.clone().sub(mesh.position).normalize());scene.add(mesh);
  titanProjectiles.push({mesh,marker,target,start:mesh.position.clone(),age:0,life:TITAN_BOMB_FUSE,damage:450*scale,bomb:true});
 }
}
function spawnTitanWave(){
 for(const type of ['catapult','harpooner','stalker']){
  if(enemies.filter(e=>e.titanAdd&&!e.dead).length>=6)break;
  let e=enemies.find(e=>e.titanAdd&&e.dead&&e.type===type);
  if(!e){const mesh=['catapult','harpooner'].includes(type)?graveyard.enemyVisual(type):ship(TYPES[type].color,type);scene.add(mesh);e={type,mesh,home:new THREE.Vector3(),titanAdd:true};enemies.push(e)}
  e.hp=e.maxHp=enemyMaxHp(type);e.dead=0;e.aggressive=true;e.fireTimer=3;e.mesh.visible=true;e.mesh.position.copy(titanRig.muzzle('bomb',Math.random()<.5?-1:1)).add(new THREE.Vector3(0,-65,0));e.home.copy(e.mesh.position);
 }
 assembleCatapultParts();assembleHarpoonParts();for(const e of enemies)if(e.titanAdd)ensureAcechadorVisual(e);
}
function updateGranTitan(dt){if(PVP_MODE)return;
 const max=enemyMaxHp('granTitan');if(max!==titanEnemy.maxHp){titanEnemy.hp=scaledHealth(titanEnemy.hp,titanEnemy.maxHp,max);titanEnemy.maxHp=max}
 if(titanEnemy.dead&&Date.now()>=titanEnemy.respawnAt){titanEnemy.dead=0;titanEnemy.hp=max;titanEnemy.aggressive=false;titanWaveTimer=12}
 titanEnemy.mesh.visible=activeSector==='graveyard'&&!titanEnemy.dead;
 if(titanEnemy.mesh.visible){
  titanRig.updateEngines(performance.now()/1000,true);
  titanPatrolAngle+=dt*70/2800;
  const p=titanPatrolPoint(titanPatrolAngle),goal=new THREE.Vector3(GRAVEYARD.x+p.x,p.y,GRAVEYARD.z+p.z),delta=goal.sub(titanEnemy.mesh.position),d=delta.length();
  if(d>.01)titanEnemy.mesh.position.addScaledVector(delta,Math.min(d,70*dt)/d);
  const ahead=titanPatrolPoint(titanPatrolAngle+.1),heading=new THREE.Vector3(GRAVEYARD.x+ahead.x,ahead.y,GRAVEYARD.z+ahead.z);
  const orientation=new THREE.Matrix4().lookAt(heading,titanEnemy.mesh.position,new THREE.Vector3(0,1,0));
  titanEnemy.mesh.quaternion.rotateTowards(new THREE.Quaternion().setFromRotationMatrix(orientation),dt*.16);
 }
 const available=titanEnemy.mesh.visible&&!docked&&!landing&&!inSafeZone(playerMesh.position);
 if(!available||playerMesh.position.distanceTo(titanEnemy.mesh.position)>2000)titanEnemy.aggressive=false;
 const active=titanEnemy.aggressive&&titanEnemy.mesh.visible&&!docked&&!landing&&!inSafeZone(playerMesh.position)&&playerMesh.position.distanceTo(titanEnemy.mesh.position)<=COMBAT_RANGE;
 const step=advanceTitanCycle(titanCycle,dt,active);titanRig.pose(step.open,titanCycle.kind);
 if(step.fire)fireTitan();
 if(active){titanWaveTimer-=dt;if(titanWaveTimer<=0){spawnTitanWave();titanWaveTimer=30}}else titanWaveTimer=12;
 for(let i=titanProjectiles.length-1;i>=0;i--){const p=titanProjectiles[i],before=p.mesh.position.clone();p.life-=dt;
  p.age+=dt;titanEffects.animateProjectile(p.mesh,p.age,p.bomb);
  if(p.bomb){p.mesh.position.lerpVectors(p.start,p.target,titanBombProgress(p.age));titanEffects.animateMarker(p.marker,p.age,camera);if(p.life<=0&&available){combatAudio.play('heavyBlast',p.target);const mesh=titanEffects.blast(p.target);scene.add(mesh);titanBlasts.push({mesh,age:0})}if(p.life<=0&&available&&p.target.distanceTo(playerMesh.position)<150)applyPlayerDamage(Math.max(1,p.damage-player.defense*.25))}
  else{p.mesh.position.addScaledVector(p.velocity,dt);if(available&&segmentDistance(before,p.mesh.position,playerMesh.position)<40){scrapCombat.snag(titanEnemy,p.start);applyPlayerDamage(Math.max(1,p.damage-player.defense*.25));p.life=0}}
  if(p.life<=0||!available){titanEffects.dispose(p.mesh);if(p.marker)titanEffects.dispose(p.marker);titanProjectiles.splice(i,1)}
 }
 for(let i=titanBlasts.length-1;i>=0;i--){const b=titanBlasts[i];b.age+=dt;if(b.age>=TITAN_BLAST_DURATION||!available){titanEffects.dispose(b.mesh);titanBlasts.splice(i,1)}else titanEffects.animateBlast(b.mesh,b.age,camera)}
}

function damageEnemy(e,damage,missile=false){if(e.pvpRemote)return;
 if(e.dead||!e.mesh.visible)return;
 e.aggressive=true;e.hp=Math.max(0,e.hp-damage);
 if(damage>0)combatAudio.play(missile?'explosion':'impact',e.mesh.position);
 if(e.type==='carrier'){bossState.hp=e.hp;if(e.hp>0)triggerCarrierWaves()}
 if(e.hp<=0)kill(e,missile);
 else if(e.type==='carrier')save();
}
function clearCombatShots(){
 scrapCombat.clear();clearTitanShots();
 for(const p of enemyShots){removeMissileEffects(p);scene.remove(p.mesh)}enemyShots.length=0;
 for(const p of shots){removeMissileEffects(p);scene.remove(p.mesh)}shots.length=0;
}


let colosoHullTemplate=null,colosoDoorTemplate=null;
function enhanceEnemyMaterials(model){
 const copies=new Map();
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const enhance=source=>{
   if(!source?.isMeshStandardMaterial||source.userData.enemyVisibility175)return source;
   if(copies.has(source))return copies.get(source);
   const material=source.clone(),previous=source.onBeforeCompile,previousKey=source.customProgramCacheKey();
   material.userData.enemyVisibility175=true;copies.set(source,material);
   material.metalness=Math.min(material.metalness,.52);material.metalnessMap=null;
   material.roughness=Math.max(material.roughness,.5);material.roughnessMap=null;
   material.onBeforeCompile=shader=>{
    previous.call(material,shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 // Levantar los tonos oscuros de la textura sin cambiar su tono ni el alfa.
 diffuseColor.rgb=mix(diffuseColor.rgb,sqrt(max(diffuseColor.rgb,vec3(0.0))),0.28);
`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float enemyBlueLamp=smoothstep(0.06,0.25,diffuseColor.b-max(diffuseColor.r,diffuseColor.g));
 float enemyWarmLamp=smoothstep(0.06,0.25,diffuseColor.r-diffuseColor.b)*smoothstep(0.03,0.18,diffuseColor.g-diffuseColor.b);
 float enemyLampBrightness=smoothstep(0.35,0.75,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
 totalEmissiveRadiance+=diffuseColor.rgb*(0.12+max(enemyBlueLamp,enemyWarmLamp)*enemyLampBrightness*0.48);
`);
   };
   material.customProgramCacheKey=()=>previousKey+'-enemy-visibility-v175';material.needsUpdate=true;
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(enhance):enhance(mesh.material);
 });
}

function finishColosoMaterials(model){
 model.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;material.metalness=.65;material.roughness=.62;
   if(material.map)material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 float colosoWarm=smoothstep(0.04,0.20,diffuseColor.r-diffuseColor.b)*smoothstep(0.02,0.12,diffuseColor.g-diffuseColor.b);
 float colosoBrightness=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.32,0.055)*colosoBrightness,colosoWarm*0.85);
#endif
`);
   };
   material.customProgramCacheKey=()=> 'coloso-orange-metal-v159';material.needsUpdate=true;
  }
 });
 enhanceEnemyMaterials(model);
}
function assembleColosoModels(){
 if(!colosoHullTemplate||!colosoDoorTemplate||carrierMesh.userData.colosoVisual)return;
 finishColosoMaterials(colosoDoorTemplate);
 const rig=createColosoRig(THREE,colosoHullTemplate,colosoDoorTemplate,bossState.phases.includes(0));
 for(const child of carrierMesh.children)child.visible=false;
 carrierPanels.length=0;carrierPanels.push(...rig.panels);
 carrierMesh.add(rig.root);carrierMesh.userData.colosoVisual=rig.root;
 const exhausts=attachColosoExhaust(THREE,rig,colosoHullTemplate);
 carrierMesh.userData.colosoFlames=exhausts;
 carrierMesh.userData.hangarExits=rig.exits;carrierMesh.userData.hangarDirections=rig.directions;carrierMesh.userData.hitRadius=255;
}
deferredModelLoad(modelLoader,'./assets/models/coloso.glb?v=187',gltf=>{
 colosoHullTemplate=gltf.scene;assembleColosoModels();
},undefined,error=>console.warn('Casco Coloso no disponible; se conserva el respaldo.',error));
deferredModelLoad(modelLoader,'./assets/models/scifipanelcrate_optimizado.glb?v=159',gltf=>{
 colosoDoorTemplate=gltf.scene;assembleColosoModels();
},undefined,error=>console.warn('Compuerta Coloso no disponible; se conserva el respaldo.',error));

// Apariencia 3D opcional de los enemigos básicos (scout). El grupo original
// mantiene posición, IA, colisiones, disparos y recompensas intactos.
// Si aún no se ha subido el GLB, las naves originales siguen funcionando.
deferredModelLoad(modelLoader,'./assets/models/futuristic_spacecraft.glb?v=105',gltf=>{
 const original=gltf.scene;
 enhanceEnemyMaterials(original);
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
 enhanceEnemyMaterials(original);
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
 enhanceEnemyMaterials(original);
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

deferredModelLoad(modelLoader,'./assets/models/gunship_optimizado.glb?v=148',gltf=>{
 const original=gltf.scene;
 original.traverse(obj=>{
  if(!obj.isMesh)return;obj.castShadow=false;obj.receiveShadow=false;
  for(const material of Array.isArray(obj.material)?obj.material:[obj.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;material.metalness=.65;material.roughness=.62;
  }
 });
 enhanceEnemyMaterials(original);
 const box=new THREE.Box3().setFromObject(original),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const span=Math.max(size.x,size.y,size.z);if(!Number.isFinite(span)||span<.001)return;
 for(const e of enemies){
  if(e.type!=='destroyer')continue;
  const visual=original.clone(true),factor=130/span;
  visual.scale.setScalar(factor);visual.position.copy(center).multiplyScalar(-factor);
  const pivot=new THREE.Group();pivot.add(visual);e.mesh.add(pivot);
  for(const child of e.mesh.children)if(child!==pivot)child.visible=false;
 }
},undefined,error=>console.warn('Gunship no disponible; se conserva el cuarto enemigo original.',error));

// Dos drones de apoyo: acompañan al jugador y disparan proyectiles reales.
const supportDrones=[];
const MAX_DRONES=8;
// Los primeros dos mantienen su precio original; los siguientes son progresión futura.
const DRONE_PRICES=[100,200,1000,5000,15000,40000,100000,200000];
const EXPLORER_PRICE=300000;
player.explorerDrone=player.explorerDrone===true;
player.explorerRangeLevel=Math.max(1,Math.min(10,Math.floor(Number(player.explorerRangeLevel)||1)));
function explorerRange(){return 450+player.explorerRangeLevel*100}
const EXPLORER_UPGRADE_PRICES=[1000,2500,5000,9000,14000,21000,29000,39000,50000]; // Mejoras del nivel 2 al 10.
function explorerUpgradePrice(){return EXPLORER_UPGRADE_PRICES[player.explorerRangeLevel-1]||0}
player.droneCount=Math.max(0,Math.min(MAX_DRONES,Math.floor(Number(player.droneCount)||0)));
normalizeHangar(player);
const equippedBonus=()=>formationBonus(player,!PVP_MODE||!!pvpHangar);
const activeBooster=id=>boosterBonus(player,id,!PVP_MODE||!!pvpHangar);
const supportRange=()=>PVP_MODE?(pvpSession?.profile?.droneRange||COMBAT_RANGE):COMBAT_RANGE*equippedBonus().range;
let hangarUI=null;
function equipFormation(id){
 if(!player.formations[id])return;
 if(PVP_MODE&&!pvpHangar){pvpSession?.setFormation(id);return;}
 player.droneFormation=id;syncShipStats();save();hud();refreshFormationButton();
 if(hangarUI)hangarUI.render(true);
}
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

let explorerThreat=null,explorerFireCd=0,explorerManualTarget=null,explorerManualUntil=0;
const explorerThreats=new Map();
function registerExplorerThreat(e){
 if(player.explorerDrone&&e.type!=='carrier'&&!e.dead&&e.mesh.visible){explorerThreat=e;explorerThreats.set(e,performance.now()/1000);}
}
function explorerEnemyValid(e){return (!PVP_MODE||pvpSession?.canFight&&pvpSession?.canTarget(e?.playerId)&&!pvpSession?.isJammed(e?.playerId))&&!!e&&!e.dead&&e.mesh.visible&&e.mesh.position.distanceTo(playerMesh.position)<=Math.min(COMBAT_RANGE,explorerRange())}
function explorerTask(){
 const now=performance.now()/1000;
 for(const [enemy,time] of explorerThreats)if(now-time>4.5||!explorerEnemyValid(enemy))explorerThreats.delete(enemy);
 if(docked||landing||player.hp<=0)return {mode:'collect',target:null};
 return selectCompanionTask({manualActive:fireHeld||now<explorerManualUntil,manualTarget:explorerManualTarget,threats:explorerThreats,now,isValid:explorerEnemyValid,protectedZone:inSafeZone(playerMesh.position)});
}
function markExplorerAttack(target){
 if(explorerEnemyValid(target)&&target!==explorerManualTarget)explorerFireCd=0;
 explorerManualTarget=target;explorerManualUntil=performance.now()/1000+.85;
 explorerCompanion.targetDrop=null;explorerCompanion.nextChange=0;
}
function updateExplorerCombat(dt){
 if(PVP_MODE&&!pvpSession?.canFight)return;
 explorerFireCd=Math.max(0,explorerFireCd-dt);
 const target=explorerTask().target;if(!target)return;
 if(!player.explorerDrone||!explorerMesh.visible||docked||landing||explorerFireCd>0)return;
 const delta=target.mesh.position.clone().sub(explorerMesh.position);
 const direction=delta.clone().normalize(),start=explorerMesh.position.clone().addScaledVector(direction,26);
 const bolt=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,48,7),new THREE.MeshBasicMaterial({color:0x49d8ff,transparent:true,opacity:.95,depthWrite:false}));
 bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);bolt.position.copy(start);scene.add(bolt);
 shots.push({mesh:bolt,vel:direction.multiplyScalar(1150),life:2.1,damage:player.attack*.2*activeBooster('damage')});
 if(pvpSession)pvpSession.shots('explorer',shots.filter(p=>!p.pvpSent&&!p.pvpRemote),playerMesh.position,player.attack,1,target.playerId);for(const p of shots)if(!p.pvpRemote)p.pvpSent=true;
 explorerMesh.lookAt(target.mesh.position);explorerFireCd=.68;
}

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
 // Atacar, defender y solo entonces buscar cajas.
 const task=explorerTask(),combat=task.mode!=='collect';
 let nearest=null,best=Infinity;
 for(const drop of (combat?[]:drops)){
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
 const target=combat?task.target?playerMesh.position.clone().lerp(task.target.mesh.position,.15).add(new THREE.Vector3(45,25,0)):playerMesh.position.clone().add(new THREE.Vector3(65,24,-40)):nearest?nearest.mesh.position:c.destination;
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
 const speed=combat?Math.min(520,220+distance*.8):nearest?Math.min(420,180+distance*.55):Math.min(235,85+distance*.35);
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
 const f=FORMATIONS.find(f=>f.id===player.droneFormation)||FORMATIONS[0];
 formationBtn.textContent=f.icon;
 formationBtn.title=f.name+' · Cambiar entre formaciones disponibles';
 formationBtn.setAttribute('aria-label',formationBtn.title);
 formationBtn.setAttribute('aria-pressed',String(f.id!=='fan'));
 formationBtn.disabled=PVP_MODE&&!pvpHangar&&!pvpSession?.active;
}
function cycleFormation(){
 const available=FORMATIONS.filter(f=>player.formations[f.id]);
 if(available.length<=1){lootToast('Abanico equipado · Ensambla nuevas formaciones en la base');return}
 const index=available.findIndex(f=>f.id===player.droneFormation),next=available[(index+1)%available.length];
 equipFormation(next.id);if(!PVP_MODE||pvpHangar)lootToast('Formación: '+next.name);
}

if(formationBtn){
 // No depender del clic sintetizado: otro dedo puede seguir en el joystick.
 formationBtn.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(!formationBtn.disabled)cycleFormation();
 },{passive:false});
 // Ratón, teclado y activación accesible conservan su clic habitual.
 formationBtn.onclick=cycleFormation;
}
refreshFormationButton();
function updateSupportDrones(dt,now){
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const up=new THREE.Vector3().crossVectors(right,forward).normalize();
 for(let i=0;i<supportDrones.length;i++){
  const d=supportDrones[i];d.mesh.visible=i<ownedDrones();if(!d.mesh.visible)continue;
  const [x,y,z]=formationOffset(player.droneFormation,i,ownedDrones(),now/1000);
  const desired=playerMesh.position.clone().addScaledVector(right,x).addScaledVector(forward,y).addScaledVector(up,z);
  d.mesh.position.lerp(desired,Math.min(1,dt*6));d.mesh.rotation.y=yaw;
 }
}
// Disparo manual sincronizado: cada dron copia la mira y la dispersión de la nave.
function fireSupportDrones(aimPoint,locked,noseDir){
 const count=ownedDrones();if(!count&&!player.explorerDrone)return;
 if(count)combatAudio.play('drone',playerMesh.position);
 for(let i=0;i<count;i++){
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
  const range=supportRange();
  shots.push({mesh:bolt,vel:direction.multiplyScalar(1150),life:range/1150+.35,range,damage:player.attack*.2*equippedBonus().damage*activeBooster('damage')});
 }
}
// Proyectiles enemigos independientes de los disparos del jugador.
const scrapCombat=createScrapCombat(THREE,scene,{position:()=>playerMesh.position,canHit:()=>player.hp>0&&!recoveryPending&&!docked&&!landing&&!inSafeZone(playerMesh.position),damage:(amount,elapsed=1,source=null)=>applyPlayerDamage(Math.max(1,amount*proMultiplier(source)*advancedEnemyScale(player.level,40)-player.defense*.25)*elapsed),notify:message=>lootToast(message),sound:(kind,position)=>combatAudio.play(kind,position)});
const enemyShots=[];
const enemyShotGeometry=new THREE.CylinderGeometry(2.8,2.8,44,8);
const enemyShotMaterials={stalker:new THREE.MeshBasicMaterial({color:0xff1838}),scout:new THREE.MeshBasicMaterial({color:0xff5757}),raider:new THREE.MeshBasicMaterial({color:0xffa43b}),sentinel:new THREE.MeshBasicMaterial({color:0xc475ff}),destroyer:new THREE.MeshBasicMaterial({color:0xff3d9b}),devastator:new THREE.MeshBasicMaterial({color:0xff7733})};
function enemyFire(e){
 if(!['catapult','harpooner','stalker'].includes(e.type))combatAudio.play('enemyLaser',e.mesh.position);
 lastIncomingAttackAt=performance.now()/1000;
 repairRobot.visible=repairBeam.visible=false;
 const t=TYPES[e.type];
 registerExplorerThreat(e);
 if(e.type==='catapult'||e.type==='harpooner'){scrapCombat.fire(e);return}
 if(e.type==='stalker'){
  if(e.aiming)return;
  combatAudio.play('sniperCharge',e.mesh.position);
  const target=playerMesh.position.clone();
  const geometry=new THREE.BufferGeometry().setFromPoints([e.mesh.position,target]);
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xff243a,transparent:true,opacity:.85,depthWrite:false}));scene.add(line);
  e.aiming={line,time:.5,target};return;
 }
 const start=e.mesh.position.clone();
 const target=playerMesh.position.clone().add(new THREE.Vector3((Math.random()-.5)*75,(Math.random()-.5)*55,(Math.random()-.5)*75));
 const dir=target.sub(start).normalize();
 const mesh=new THREE.Mesh(enemyShotGeometry,enemyShotMaterials[e.type]);mesh.position.copy(start).addScaledVector(dir,48);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(mesh);
 enemyShots.push({owner:e,mesh,velocity:dir.multiplyScalar(e.type==='sentinel'?1050:1250),life:1.8,damage:t.damage*proMultiplier(e)});
}
// Misil visual detallado; la física, el guiado y el daño permanecen intactos.
const carrierMissileGeometry=new THREE.CylinderGeometry(7,10,40,12),carrierMissileMaterial=new THREE.MeshStandardMaterial({color:0xcbd8e5,metalness:.82,roughness:.32});
function decorateCarrierMissile(mesh){
 const tip=new THREE.Mesh(new THREE.ConeGeometry(7,16,12),new THREE.MeshStandardMaterial({color:0xf27832,metalness:.65,roughness:.4}));
 tip.position.y=28;mesh.add(tip);
 const finMat=new THREE.MeshStandardMaterial({color:0x33465b,metalness:.8,roughness:.38,side:THREE.DoubleSide});
 for(let i=0;i<4;i++){
  const fin=new THREE.Mesh(new THREE.BoxGeometry(2.5,14,19),finMat);
  fin.position.set(Math.cos(i*Math.PI/2)*11,-12,Math.sin(i*Math.PI/2)*11);
  fin.rotation.y=-i*Math.PI/2;mesh.add(fin);
 }
 const exhaust=new THREE.Mesh(new THREE.ConeGeometry(6,19,10),new THREE.MeshBasicMaterial({color:0x4dbdff,transparent:true,opacity:.85}));
 exhaust.rotation.z=Math.PI;exhaust.position.y=-28;mesh.add(exhaust);
}
function createCarrierMissileMesh(){
 if(!rocketTemplate){
  const fallback=new THREE.Mesh(carrierMissileGeometry,carrierMissileMaterial);
  decorateCarrierMissile(fallback);return fallback;
 }
 // Reutilizar el GLB con sus texturas, centrado en un soporte independiente.
 const mesh=new THREE.Group(),visual=rocketTemplate.clone(true);
 visual.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3());
 const length=Math.max(size.x,size.y,size.z);
 const centered=new THREE.Group();centered.add(visual);
 visual.position.sub(bounds.getCenter(new THREE.Vector3()));
 centered.scale.setScalar(52/Math.max(.001,length));mesh.add(centered);
 return mesh;
}
function fireCarrierMissile(){
 combatAudio.play('missile',carrierMesh.position);
 lastIncomingAttackAt=performance.now()/1000;repairRobot.visible=repairBeam.visible=false;
 const dir=playerMesh.position.clone().sub(carrierMesh.position).normalize(),mesh=createCarrierMissileMesh();
 mesh.position.copy(carrierMesh.position).addScaledVector(dir,carrierMesh.userData.hitRadius||255);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(mesh);
 enemyShots.push({owner:carrierEnemy,mesh,velocity:dir.multiplyScalar(650),life:4,damage:TYPES.carrier.damage*advancedEnemyScale(player.level,30),guided:true,missileEffects:addMissileEffects(mesh)});
 lootToast('🚀 Coloso · Misil guiado');
}
function updateEnemyShots(dt){
 for(const e of enemies){if(e.type!=='stalker'||!e.aiming)continue;
  const aim=e.aiming;aim.time-=dt;
  if(e.dead||!e.mesh.visible||activeSector!=='graveyard'||docked||landing||inSafeZone(playerMesh.position)){
   scene.remove(aim.line);aim.line.geometry.dispose();aim.line.material.dispose();e.aiming=null;continue;
  }
  aim.target.copy(playerMesh.position);aim.line.geometry.setFromPoints([e.mesh.position,aim.target]);
  if(aim.time>0)continue;
  combatAudio.play('sniperShot',e.mesh.position);
  const start=e.mesh.position.clone(),dir=aim.target.clone().sub(start).normalize();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(5,5,65,10),enemyShotMaterials.stalker);
  mesh.position.copy(start).addScaledVector(dir,55);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(mesh);
  mesh.add(new THREE.PointLight(0xff1234,3,160));
  enemyShots.push({owner:e,mesh,velocity:dir.multiplyScalar(6000),life:.5,damage:TYPES.stalker.damage*proMultiplier(e)*advancedEnemyScale(player.level,40),sniper:true});
  scene.remove(aim.line);aim.line.geometry.dispose();aim.line.material.dispose();e.aiming=null;
 }
 for(let i=enemyShots.length-1;i>=0;i--){
  const p=enemyShots[i],previous=p.mesh.position.clone();
  if(p.guided&&p.mesh.position.distanceTo(playerMesh.position)<450&&!docked&&!landing)combatAudio.play('incoming');
  if(p.guided){const desired=playerMesh.position.clone().sub(p.mesh.position).normalize().multiplyScalar(650);p.velocity.lerp(desired,Math.min(1,dt*1.6));p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.velocity.clone().normalize());if(p.owner.dead)p.life=0}
  p.mesh.position.addScaledVector(p.velocity,dt);p.life-=dt;if(p.guided)updateMissileEffects(p,dt);
  if(!docked&&!landing&&!inSafeZone(playerMesh.position)&&segmentDistance(previous,p.mesh.position,playerMesh.position)<45){
   if(p.guided)combatAudio.play('explosion',p.mesh.position);
   applyPlayerDamage(Math.max(1,p.damage-player.defense*.25));p.life=0;
  }
  if(p.life<=0){removeMissileEffects(p);scene.remove(p.mesh);enemyShots.splice(i,1)}
 }
}
const shots=[];function nearest(){let b=null,d=650;for(const e of enemies){if(e.dead)continue;const x=e.mesh.position.distanceTo(playerMesh.position);if(x<d){d=x;b=e}}return b}
let fireCd=0,skillCd=0,fireHeld=false,firePointerId=null;
// Apuntado asistido: sólo objetivos vivos dentro del cono central de la pantalla.
const COMBAT_RANGE=1200;
let lockedEnemy=null;
const lockFrame=$('targetLock');
function updateTargetLock(){
 camera.updateMatrixWorld();
 let candidate=null,best=Infinity,screen=null;
 const forwardView=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 for(const e of enemies){
  if(PVP_MODE&&!pvpSession?.canTarget(e.playerId))continue;
  if(e.dead||!e.mesh.visible||(PVP_MODE&&pvpSession?.isJammed(e.playerId)))continue;
  if(farmPilot?.running&&e!==farmPilot.target)continue;
  const to=e.mesh.position.clone().sub(camera.position);
  const distance=e.mesh.position.distanceTo(playerMesh.position);
  if(distance>(ownedDrones()?supportRange():COMBAT_RANGE)||to.length()<40||to.dot(forwardView)<=0)continue;
  const p=e.mesh.position.clone().project(camera);
  if(p.z<-1||p.z>1||Math.abs(p.x)>.34||Math.abs(p.y)>.30)continue;
  const score=p.x*p.x+p.y*p.y+distance/18000;
  if(score<best){best=score;candidate=e;screen=p}
 }
 lockedEnemy=candidate;
 if(candidate&&screen&&!document.body.classList.contains('inventory-open')){
  lockFrame.classList.remove('hidden');
  lockFrame.classList.toggle('pvp-neutral',PVP_MODE&&!pvpSession?.canTarget(candidate.playerId));
  lockFrame.style.left=((screen.x+1)*50)+'%';
  lockFrame.style.top=((1-screen.y)*50)+'%';
  const info=candidate.pvpRemote?[candidate.pilotName,candidate.pilotLevel]:{scout:['Explorador',1],raider:['Asaltante',3],sentinel:['Guardián',5],destroyer:['Destructor',8],devastator:['Devastador',30],catapult:['Catapulta de Chatarra',40],stalker:['Acechador de Chatarra',40],harpooner:['Arponero',40],granTitan:['Gran Titán',40],carrier:['Coloso Portanaves',30]}[candidate.type]||['Enemigo',1];
  $('targetName').textContent=info[0]+(candidate.pro?' Pro':'')+' · Nv. '+(candidate.pvpRemote?info[1]:Math.max(info[1],Math.floor(Number(player.level)||1)));
  $('targetHpText').textContent=Math.max(0,Math.ceil(candidate.hp))+'/'+candidate.maxHp;
  $('targetHpFill').style.width=(100*Math.max(0,Math.min(1,candidate.hp/candidate.maxHp)))+'%';
 }else lockFrame.classList.add('hidden');
}
function fire(mult=1,count=1){if(PVP_MODE&&!pvpSession?.canFight)return;
 if(player.hp<=0||recoveryPending||fireCd>0)return;
 lastAttackAt=performance.now()/1000;repairRobot.visible=repairBeam.visible=false;
 updateTargetLock();markExplorerAttack(lockedEnemy);
 combatAudio.play('laser',playerMesh.position);
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
  shots.push({mesh,vel:dir.multiplyScalar(1150),life:1.65,damage:player.attack*mult*.5*classDamageMultiplier()*classCritMultiplier()*activeBooster('damage')});
 }
 fireSupportDrones(aimPoint,!!lockedEnemy,noseDir);
 if(pvpSession)pvpSession.shots('laser',shots.filter(p=>!p.pvpSent&&!p.pvpRemote),playerMesh.position,player.attack,classDamageMultiplier(),lockedEnemy?.playerId);for(const p of shots)if(!p.pvpRemote)p.pvpSent=true;
 fireCd=classAbilityActive('aurora')?.68/(['centella','vertigo'].includes(player.shipId)?1.4:1.3):.68; // Sobrecarga aumenta la cadencia.
}
function xpNeed(){const level=Math.max(1,Math.floor(Number(player.level)||1));return 100+(level-1)*65+15*Math.pow(Math.max(0,level-10),2)}function gainXp(n){n=Math.round(n*activeBooster('xp'));player.xp+=n;while(player.xp>=xpNeed()){player.xp-=xpNeed();player.level++;combatAudio.play('levelUp');player.maxEnergy+=5;if(player.shipBaseStats){player.shipBaseStats.maxHp+=10;player.shipBaseStats.attack+=2;player.shipBaseStats.defense++;syncShipStats()}else{player.maxHp+=10;player.attack+=2;player.defense++}player.hp=player.maxHp;player.energy=player.maxEnergy;$('levelToast').innerHTML='⭐ NIVEL '+player.level+'<small>Sistemas de la nave mejorados</small>';$('levelToast').classList.remove('hidden');setTimeout(()=>$('levelToast').classList.add('hidden'),2200)}renderMission();}
// Botín físico: queda flotando tras destruir un enemigo y se recoge al acercarse.
const LOOT_TYPES=[
 {id:'chatarra',name:'Chatarra espacial',color:0x9ca8b5,rarity:'Común',description:'Restos recuperados de naves y drones. Material básico de fabricación.'},
 {id:'aleacion',name:'Aleación reforzada',color:0x55c6ff,rarity:'Poco común',description:'Metal resistente para reforzar casco y estructuras.'},
 {id:'nucleo',name:'Núcleo de energía',color:0xc783ff,rarity:'Raro',description:'Fuente de energía concentrada para sistemas avanzados.'},
 {id:'reliquia',name:'Componente ancestral',color:0xffca58,rarity:'Épico',description:'Tecnología antigua de origen desconocido y gran valor.'},
 {id:'nucleo_demolicion',name:'Núcleo de demolición',color:0xff8448,rarity:'Exclusivo · Cementerio',description:'Componente explosivo recuperado de las Catapultas.'},
 {id:'bobina_anclaje',name:'Bobina de anclaje',color:0x68d2ce,rarity:'Exclusivo · Cementerio',description:'Mecanismo de arpón recuperado de los Arponeros.'},
 {id:'cristal_punteria',name:'Cristal de puntería',color:0xff436d,rarity:'Exclusivo · Cementerio',description:'Cristal de fijación de objetivos de los Acechadores.'}
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
 const explorerHtml='<div class="upgrade-card"><div><strong>🛰️ Dron Explorador · 9.º especial</strong><small>Recoge automáticamente los materiales de los enemigos y agrega un láser extra a tu nave cuando disparas.</small><small>'+(player.explorerDrone?'Adquirido y equipado':'Precio: '+EXPLORER_PRICE.toLocaleString('es')+' créditos · Compra independiente')+'</small></div><button class="buyExplorerBtn" '+(player.explorerDrone||player.gold<EXPLORER_PRICE?'disabled':'')+'>'+(player.explorerDrone?'Equipado':'Comprar')+'</button></div>';
 const repairLevel=player.repairRobotLevel,repairMax=repairLevel>=5,repairPrice=repairRobotPrice();
 const repairHtml='<div class="upgrade-card"><div><strong>🔧 Robot reparador · Nivel '+repairLevel+'/5</strong><small>Repara '+(repairLevel||1)+' % del casco por segundo tras 2 s sin disparar ni recibir ataques. Cada nivel añade 1 %. No ocupa espacios de drones.</small><small>'+(repairMax?'Nivel máximo · 5 % por segundo':(repairLevel?'Mejorar a nivel '+(repairLevel+1):'Compra permanente')+': '+repairPrice.toLocaleString('es')+' créditos')+'</small></div><button class="buyRepairRobot" '+(repairMax||player.gold<repairPrice?'disabled':'')+'>'+(repairMax?'Máximo':repairLevel?'Mejorar':'Comprar')+'</button></div>';
 const rangeHtml='<div class="upgrade-card"><div><strong>📡 Alcance del Explorador · Nivel '+rangeLevel+'/10</strong><small>Detecta cajas hasta '+explorerRange().toLocaleString('es')+' m. Cada mejora añade 100 m de alcance.</small><small>'+(rangeMax?'Alcance máximo conseguido':'Siguiente nivel: '+rangePrice.toLocaleString('es')+' créditos')+'</small></div><button class="buyExplorerRange" '+(!player.explorerDrone||rangeMax||player.gold<rangePrice?'disabled':'')+'>'+(rangeMax?'Máximo':'Mejorar')+'</button></div>';
 for(const el of containers){el.innerHTML=html.replace('id="buyDroneBtn"','class="buyDroneBtn"')+explorerHtml+rangeHtml+repairHtml;
 el.querySelector('.buyRepairRobot').onclick=()=>{
  const price=repairRobotPrice();
  if(!docked||player.repairRobotLevel>=5||!price||player.gold<price)return;
  player.gold-=price;player.repairRobotLevel++;player.repairRobot=true;logAction('commerce','Robot reparador · Nivel '+player.repairRobotLevel+' · −'+price.toLocaleString('es')+' créditos');save();hud();hangarRefresh();lootToast('🔧 Robot reparador · Nivel '+player.repairRobotLevel);
 };
 el.querySelector('.buyExplorerRange').onclick=()=>{
  const price=explorerUpgradePrice();if(!player.explorerDrone||player.explorerRangeLevel>=10||player.gold<price)return;
  player.gold-=price;player.explorerRangeLevel++;logAction('commerce','Alcance del Explorador · Nivel '+player.explorerRangeLevel+' · −'+price.toLocaleString('es')+' créditos');save();hud();renderDrones();lootToast('📡 Explorador: alcance '+explorerRange()+' m');if(docked)hangarRefresh();
 };
 el.querySelector('.buyExplorerBtn').onclick=()=>{
  if(player.explorerDrone||player.gold<EXPLORER_PRICE)return;
  player.gold-=EXPLORER_PRICE;player.explorerDrone=true;logAction('commerce','Compra: Dron Explorador · −'+EXPLORER_PRICE.toLocaleString('es')+' créditos');save();hud();renderDrones();lootToast('🛰️ Dron Explorador equipado');
  if(docked)hangarRefresh();
 };el.querySelector('.buyDroneBtn').onclick=()=>{
  const owned=ownedDrones(),cost=DRONE_PRICES[owned];
  if(owned>=MAX_DRONES||player.gold<cost)return;
  player.gold-=cost;player.droneCount=owned+1;logAction('commerce','Compra: dron '+player.droneCount+' · −'+cost.toLocaleString('es')+' créditos');syncShipStats();missionEvent('drone');save();hud();renderDrones();
  lootToast('🤖 Dron '+player.droneCount+' adquirido y equipado');
  if(docked)hangarRefresh();
 };}
}
// Flota: las mejoras generales permanecen en el perfil; las especializaciones son por nave.
const SHIP_TYPES={
 aurora:{name:'Aurora',level:1,cost:0,hp:1,attack:1,defense:1,speed:1,description:'Equilibrada · tu nave original'},
 titan:{name:'Titán',level:15,cost:200000,hp:1.8,attack:.85,defense:1.5,speed:.75,description:'Tanque · casco y escudos resistentes'},
 espectro:{name:'Espectro',level:25,cost:200000,hp:.7,attack:1.35,defense:.65,speed:1.4,description:'Asalto · alta velocidad y daño'},
 ...ASSEMBLED_SHIPS
};
player.ownedShips=player.ownedShips&&typeof player.ownedShips==='object'?player.ownedShips:{};
player.ownedShips.aurora=true;
player.shipId=SHIP_TYPES[player.shipId]&&player.ownedShips[player.shipId]?player.shipId:'aurora';
player.shipSpecializations=player.shipSpecializations&&typeof player.shipSpecializations==='object'?player.shipSpecializations:{};
// Habilidades de clase: duración y recarga solo durante la sesión de vuelo.
const SHIP_ABILITIES={adminpod:{name:'Sobrecarga',icon:'⚡',duration:5,cooldown:20,energy:40},
 azote:{name:'Furia de Azote',icon:'🔥',duration:5,cooldown:25,energy:65},
 egida:{name:'Fortaleza de Égida',icon:'🛡️',duration:6,cooldown:25,energy:55},
 vertigo:{name:'Sobrecarga de Vértigo · rompe el arpón',icon:'⚡',duration:5,cooldown:20,energy:40},
 obsidian:{name:'Sobrecarga ancestral',icon:'⚡',duration:5,cooldown:20,energy:40},
 aurora:{name:'Sobrecarga',icon:'⚡',duration:5,cooldown:20,energy:40},
 titan:{name:'Fortaleza',icon:'🛡️',duration:6,cooldown:25,energy:55},
 espectro:{name:'Furia',icon:'🔥',duration:5,cooldown:25,energy:65},
 segadora:{name:'Furia de la Segadora',icon:'🔥',duration:5,cooldown:25,energy:65},
 bastion:{name:'Fortaleza de Bastión',icon:'🛡️',duration:6,cooldown:25,energy:55},
 centella:{name:'Sobrecarga de Centella · rompe el arpón',icon:'⚡',duration:5,cooldown:20,energy:40}
};
const SPECIAL_UPGRADES={
 aurora:[['energy','Reactor eficiente','Regeneración de energía +4 % por nivel'],['overload','Sobrecarga avanzada','Duración +0,25 s por nivel'],['shield','Escudos recuperadores','Recupera 0,3 % del casco por segundo durante Sobrecarga']],
 titan:[['armor','Blindaje pesado','Reducción de daño +1 % por nivel'],['fortress','Fortaleza extendida','Duración +0,3 s por nivel'],['repair','Reparación táctica','Regenera 0,15 % del casco por segundo fuera de combate']],
 espectro:[['crit','Precisión letal','Probabilidad de crítico +1 % por nivel'],['fury','Furia prolongada','Duración +0,25 s por nivel'],['evasion','Maniobras evasivas','Probabilidad de evasión +0,8 % por nivel']]
};
for(const [id,ship]of Object.entries(ASSEMBLED_SHIPS))SPECIAL_UPGRADES[id]=SPECIAL_UPGRADES[ship.role];
let classAbilityCd=0,classAbilityTime=0,lastHitAt=-100;

const REPAIR_ROBOT_PRICES=[5000,10000,20000,40000,80000];
player.repairRobotLevel=Math.max(0,Math.min(5,Math.floor(Number(player.repairRobotLevel)||0)));
if(player.repairRobot===true&&player.repairRobotLevel===0)player.repairRobotLevel=1;
player.repairRobot=player.repairRobotLevel>0;
function repairRobotPrice(){return REPAIR_ROBOT_PRICES[player.repairRobotLevel]||0}
let lastAttackAt=-100,lastIncomingAttackAt=-100,repairUiElapsed=0;
const repairRobot=new THREE.Group();repairRobot.visible=false;playerMesh.add(repairRobot);
const repairMetal=new THREE.MeshStandardMaterial({color:0xc4d1cc,metalness:.55,roughness:.6});
const repairGreen=new THREE.MeshBasicMaterial({color:0x5dff91});
const robotBody=new THREE.Mesh(new THREE.BoxGeometry(12,10,9),repairMetal);repairRobot.add(robotBody);
const robotEye=new THREE.Mesh(new THREE.BoxGeometry(8,2.5,1),repairGreen);robotEye.position.set(0,1,-5);repairRobot.add(robotEye);
for(const side of [-1,1]){
 const arm=new THREE.Mesh(new THREE.BoxGeometry(2,3,10),repairMetal);arm.position.set(side*8,-3,-4);arm.rotation.y=side*.4;repairRobot.add(arm);
 const tool=new THREE.Mesh(new THREE.SphereGeometry(2,8,6),repairGreen);tool.position.set(side*10,-3,-9);repairRobot.add(tool);
}
const repairAura=new THREE.Mesh(new THREE.SphereGeometry(17,12,8),new THREE.MeshBasicMaterial({color:0x42f58a,transparent:true,opacity:.14,depthWrite:false}));
repairRobot.add(repairAura);
const repairBeam=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,1,6),new THREE.MeshBasicMaterial({color:0x67ffa2,transparent:true,opacity:.8,depthWrite:false}));
playerMesh.add(repairBeam);repairBeam.visible=false;

let repairRobotBones=[];
function rigRepairRobotMesh(source){
 const geometry=source.geometry.clone(),positions=geometry.attributes.position;
 const bounds=new THREE.Box3().setFromBufferAttribute(positions),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const root=new THREE.Bone(),left=new THREE.Bone(),right=new THREE.Bone();
 left.position.set(center.x-size.x*.19,center.y+size.y*.14,center.z);
 right.position.set(center.x+size.x*.19,center.y+size.y*.14,center.z);
 root.add(left,right);
 const indices=new Uint16Array(positions.count*4),weights=new Float32Array(positions.count*4);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i)-center.x,y=positions.getY(i)-center.y;
  const armWeight=y<size.y*.29?THREE.MathUtils.smoothstep(Math.abs(x),size.x*.16,size.x*.25):0;
  indices[i*4]=0;indices[i*4+1]=x<0?1:2;
  weights[i*4]=1-armWeight;weights[i*4+1]=armWeight;
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const skinned=new THREE.SkinnedMesh(geometry,source.material);
 skinned.position.copy(source.position);skinned.quaternion.copy(source.quaternion);skinned.scale.copy(source.scale);
 skinned.add(root);skinned.bind(new THREE.Skeleton([root,left,right]));skinned.frustumCulled=false;
 repairRobotBones.push(left,right);return skinned;
}
deferredModelLoad(modelLoader,'./assets/models/robot_reparador_optimizado.glb?v=151',gltf=>{
 const model=gltf.scene,meshes=[];
 model.traverse(obj=>{if(obj.isMesh)meshes.push(obj)});
 for(const mesh of meshes){
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!material?.isMeshStandardMaterial)continue;
   material.metalnessMap=null;material.roughnessMap=null;material.metalness=.5;material.roughness=.7;
  }
  const rigged=rigRepairRobotMesh(mesh);mesh.parent.add(rigged);mesh.parent.remove(mesh);
 }
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const span=Math.max(size.x,size.y,size.z);if(!Number.isFinite(span)||span<.001)return;
 const visual=new THREE.Group(),factor=34/span;
 model.position.sub(center);visual.add(model);visual.scale.setScalar(factor);
 for(const child of repairRobot.children)if(child!==repairAura)child.visible=false;
 repairRobot.add(visual);repairRobot.userData.loadedModel=visual;
},undefined,error=>console.warn('Robot GLB no disponible; se conserva robot de respaldo.',error));

function canRobotRepair(now){
 return player.repairRobot&&player.hp>0&&player.hp<player.maxHp&&!landing&&!fireHeld&&
  now-Math.max(lastHitAt,lastAttackAt,lastIncomingAttackAt)>=2&&sectorDistance()<=currentSector().radius;
}

const repairSurfaceRay=new THREE.Raycaster();
let repairSurfaceModel=null,repairSurfaceMeshes=[],repairSurfaceBounds=new THREE.Box3(),repairSurfaceTick=0;
const repairSurfacePoint=new THREE.Vector3();
function updateRepairSurface(dt,now){
 const model=['titanModel','espectroModel','auroraModel','xWingModel'].map(key=>playerMesh.userData[key]).find(obj=>obj?.visible)||proceduralShip;
 playerMesh.updateWorldMatrix(true,true);
 if(model!==repairSurfaceModel){
  repairSurfaceModel=model;repairSurfaceMeshes=[];repairSurfaceBounds.makeEmpty();
  const inverse=new THREE.Matrix4().copy(playerMesh.matrixWorld).invert();
  model.traverse(obj=>{
   if(!obj.isMesh||obj.material?.transparent)return;
   repairSurfaceMeshes.push(obj);
   if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
   const localMatrix=new THREE.Matrix4().multiplyMatrices(inverse,obj.matrixWorld);
   repairSurfaceBounds.union(obj.geometry.boundingBox.clone().applyMatrix4(localMatrix));
  });
  repairSurfaceTick=1;
 }
 repairSurfaceTick+=dt;if(repairSurfaceTick<.18)return;repairSurfaceTick=0;
 if(repairSurfaceBounds.isEmpty()){repairSurfacePoint.set(0,8,0);return}
 const size=repairSurfaceBounds.getSize(new THREE.Vector3()),center=repairSurfaceBounds.getCenter(new THREE.Vector3());
 // Recorrer alas y fuselaje y buscar la superficie real desde arriba.
 const localOrigin=new THREE.Vector3(center.x+Math.sin(now*.55)*size.x*.24,repairSurfaceBounds.max.y+35,center.z+Math.sin(now*.85)*size.z*.27);
 const cast=origin=>{
  repairSurfaceRay.set(playerMesh.localToWorld(origin.clone()),new THREE.Vector3(0,-1,0).transformDirection(playerMesh.matrixWorld));
  return repairSurfaceRay.intersectObjects(repairSurfaceMeshes,false)[0];
 };
 let hit=cast(localOrigin);
 if(!hit)hit=cast(new THREE.Vector3(center.x,localOrigin.y,center.z));
 if(hit)repairSurfacePoint.copy(playerMesh.worldToLocal(hit.point.clone()));
 else repairSurfacePoint.set(center.x,repairSurfaceBounds.max.y,center.z);
}

function updateRepairRobot(dt,now){
 const repairing=canRobotRepair(now);
 if(repairing&&!repairRobot.visible)combatAudio.play('repair');
 repairRobot.visible=repairBeam.visible=repairing;
 if(!repairing){repairRobot.userData.repairing=false;return}
 updateRepairSurface(dt,now);
 player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.01*player.repairRobotLevel*equippedBonus().repair*dt);
 const destination=repairSurfacePoint.clone();
 const desiredPosition=destination.clone().add(new THREE.Vector3(0,14+Math.sin(now*3)*.8,3));
 if(!repairRobot.userData.repairing)repairRobot.position.copy(desiredPosition);
 else repairRobot.position.lerp(desiredPosition,1-Math.exp(-dt*4));
 repairRobot.userData.repairing=true;
 const facing=destination.clone().sub(repairRobot.position).normalize();
 repairRobot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),facing);
 for(let i=0;i<repairRobotBones.length;i++){
  const bone=repairRobotBones[i],side=i%2===0?1:-1;
  bone.rotation.z=side*(.06+.07*Math.sin(now*4+i*.7));
  bone.rotation.y=-side*(1.18+.10*Math.sin(now*3+i));
 }
 repairAura.material.opacity=.12+.04*(.5+.5*Math.sin(now*5));
 const origin=repairRobot.position.clone().addScaledVector(facing,10);
 const beamDirection=destination.clone().sub(origin);
 repairBeam.position.copy(origin).add(destination).multiplyScalar(.5);
 repairBeam.scale.y=beamDirection.length();
 repairBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),beamDirection.normalize());
 repairUiElapsed+=dt;if(docked&&repairUiElapsed>.5){repairUiElapsed=0;hangarRefresh();}
}

function specialLevel(key,id=player.shipId){
 const levels=player.shipSpecializations?.[id]||{};
 return Math.max(0,Math.min(10,Math.floor(Number(levels[key])||0)));
}
function abilityDuration(){
 const a=SHIP_ABILITIES[player.shipId],key=shipRole(player.shipId)==='aurora'?'overload':shipRole(player.shipId)==='titan'?'fortress':'fury';
 return a.duration+specialLevel(key)*(shipRole(player.shipId)==='titan'?.3:.25);
}
function activateClassAbility(){if(PVP_MODE&&!pvpSession?.canFight)return;
 if(classAbilityTime>0||docked||landing||inSafeZone(playerMesh.position))return;
 const a=SHIP_ABILITIES[player.shipId];
 if(player.energy<a.energy){lootToast('🔋 Energía insuficiente: '+a.energy+' necesarios');return}
 combatAudio.play(['titan','bastion','egida'].includes(player.shipId)?'shield':['espectro','segadora','azote'].includes(player.shipId)?'fury':'ability');
 player.energy-=a.energy;if(['centella','vertigo'].includes(player.shipId))scrapCombat.breakTether();classAbilityTime=abilityDuration();if(pvpSession)pvpSession.ability();hud();
 lootToast(a.icon+' '+a.name+' activada');
}
function classAbilityActive(id){return shipRole(player.shipId)===id&&classAbilityTime>0}
function applyPlayerDamage(amount){
 if(docked||landing||inSafeZone(playerMesh.position))return;
 if(shipRole(player.shipId)==='espectro'&&Math.random()<specialLevel('evasion')*.008)return;
 let damage=Math.max(0,amount)*equippedBonus().resistance*activeBooster('resistance');
 if(shipRole(player.shipId)==='titan')damage*=1-(0.1+specialLevel('armor')*.01);
 if(classAbilityActive('titan'))damage*=['bastion','egida'].includes(player.shipId)?.2:.3;
 if(classAbilityActive('espectro'))damage*=['segadora','azote'].includes(player.shipId)?1.2:1.3;
 if(damage>0)combatAudio.play(damage>=player.hp?'explosion':classAbilityActive('titan')?'shieldHit':'impact');
 player.hp=Math.max(0,player.hp-damage);lastHitAt=performance.now()/1000;
 repairRobot.visible=repairBeam.visible=false;
}
function classDamageMultiplier(){
 return classAbilityActive('espectro')?(['segadora','azote'].includes(player.shipId)?1.7:1.6):1;
}
function classCritMultiplier(){
 return shipRole(player.shipId)==='espectro'&&Math.random()<.15+specialLevel('crit')*.01?1.5:1;
}
function updateClassAbility(dt){
 classAbilityCd=Math.max(0,classAbilityCd-dt);
 classAbilityTime=Math.max(0,classAbilityTime-dt);
 if(classAbilityActive('aurora')&&specialLevel('shield')>0)player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.003*specialLevel('shield')*dt);
 if(shipRole(player.shipId)==='titan'&&specialLevel('repair')>0&&performance.now()/1000-lastHitAt>5&&!docked)
  player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.0015*specialLevel('repair')*dt);
 const btn=$('classAbilityBtn'),label=$('classAbilityCd');
 if(btn){const a=SHIP_ABILITIES[player.shipId];setCombatArtwork(btn,shipCombatArtwork(shipRole(player.shipId)));btn.setAttribute('aria-label',a.name);btn.title=a.name;btn.disabled=docked||landing||classAbilityTime>0||player.energy<a.energy;
 if(label)label.textContent=classAbilityTime>0?Math.ceil(classAbilityTime)+'s':player.energy<a.energy?a.energy+' EN':'';presentCombatButton(btn,{remaining:classAbilityTime,duration:abilityDuration(),active:classAbilityTime>0,blocked:btn.disabled&&classAbilityTime<=0})}
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
  player.shipSpecializations[player.shipId][key]=level+1;logAction('commerce','Mejora de '+SHIP_TYPES[player.shipId].name+': '+SPECIAL_UPGRADES[player.shipId].find(x=>x[0]===key)[1]+' · Nivel '+(level+1)+' · −'+cost.toLocaleString('es')+' créditos · '+material+' aleación');
  save();hud();renderInventory();hangarRefresh();
 });
}
function shipBonuses(id){
 const raw=SHIP_TYPES[id]||SHIP_TYPES.aurora;
 const t=Object.fromEntries(['hp','attack','defense','speed'].map(key=>[key,Number((raw[key]-(raw.pvePenalty||0)).toFixed(2))]));
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
 player.maxHp=Math.max(1,Math.round((player.shipBaseStats.maxHp+bonus.maxHp)*equippedBonus().hp));
 player.attack=Math.max(1,player.shipBaseStats.attack+bonus.attack);
 player.defense=Math.max(0,player.shipBaseStats.defense+bonus.defense);
 player.speed=Math.max(50,player.shipBaseStats.speed+bonus.speed);
 player.hp=Math.max(0,Math.min(player.maxHp,ratio*player.maxHp));
}
function changeShip(id){
 if(!docked||!SHIP_TYPES[id]||!player.ownedShips[id]||player.shipId===id)return;
 ensureShipBaseStats();
 player.shipId=id;loadAssembledVisual(id);classAbilityCd=0;classAbilityTime=0;syncShipStats();syncPlayerShipVisuals();save();hud();renderShips();hangarRefresh();
 lootToast('🚀 Nave '+SHIP_TYPES[id].name+' equipada');
}
function renderShips(){
 const hangarShop=$('shopShips');if(!hangarShop)return;
 let fleet=$('hangarShipFleet');
 if(!fleet){fleet=document.createElement('div');fleet.id='hangarShipFleet';hangarShop.appendChild(fleet)}
 fleet.innerHTML='<h3>🚀 Flota de naves</h3><section class="shop-model-hero"><div id="shopShipPreview" class="ship-model-preview">'+shipThumbnail(player.shipId)+'</div><div><strong id="shopShipPreviewName">Nave equipada</strong><small>Nave equipada · Arrastra para girar.</small></div></section>'+Object.entries(SHIP_TYPES).filter(([,t])=>!t.recipe&&!t.adminOnly).map(([id,t])=>{
  const owned=!!player.ownedShips[id],selected=player.shipId===id,canBuy=t.recipe?canAssembleShip(player,id):player.level>=t.level&&player.gold>=t.cost;
  const stats=t.recipe?'<small>Casco ×'+t.hp+' · Ataque ×'+t.attack+' · Escudo ×'+t.defense+' · Velocidad ×'+t.speed+'</small>':'';
  const recipe=t.recipe?Object.entries(t.recipe).map(([key,n])=>n.toLocaleString('es')+' '+(LOOT_TYPES.find(item=>item.id===key)?.name||key)+' ('+(player.loot?.[key]||0)+')').join(' · '):'';
  return '<div class="upgrade-card"><div><strong>'+t.name+'</strong><small>'+t.description+'</small>'+stats+'<small>'+(owned?'Adquirida':('Nivel '+t.level+' · '+t.cost.toLocaleString('es')+' créditos'))+'</small>'+(recipe&&!owned?'<small>'+recipe+'</small>':'')+'</div><button data-ship="'+id+'" '+(owned||!canBuy?'disabled':'')+'>'+(owned?'Disponible en Hangar':'Comprar')+'</button></div>';
 }).join('');
 fleet.querySelectorAll('button[data-ship]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.ship,t=SHIP_TYPES[id];if(!t||!docked||t.recipe||player.ownedShips[id])return;
  if(!player.ownedShips[id]){
   if(t.recipe){if(!assembleShip(player,id))return;logAction('commerce','Nave ensamblada: '+t.name+' · −'+t.cost.toLocaleString('es')+' créditos y materiales del plano');}else{
    if(player.level<t.level||player.gold<t.cost)return;
    player.gold-=t.cost;player.ownedShips[id]=true;logAction('commerce','Compra: nave '+t.name+' · −'+t.cost.toLocaleString('es')+' créditos');
   }
  }
  save();hud();renderShips();hangarRefresh();
 });
 renderSpecialUpgrades();
}
ensureShipBaseStats();
// El guardado ya contiene las estadísticas de la nave equipada: no aplicar el bono otra vez al cargar.
// Normalizar partidas antiguas cuyo perfil aún no tiene valores base fiables.
if(!PVP_MODE&&player.shipId!=='aurora'&&!((player.shipId==='obsidian'||ASSEMBLED_SHIPS[player.shipId]?.pvePenalty)&&stored.shipBaseStats)){
 const bonus=shipBonuses(player.shipId);
 const expected=Math.round((player.shipBaseStats.maxHp+bonus.maxHp)*equippedBonus().hp);
 if(Math.abs(player.maxHp-expected)>2){
  const t=SHIP_TYPES[player.shipId];
  for(const [stat,mult] of Object.entries({maxHp:t.hp,attack:t.attack,defense:t.defense,speed:t.speed})){
   const value=Number(player[stat])/(stat==='maxHp'?equippedBonus().hp:1);if(Number.isFinite(value))player.shipBaseStats[stat]=Math.max(stat==='maxHp'?1:0,Math.round(value/mult));
  }
 }
}
syncShipStats();loadAssembledVisual(player.shipId);
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
  player.gold-=cost.credits;player.loot.aleacion-=cost.material;player.upgrades.missiles=lv+1;logAction('commerce','Lanzamisiles · Nivel '+(lv+1)+' · −'+cost.credits.toLocaleString('es')+' créditos · '+cost.material+' aleación');missionEvent('missileUpgrade');
  missionEvent('upgrade');save();hud();renderUpgrades();renderInventory();if(docked)hangarRefresh();
  lootToast('🚀 Misiles por lanzamiento: '+missileCount());
 };
 }
}
function buyUpgrade(id){
 const u=UPGRADES.find(v=>v.id===id);if(!u)return;
 const lv=upgradeLevel(id),need=u.base+lv,price=u.credits*(lv+1);
 if(lv>=10||(Number(player.loot[u.material])||0)<need||player.gold<price)return;
 player.loot[u.material]-=need;player.gold-=price;player.upgrades[id]=lv+1;logAction('commerce','Mejora: '+u.name+' · Nivel '+(lv+1)+' · −'+price.toLocaleString('es')+' créditos · '+need+' '+(LOOT_TYPES.find(t=>t.id===u.material)?.name||u.material));
 if(player.shipBaseStats){player.shipBaseStats[u.stat]+=u.amount;syncShipStats()}
 else player[u.stat]+=u.amount;
 if(u.stat==='maxHp')player.hp=Math.min(player.maxHp,player.hp+u.amount);
 missionEvent('upgrade');save();hud();renderUpgrades();renderInventory();if(docked)hangarRefresh();
}
// Campaña inicial del Sector Aurora: progreso persistente por perfil.
const MISSIONS=[
 {title:'Primer contacto',description:'Destruye 5 exploradoras enemigas',event:'scout',goal:5,reward:500,xp:75},
 {title:'Recuperación espacial',description:'Recoge 3 cajas de botín',event:'loot',goal:3,reward:800,xp:110},
 {title:'Regreso a la base',description:'Atraca en Aurora y compra una mejora',event:'baseUpgrade',goal:2,reward:1500,xp:160},
 {title:'Escolta de combate',description:'Compra tu primer dron de combate en el hangar',event:'drone',goal:1,reward:1200,xp:120},
 {title:'Frena a los asaltantes',description:'Destruye 6 enemigos del segundo tipo: Asaltantes',event:'raider',goal:6,reward:1800,xp:180},
 {title:'Patrulla del borde',description:'Acércate a 200 m del borde de Aurora y vuelve a su zona segura',event:'edgeReturn',goal:2,reward:2000,xp:200},
 {title:'Arsenal de misiles',description:'Mejora el lanzamisiles al nivel 1 o superior',event:'missileUpgrade',goal:1,reward:1600,xp:160},
 {title:'Impacto decisivo',description:'Destruye 5 enemigos con el golpe final de un misil',event:'missileKill',goal:5,reward:2500,xp:240},
 {title:'Flota de apoyo',description:'Compra y equipa al menos 2 drones de combate',event:'drone',goal:2,reward:2500,xp:250}
];
const BELT_MISSIONS=[
 {title:'La puerta estelar',description:'Acércate a menos de 350 m del portal de Aurora',event:'portalNear',goal:1,reward:2200,xp:220},
 {title:'Cruza el portal',description:'Viaja al Cinturón Perdido mediante el portal',event:'travelBelt',goal:1,reward:3000,xp:280},
 {title:'Guardianes del Cinturón',description:'Destruye 6 guardianes del tercer tipo en el mapa 2',event:'sentinel',goal:6,reward:4000,xp:350},
 {title:'Recursos del nuevo sector',description:'Recoge 8 cajas de botín en el mapa 2',event:'loot',goal:8,reward:4500,xp:380},
 {title:'Amenaza pesada',description:'Destruye 4 enemigos del cuarto tipo en el mapa 2',event:'destroyer',goal:4,reward:5500,xp:450},
 {title:'Misiles en el Cinturón',description:'Destruye 5 enemigos del mapa 2 con misiles',event:'missileKill',goal:5,reward:6000,xp:500},
 {title:'Refugio del Cinturón',description:'Aterriza en la estación del mapa 2',event:'dock',goal:1,reward:3500,xp:300},
 {title:'Exploración completa',description:'Acércate a 200 m del borde del mapa 2 y vuelve a su zona segura',event:'edgeReturn',goal:2,reward:6000,xp:500}
];
const EMBER_MISSIONS=[
 {title:'Bienvenido a Ascuas',description:'Viaja al mapa 3 (nivel 30)',event:'travelEmber',goal:1,reward:6000,xp:1200},
 {title:'Refugio entre llamas',description:'Aterriza en la estación de Ascuas',event:'dock',goal:1,reward:8000,xp:1600},
 {title:'Despeja la ruta',description:'Destruye 8 Destructores en Ascuas',event:'destroyer',goal:8,reward:16000,xp:3200},
 {title:'Suministros de Ascuas',description:'Recoge 20 cajas de botín en el mapa 3',event:'loot',goal:20,reward:10000,xp:2000},
 {title:'Caza de Devastadores',description:'Destruye 6 Devastadores en Ascuas',event:'devastator',goal:6,reward:24000,xp:4800},
 {title:'Misiles entre cenizas',description:'Destruye 8 enemigos del mapa 3 con misiles',event:'missileKill',goal:8,reward:20000,xp:4000},
 {title:'Frontera ardiente',description:'Acércate a 200 m del borde de Ascuas y vuelve a la zona segura',event:'edgeReturn',goal:2,reward:15000,xp:3000},
 {title:'Caída del Coloso',description:'Destruye al Coloso Portanaves en Ascuas',event:'carrier',goal:1,reward:60000,xp:20000},
 {title:'Cazador de Colosos',description:'Destruye 10 Colosos Portanaves en Ascuas',event:'carrier',goal:10,reward:600000,xp:200000}
];
player.quests=player.quests&&typeof player.quests==='object'?player.quests:{};
let questCollapsed=true;

// Contratos largos: objetivos simultáneos, una misión activa y premio único.
const LONG_MISSIONS=[
 {id:'mixed-1',title:'1 · Limpieza de Aurora',objectives:[{event:'raider',sector:'aurora',goal:20,label:'Asaltantes'},{event:'scout',sector:'aurora',goal:30,label:'Exploradores'}]},
 {id:'mixed-2',title:'2 · Recuperación de suministros',objectives:[{event:'scout',sector:'aurora',goal:50,label:'Exploradores'},{event:'raider',sector:'aurora',goal:10,label:'Asaltantes'},{event:'loot',goal:40,label:'Cajas recogidas (cualquier mapa)'}]},
 {id:'mixed-3',title:'3 · Caza de guardianes',objectives:[{event:'sentinel',sector:'belt',goal:50,label:'Guardianes'}]},
 {id:'mixed-4',title:'4 · Operación entre sectores',objectives:[{event:'destroyer',sector:'belt',goal:30,label:'Destructores'},{event:'sentinel',sector:'belt',goal:20,label:'Guardianes'},{event:'scout',sector:'aurora',goal:80,label:'Exploradores'}]},
 {id:'graveyard-1',title:'Recuperación del Cementerio',objectives:[{event:'catapult',sector:'graveyard',goal:10,label:'Catapultas'},{event:'harpooner',sector:'graveyard',goal:10,label:'Arponeros'},{event:'stalker',sector:'graveyard',goal:6,label:'Acechadores'}]},
 {id:'gran-titan',title:'Caída del Gran Titán',objectives:[{event:'granTitan',sector:'graveyard',goal:1,label:'Gran Titán'}]},
 {id:'mixed-5',title:'5 · Ofensiva pesada',objectives:[{event:'raider',sector:'aurora',goal:100,label:'Asaltantes'},{event:'destroyer',sector:'belt',goal:20,label:'Destructores'}]}
].map(m=>{
 const weights={granTitan:[100000,40000],catapult:[1600,1200],harpooner:[2400,1600],stalker:[2400,1600],scout:[200,25],raider:[400,50],sentinel:[800,100],destroyer:[1600,200],loot:[100,10]};
 return {...m,reward:m.objectives.reduce((n,o)=>n+o.goal*weights[o.event][0],0),xp:m.objectives.reduce((n,o)=>n+o.goal*weights[o.event][1],0)};
});
const legacyMissions=[...MISSIONS.map((m,i)=>({...m,id:'aurora-'+i,level:1,legacySector:'aurora',legacyIndex:i,objectives:[{event:m.event,sector:'aurora',goal:m.goal,label:m.description}]})),
 ...BELT_MISSIONS.map((m,i)=>({...m,id:'belt-'+i,level:10,legacySector:'belt',legacyIndex:i,objectives:[{event:m.event,sector:m.event==='portalNear'?'aurora':'belt',goal:m.goal,label:m.description}]})),
 ...EMBER_MISSIONS.map((m,i)=>({...m,id:'ember-'+i,level:30,legacySector:'ember',legacyIndex:i,objectives:[{event:m.event,sector:'ember',goal:m.goal,label:m.description}]}))];
const missionCatalog=[...legacyMissions,...LONG_MISSIONS.map(m=>({...m,id:'contract-'+m.id,legacyContract:m.id,level:m.id==='mixed-1'||m.id==='mixed-2'?8:m.id.startsWith('mixed-')?15:40})),...CEMETERY_MISSIONS,...PVP_MISSIONS];
let missionBoard=createMissionBoard(missionCatalog,player.quests);
function renderMission(){
 const el=$('questTracker'),toggle=$('questToggle');if(!el)return;
 el.classList.toggle('hidden',questCollapsed);toggle.textContent='📋';toggle.setAttribute('aria-expanded',String(!questCollapsed));
 if(questCollapsed)return;
 const missions=missionBoard.remaining(player.level),next=missionBoard.nextLevel(player.level);
 $('questTitle').textContent='Misiones · '+missions.length+' disponibles';
 $('missionSummary').textContent=Number.isFinite(next)?'Se desbloquean más al nivel '+next:'Progreso automático · Recompensas al completar';
 const list=$('missionList'),stamp=JSON.stringify([player.level,missions.map(m=>[m.id,missionBoard.state.progress[m.id]])]);if(list.dataset.stamp===stamp)return;list.dataset.stamp=stamp;const scroll=list.scrollTop;
 list.innerHTML=missions.length?missions.map(m=>{
  const progress=missionBoard.state.progress[m.id],total=m.objectives.reduce((n,o)=>n+o.goal,0),done=progress.reduce((n,v)=>n+v,0);
  return '<article class="mission-card" data-mission="'+m.id+'"><strong>'+m.title+'</strong><small>Nivel '+m.level+'</small>'+m.objectives.map((o,i)=>'<small>'+o.label+' · '+progress[i]+'/'+o.goal+'</small>').join('')+'<div class="quest-progress"><i style="width:'+100*done/total+'%"></i></div><small class="mission-prize">'+m.reward.toLocaleString('es')+' créditos · '+m.xp.toLocaleString('es')+' XP</small></article>';
 }).join(''):'<p>No quedan misiones disponibles para tu nivel.</p>';list.scrollTop=scroll;
}
$('questToggle').onclick=()=>{questCollapsed=!questCollapsed;renderMission()};
function logAction(type,text,details={}){if(PVP_MODE&&!pvpHangar)return;recordAction(player,type,text,details);if(type==='commerce')combatAudio.play(text.includes('Reparación')?'repair':'purchase');else if(type==='mission')combatAudio.play('mission')}
function missionEvent(type,context={}){if(PVP_MODE&&!pvpHangar)return;
 const sector=context.sector||player.sector||'aurora';
 const awards=missionBoard.event(type,sector,player.level,{drones:ownedDrones(),missiles:upgradeLevel('missiles')});
 for(const m of awards){logAction('mission','Misión completada: '+m.title+' · +'+m.reward.toLocaleString('es')+' créditos · +'+m.xp+' XP',{mission:m.id,credits:m.reward,xp:m.xp});player.gold+=m.reward;gainXp(m.xp);lootToast('🏆 '+m.title+' · +'+m.reward.toLocaleString('es')+' créditos · +'+m.xp+' XP')}
 renderMission();save();
}
let missionExploreElapsed=0;
function updateExplorationMissions(dt){
 missionExploreElapsed+=dt;if(missionExploreElapsed<.5)return;missionExploreElapsed=0;
 if(!missionBoard.remaining(player.level).some(m=>m.objectives.some(o=>o.event==='edgeReturn'&&o.sector===activeSector)))return;
 if(currentSector().radius-sectorDistance()<=200)missionEvent('edgeNear',{sector:activeSector});
 else if(inSafeZone(playerMesh.position))missionEvent('baseReturn',{sector:activeSector});
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
function spawnLoot(e,exclusiveItem=null){
 const roll=Math.random(),item=exclusiveItem||LOOT_TYPES[roll<.53?0:roll<.81?1:roll<.96?2:3];
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

 drops.push({mesh,item,sector:activeSector,age:0,baseY:mesh.position.y});
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
  if(d.mesh.position.distanceTo(playerMesh.position)<90||(player.explorerDrone&&explorerMesh.visible&&explorerTask().mode==='collect'&&d.mesh.position.distanceTo(explorerMesh.position)<45)){
   player.loot[d.item.id]=(player.loot[d.item.id]||0)+1;
   combatAudio.play('resource');
   lootToast('✦ '+d.item.name+' · '+d.item.rarity);
   scene.remove(d.mesh);d.mesh.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.isMesh&&o.geometry===dropGeo)o.material.dispose()});drops.splice(i,1);missionEvent('loot',{sector:d.sector||activeSector});save();
  }else if(d.age>90){scene.remove(d.mesh);d.mesh.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.isMesh&&o.geometry===dropGeo)o.material.dispose()});drops.splice(i,1)}
 }
}
function kill(e,missile=false){
 if(e.dead)return;
 combatAudio.play('explosion',e.mesh.position);
 const t=TYPES[e.type],enemyName=(({scout:'Explorador',raider:'Asaltante',sentinel:'Guardián',destroyer:'Destructor',devastator:'Devastador',carrier:'Coloso Portanaves',catapult:'Catapulta de Chatarra',stalker:'Acechador de Chatarra',harpooner:'Arponero',granTitan:'Gran Titán'})[e.type]||'Enemigo')+(e.pro?' Pro':''),reward=e.type==='granTitan'?titanScale(player.level):e.type==='carrier'?advancedEnemyScale(player.level,30):enemyRewardScale(),gold=Math.round(t.gold*reward)*proRewardMultiplier(e),xp=Math.round(t.xp*reward)*proRewardMultiplier(e);
 if(e.type==='carrier'){
  bossState.hp=0;
  if(bossState.rewarded)return;
  bossState.rewarded=true;
  bossState.respawnAt=Date.now()+120000;
  for(const add of enemies.filter(add=>add.bossAdd&&!add.dead)){add.guard=false;add.nextPatrol=0}
 }
 if(e.type==='granTitan'){e.respawnAt=Date.now()+180000;clearTitanShots();titanRig.pose(0,'spear')}
 e.dead=e.titanAdd||e.type==='granTitan'||e.bossAdd||e.type==='carrier'?Infinity:performance.now()/1000+8;e.mesh.visible=false;
 logAction('combat','Enemigo destruido: '+enemyName+' · +'+gold.toLocaleString('es')+' créditos · +'+xp+' XP · '+t.loot+' recursos',{enemy:e.type,sector:activeSector,credits:gold,xp,resources:t.loot});
 missionEvent(e.type,{sector:activeSector});if(missile)missionEvent('missileKill',{sector:activeSector});
 player.gold+=gold;for(let i=0;i<t.loot;i++)spawnLoot(e);
 if(e.type==='granTitan'){
  // Recompensa garantizada del Cementerio: 3 unidades de cada recurso exclusivo.
  for(const id of ['nucleo_demolicion','bobina_anclaje','cristal_punteria']){
    const item=LOOT_TYPES.find(resource=>resource.id===id);
    for(let n=0;n<3;n++)spawnLoot(e,item);
  }
 }
 const specialDrop={catapult:['nucleo_demolicion',.25],harpooner:['bobina_anclaje',.25],stalker:['cristal_punteria',.20]}[e.type];
 if(specialDrop&&Math.random()<specialDrop[1])spawnLoot(e,LOOT_TYPES.find(item=>item.id===specialDrop[0]));
 gainXp(xp);
 lootToast('+'+gold+' créditos · +'+xp+' XP · '+t.loot+' recursos');save();
}
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
function skill(){if(PVP_MODE&&!pvpSession?.canFight)return;
 if(player.hp<=0||recoveryPending)return;
 if(skillCd>0||docked||landing||inSafeZone(playerMesh.position))return;
 combatAudio.play('missile',playerMesh.position);
 lastAttackAt=performance.now()/1000;repairRobot.visible=repairBeam.visible=false;
 updateTargetLock();
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 const cameraDir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
 const target=lockedEnemy;markExplorerAttack(target);
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
  shots.push({mesh,vel:launchDir.multiplyScalar(missileSpeed),life:5,damage:player.attack*3*activeBooster('damage'),missile:true,target,
   missileAim:target?null:aim.clone(),missileAge:0,missileSpeed,missileGuideDelay,missileEffects});
 }
 if(pvpSession)pvpSession.shots('missile',shots.filter(p=>!p.pvpSent&&!p.pvpRemote),playerMesh.position,player.attack,1,shots.find(p=>!p.pvpSent&&!p.pvpRemote&&p.target?.playerId)?.target.playerId||lockedEnemy?.playerId);for(const p of shots)if(!p.pvpRemote)p.pvpSent=true;
 skillCd=7;
}
// Protección alrededor de la estación del sector activo.
const SAFE_ZONE_RADIUS=760;
function inSafeZone(position){if(PVP_MODE)return !pvpSession?.canFight;return position.distanceTo(currentStation().position)<SAFE_ZONE_RADIUS}
let lastZoneLabel='',zoneToastTimer=null;
function updateZone(){if(PVP_MODE){$('targetInfo').textContent=pvpSession?.inDuel?'DUELO · Sin protección de base':pvpSession?.zone==='pve'?'ZONA PvE · Combate contra enemigos':pvpSession?.zone==='hostile'?'ZONA HOSTIL · PvP libre':'BASE PvP · Protegido';return inSafeZone(playerMesh.position)}
 const safe=inSafeZone(playerMesh.position);
 const label=safe?currentStationName().toLocaleUpperCase('es')+'|Zona segura':activeSector==='graveyard'?'CEMENTERIO DE NAVES|Sector de nivel 40+':activeSector==='ember'?'ASCUAS|Sector de nivel 30+':activeSector==='belt'?'CINTURÓN PERDIDO|Sector de nivel 10+':'SECTOR AURORA|Espacio abierto';
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
 if(PVP_MODE){const center=radarPoint(0,0);for(const [radius,color]of [[650,'#72dfff'],[3275,'#71f5a4'],[5900,'#ff6c79']]){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(center.x,center.y,radius*RADAR_RADIUS/RADAR_RANGE,0,Math.PI*2);ctx.stroke()}}
 const dot=(x,y,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()};
 for(const e of enemies){if(e.dead||!e.mesh.visible)continue;const p=radarPoint(e.mesh.position.x,e.mesh.position.z);if(p.inside)dot(p.x,p.y,e.pvpRemote&&!pvpSession?.canTarget(e.playerId)?'#68e6ff':e.pro?'#ffce60':'#ff6a6a',3)}
 for(const d of drops){const p=radarPoint(d.mesh.position.x,d.mesh.position.z);if(p.inside)dot(p.x,p.y,'#e8b5ff',2.8)}
 for(const route of (PVP_MODE?[{pos:{x:0,z:850},level:0}]:sectorPortalRoutes())){
  const p=radarPoint(route.pos.x,route.pos.z);if(p.inside)dot(p.x,p.y,player.level>=route.level?'#b899ff':'#796189',4);
 }
 // Mascota exploradora: punto celeste con borde blanco, distinto de los recursos.
 if(player.explorerDrone&&explorerMesh.visible){
  const pet=radarPoint(explorerMesh.position.x,explorerMesh.position.z);
  if(pet.inside){
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(pet.x,pet.y,4.5,0,Math.PI*2);ctx.stroke();
   dot(pet.x,pet.y,'#26edff',3.3);
  }
 }
 const base=currentStation();
 const station=radarPoint(base.position.x,base.position.z);
 if(station.inside)dot(station.x,station.y,'#56e5ff',5);
 ctx.restore();
 // La estación permanece señalada en el borde aunque quede fuera del alcance.
 if(!station.inside){const a=station.angle;const x=78+Math.cos(a)*62,y=78+Math.sin(a)*62;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle='#56e5ff';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore()}
 ctx.fillStyle='#fff7a1';ctx.beginPath();ctx.moveTo(78,68);ctx.lineTo(71,87);ctx.lineTo(78,83);ctx.lineTo(85,87);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#5bb9e4aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(78,78,72,0,Math.PI*2);ctx.stroke();
 const distance=Math.hypot(playerMesh.position.x-base.position.x,playerMesh.position.z-base.position.z);
 radarDistance.textContent=PVP_MODE?'Base PvP · '+Math.round(playerMesh.position.length())+' m':currentSectorName()+' · '+Math.round(distance)+' m';
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
 const tag=hangar.querySelector('.hangar-tag');if(tag)tag.textContent=PVP_MODE?'BASE PvP':currentStationName().toLocaleUpperCase('es');
 hangar.setAttribute('aria-label','Hangar '+(PVP_MODE?'Base PvP':currentStationName()));
 const missing=Math.max(0,Math.ceil(player.maxHp-player.hp)),cost=Math.ceil(missing*.3);
 hangarStats.textContent=(pvpHangar?'Casco offline: ':'Casco: ')+Math.ceil(player.hp)+' / '+player.maxHp+' · Energía: '+Math.ceil(player.energy)+' / '+player.maxEnergy+' · Créditos: '+player.gold+(pvpHangar?' · Casco PvP: '+(player.maxHp*20):'');
 $('repairBtn').textContent=missing?'Reparar casco · '+cost+' créditos':'Casco en perfecto estado';
 $('repairBtn').disabled=!missing||player.gold<cost;
 $('hangarMessage').textContent=missing&&player.gold<cost?'Necesitas '+cost+' créditos para reparar.':'';
 renderDrones();renderUpgrades();renderShips();if(hangarUI)hangarUI.render();
}
function resetDockControls(){
 joy.throttle=0;joy.strafe=0;$('stick').style.transform='';
 for(const key of Object.keys(keys))keys[key]=0;
}
function finishLanding(){
 combatAudio.play('touchdown');
 if(PVP_MODE){playerMesh.position.copy(LANDING_TOUCHDOWN);pitch=yaw=0;landing=false;document.body.classList.remove('landing');dockBtn.classList.add('hidden');openPvpHangar();return}
 landing=false;docked=true;
 playerMesh.position.copy(LANDING_TOUCHDOWN);pitch=0;yaw=0;
 resetDockControls();dockBtn.classList.add('hidden');
 document.body.classList.remove('landing');document.body.classList.add('docked');
 player.energy=player.maxEnergy;hangar.classList.remove('hidden');if(hangarUI)hangarUI.show('home');
 hangarRefresh();missionEvent('dock',{sector:activeSector});save();
}
// Solo aceptar una superficie horizontal realmente situada debajo de la nave.
// No usar posiciones antiguas si no existe una plataforma detectable.
function selectLandingPlatform(apply=false){
 if(activeSector==='graveyard'||activeSector==='ember'?false:activeSector==='belt'?!beltStationReady:!auroraModelReady)return false;
 if(activeSector==='graveyard'||activeSector==='ember'||activeSector==='belt'||modularStationReady){
  currentStation().updateMatrixWorld(true);
  let nearest=null,best=Infinity;
  for(const pad of activeSector==='graveyard'?graveyard.pads:activeSector==='ember'?emberLandingPads:activeSector==='belt'?beltLandingPads:modularLandingPads){
   const bounds=new THREE.Box3().setFromObject(pad);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=Math.hypot(playerMesh.position.x-center.x,playerMesh.position.z-center.z);
   const deltaY=playerMesh.position.y-bounds.max.y;
   if(distance<(pad.userData.landingRadius||155)&&deltaY>=-30&&deltaY<240&&distance<best){
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
 if(docked||landing||!panel.classList.contains('hidden'))return false;
 if(!selectLandingPlatform(true))return false;
 combatAudio.play('landing');landing=true;landingTime=0;landingStart=playerMesh.position.clone();landingYaw=yaw;landingPitch=pitch;
 resetDockControls();fireHeld=false;clearCombatShots();document.body.classList.add('landing');
 dockBtn.classList.remove('hidden');dockBtn.disabled=true;dockBtn.textContent='🛬 Piloto automático · Aproximación';
 return true;
}
dockBtn.onclick=()=>{
 if(dockBtn.disabled||dockBtn.classList.contains('hidden'))return;
 const base=currentStation(),distance=Math.hypot(playerMesh.position.x-base.position.x,playerMesh.position.z-base.position.z);
 if(distance<LANDING_RADIUS&&selectLandingPlatform()){if(PVP_MODE)pvpSession?.requestHangar();else beginLanding()}
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
 hangarUI?.stopPreview();
 if(PVP_MODE&&pvpHangar){closePvpHangar();return}
 if(!docked)return;
 combatAudio.play('takeoff');docked=false;landingArmed=false;
 hangar.classList.add('hidden');document.body.classList.remove('docked');
 // Salida fuera del pasillo de descenso, con altura suficiente sobre la plataforma.
 playerMesh.position.copy(currentStation().position).add(new THREE.Vector3(0,165,320));yaw=0;pitch=0;
 resetDockControls();save();
}
hangar.addEventListener('pointerdown',event=>{if(event.target!==hangar)return;event.preventDefault();event.stopPropagation();leaveHangar()});
$('repairBtn').onclick=()=>{
 if(!docked)return;
 const cost=Math.ceil(Math.max(0,player.maxHp-player.hp)*.3);
 if(!cost||player.gold<cost)return;
 player.gold-=cost;logAction('commerce','Reparación de casco · −'+cost.toLocaleString('es')+' créditos');player.hp=player.maxHp;hangarRefresh();save();hud();
};
function updateDock(){
 if(docked){dockBtn.classList.add('hidden');return}
 if(landing){dockBtn.classList.remove('hidden');return}
 const base=currentStation(),distance=Math.hypot(playerMesh.position.x-base.position.x,playerMesh.position.z-base.position.z);
 if(distance>LANDING_RADIUS+110)landingArmed=true;
 // Activación sólo cerca de la plataforma, no en toda la zona segura.
 const inCorridor=distance<LANDING_RADIUS&&selectLandingPlatform();
 const available=inCorridor&&panel.classList.contains('hidden')&&(!PVP_MODE||pvpSession?.canDock);
 dockBtn.classList.toggle('hidden',!available);
 dockBtn.disabled=!available;
 if(available)dockBtn.textContent='🛬 Aterrizar en '+(PVP_MODE?'Base PvP':currentStationName());
}
const keys={},joy={throttle:0};let yaw=player.yaw||0,pitch=player.pitch||0;
addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea,select,#farmAutoMenu'))return;keys[e.key.toLowerCase()]=1;if(e.code==='Space'){e.preventDefault();if(!document.body.classList.contains('inventory-open')&&!docked&&!landing)fire()}if(e.key.toLowerCase()==='q'&&!document.body.classList.contains('inventory-open')&&!docked&&!landing)skill()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
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
for(const [id,art] of [['fireBtn','fire'],['skillBtn','missile'],['classAbilityBtn','overload']]){const button=$(id);for(const child of [...button.childNodes])if(child.nodeType===3)child.remove();setCombatArtwork(button,art)}
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
function save(){if(PVP_MODE){
 if(!pvpHangar)return true;
 const saved=serializeHangarEditor(player,readOfflinePilot(localStorage));
 if(!safeStorageSet(SAVE_KEY,JSON.stringify(saved)))return false;pvpHangar.saved=saved;return true;
 }player.granTitanState={hp:titanEnemy.hp,maxHp:titanEnemy.maxHp,respawnAt:titanEnemy.respawnAt,position:titanEnemy.mesh.position.toArray(),patrolAngle:titanPatrolAngle};persistCarrierState();player.x=playerMesh.position.x;player.y=playerMesh.position.z;player.z=playerMesh.position.y;player.yaw=yaw;player.pitch=pitch;player.sector=activeSector;return safeStorageSet(SAVE_KEY,JSON.stringify(player))}setInterval(save,5000);addEventListener('beforeunload',save);
playerMesh.position.set(player.x,player.z,player.y);
if(!Number.isFinite(playerMesh.position.x)||!Number.isFinite(playerMesh.position.y)||!Number.isFinite(playerMesh.position.z))playerMesh.position.set(0,0,0);
// Límite del Sector Aurora. Otros planetas podrán definir su propio centro/radio.
const SECTOR_AURORA={x:0,z:-650,radius:3000,warning:600,damagePerSecond:8};
let activeSector=PVP_MODE?'aurora':['belt','ember','graveyard'].includes(player.sector)?player.sector:'aurora';
const currentSector=()=>activeSector==='graveyard'?GRAVEYARD:activeSector==='ember'?SECTOR_EMBER:activeSector==='belt'?SECTOR_BELT:SECTOR_AURORA;
 syncStationVisibility();
MAP_CENTER_X=currentSector().x;MAP_CENTER_Z=currentSector().z;
function resetSectorPopulation(){
 for(const rock of asteroidField.children)rock.position.copy(randomSectorPosition(850,currentSector().radius-50));
 const counts={};
 for(const e of enemies){
  if(e.type==='granTitan'){e.mesh.visible=activeSector==='graveyard'&&!e.dead;continue}
  if(e.titanAdd){e.mesh.visible=activeSector==='graveyard'&&!e.dead;continue}
  if(e.bossAdd){e.mesh.visible=activeSector==='ember'&&!e.dead&&!e.launchRemaining;continue}
  if(e.type==='carrier'){e.maxHp=enemyMaxHp('carrier');e.hp=bossState.hp;e.dead=bossState.hp>0?0:Infinity;e.mesh.visible=activeSector==='ember'&&bossState.hp>0;continue}
  if(e.type==='stalker')ensureAcechadorVisual(e);
  e.home.copy(randomEnemyHome(e.type));e.mesh.position.copy(e.home);e.maxHp=enemyMaxHp(e.type)*proMultiplier(e);e.hp=e.maxHp;e.dead=0;e.aggressive=!e.pro&&e.type!=='devastator';
  counts[e.type]=(counts[e.type]||0)+1;e.spawnRank=counts[e.type];e.mesh.visible=enemyBelongsToSector(e,e.spawnRank);e.fireTimer=1+Math.random()*2;
 }
 placeScrapPairs(enemies.filter(e=>!e.pro));
 explorerThreat=null;
}
// Aplicar también al cargar una partida guardada, antes de empezar el vuelo.
resetSectorPopulation();
missionEvent('inventory');
if(activeSector==='graveyard')missionEvent('travelGraveyard',{sector:'graveyard'});
if(activeSector==='belt'&&player.level>=10){
 missionEvent('portalNear',{sector:'aurora'});
 missionEvent('travelBelt',{sector:'belt'});
}
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
const portalCharge=new THREE.Group();portalCharge.name='portalCharge';
const portalChargeGeometry=new THREE.CircleGeometry(23,64);
const portalChargeFront=new THREE.Mesh(portalChargeGeometry,portalChargeMaterial);
const portalChargeBack=new THREE.Mesh(portalChargeGeometry,portalChargeMaterial);
portalChargeFront.position.z=.8;portalChargeBack.position.z=-.8;portalChargeBack.rotation.y=Math.PI;
portalCharge.add(portalChargeFront,portalChargeBack);portalCharge.visible=false;portalMesh.add(portalCharge);
// Use a standard emissive texture, without modifying the renderer's shaders.
function configurePortalEmission(material){
 material.userData.portalEnergy=true;
 material.emissive.setHex(0x77cfff);material.emissiveIntensity=1.15;
 material.needsUpdate=true;
}
function makePortalEnergyMap(source){
 const image=source.image;
 if(!image)return null;
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const context=canvas.getContext('2d');if(!context)return null;
 context.drawImage(image,0,0);
 const pixels=context.getImageData(0,0,canvas.width,canvas.height);
 for(let i=0;i<pixels.data.length;i+=4){
  const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
  const blue=Math.max(0,Math.min(1,(b-r-10)/50));
  const bright=Math.max(0,Math.min(1,(Math.max(g,b)-70)/130));
  pixels.data[i]=Math.round(r*blue*bright);pixels.data[i+1]=Math.round(g*blue*bright);pixels.data[i+2]=Math.round(b*blue*bright);
 }
 context.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.flipY=source.flipY;texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;texture.channel=source.channel;
 texture.offset.copy(source.offset);texture.repeat.copy(source.repeat);texture.center.copy(source.center);texture.rotation=source.rotation;
 return texture;
}
function updatePortalEmission(portal,intensity){
 portal.traverse(object=>{
  if(!object.isMesh)return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(material?.userData?.portalEnergy)material.emissiveIntensity=intensity;
  }
 });
}
deferredModelLoad(modelLoader,'./assets/models/ancestral-portal.glb?v=300',gltf=>{
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
   material.metalness=.22;material.roughness=.78;
   material.normalScale.set(.4,.4);
   if(material.map){
    material.map.anisotropy=anisotropy;
    try{
     const energyMap=makePortalEnergyMap(material.map);
     if(energyMap){material.emissiveMap=energyMap;configurePortalEmission(material)}
    }catch(error){console.warn('No se pudo aislar el brillo del portal; se conserva su textura.',error)}
   }
   material.needsUpdate=true;
  }
 });
 portalMesh.add(model);portalMesh.userData.portalModel=model;
 portalRing.visible=false;portalDisk.visible=false;
 // The GLB is centered above: keep energy inside its aperture, not on the
 // outer faces of the thick frame (which drift sideways in oblique views).
 portalHalo.position.set(0,0,0);portalHalo.visible=true;
 portalCharge.position.set(0,0,0);
 portalChargeFront.position.z=.08;portalChargeBack.position.z=-.08;
 portalLight.color.setHex(0x3bafff);refreshSecondaryPortal();
},undefined,err=>console.warn('Modelo de portal no disponible; se conserva el portal provisional.',err));
const portalLight=new THREE.PointLight(0x8a65ff,20,180);portalMesh.add(portalLight);scene.add(portalMesh);
// Destination plaques: stone-carved labels placed above each portal arch.
const portalNames={aurora:'AURORA',belt:'CINTURÓN PERDIDO',ember:'ASCUAS',graveyard:'CEMENTERIO DE NAVES',pvp:'MAPA PvP'};
function makeStonePortalLabel(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
 const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false}));
 sprite.scale.set(50,9.4,1);sprite.position.set(0,37,8);sprite.name='stoneDestinationLabel';
 sprite.userData.drawDestination=(destination)=>{
  ctx.clearRect(0,0,1024,192);
  ctx.fillStyle='#383b3d';ctx.strokeStyle='#85817a';ctx.lineWidth=12;
  ctx.beginPath();ctx.roundRect(15,12,994,166,20);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#1d1d1e';ctx.lineWidth=5;ctx.strokeRect(34,30,956,130);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 66px Georgia,serif';
  ctx.shadowColor='#0b0b0b';ctx.shadowBlur=3;ctx.shadowOffsetY=5;ctx.fillStyle='#d1c6ae';
  ctx.fillText(portalNames[destination]||destination.toUpperCase(),512,94,920);
  texture.needsUpdate=true;
 };
 return sprite;
}
const primaryPortalLabel=makeStonePortalLabel();portalMesh.add(primaryPortalLabel);
function clonePortalVisual(){
 const metadata=portalMesh.userData;portalMesh.userData={};const clone=portalMesh.clone(true);portalMesh.userData=metadata;
 // Object3D.clone omits functions in userData: rebuild the destination label
 // immediately, before the first frame or the asynchronous model load.
 const oldLabel=clone.getObjectByName('stoneDestinationLabel');if(oldLabel)clone.remove(oldLabel);
 clone.add(makeStonePortalLabel());
 // Independent energy materials prevent charging the other route's portal.
 const materials=new Map();
 clone.traverse(object=>{if(!object.isMesh)return;
  const copy=material=>{
   if(!material?.userData?.portalEnergy)return material;
   if(!materials.has(material)){const owned=material.clone();configurePortalEmission(owned);materials.set(material,owned)}
   return materials.get(material);
  };
  object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);
 });
 return clone;
}
let secondaryPortal=clonePortalVisual();scene.add(secondaryPortal);
function refreshSecondaryPortal(){
 secondaryPortal.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material?.userData?.portalEnergy)material.dispose()});
 scene.remove(secondaryPortal);secondaryPortal=clonePortalVisual();secondaryPortal.getObjectByName('portalCharge').visible=false;scene.add(secondaryPortal);
}
const beltEmberPortal=new THREE.Vector3(SECTOR_BELT.x+2450,300,SECTOR_BELT.z-800);
const emberPortal=new THREE.Vector3(SECTOR_EMBER.x,0,SECTOR_EMBER.z+4000);
const beltEmberRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(SECTOR_BELT.x,0,SECTOR_BELT.z).sub(beltEmberPortal).normalize());
const emberGraveyardPortal=new THREE.Vector3(SECTOR_EMBER.x+3900,300,SECTOR_EMBER.z-800);
const graveyardPortal=new THREE.Vector3(GRAVEYARD.x,0,GRAVEYARD.z+4000);
const emberGraveyardRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(SECTOR_EMBER.x,0,SECTOR_EMBER.z).sub(emberGraveyardPortal).normalize());
const graveyardPvpPortal=new THREE.Vector3(GRAVEYARD.x+3400,200,GRAVEYARD.z-1400);
const auroraPvpPortal=new THREE.Vector3(-1900,150,-1700);
function sectorPortalRoutes(){
 if(activeSector==='graveyard')return [{id:'graveyard-pvp',pos:graveyardPvpPortal,rotation:emberGraveyardRotation,to:'pvp',level:0},{id:'graveyard-ember',pos:graveyardPortal,rotation:beltPortalRotation,to:'ember',level:0,arrival:emberGraveyardPortal.clone().add(new THREE.Vector3(-200,0,0))}];
 if(activeSector==='aurora')return [{id:'aurora-belt',pos:auroraPortal,rotation:auroraPortalRotation,to:'belt',level:10,arrival:beltPortal.clone().add(new THREE.Vector3(0,0,-140))},...(player.level>=40?[{id:'aurora-pvp',pos:auroraPvpPortal,rotation:auroraPortalRotation,to:'pvp',level:40}]:[])];
 if(activeSector==='ember')return [{id:'ember-graveyard',pos:emberGraveyardPortal,rotation:emberGraveyardRotation,to:'graveyard',level:40,arrival:graveyardPortal.clone().add(new THREE.Vector3(0,0,-200))},{id:'ember-belt',pos:emberPortal,rotation:beltPortalRotation,to:'belt',level:0,arrival:beltEmberPortal.clone().add(new THREE.Vector3(-140,0,0))}];
 return [
  {id:'belt-aurora',pos:beltPortal,rotation:beltPortalRotation,to:'aurora',level:0,arrival:auroraPortal.clone().addScaledVector(portalDir,-140)},
  {id:'belt-ember',pos:beltEmberPortal,rotation:beltEmberRotation,to:'ember',level:30,arrival:emberPortal.clone().add(new THREE.Vector3(0,0,-140))}
 ];
}
let selectedPortalId=null;
const portalMessage=document.createElement('div');portalMessage.style.cssText='position:fixed;left:50%;top:24%;transform:translateX(-50%);z-index:40;background:#170e35ec;color:white;border:1px solid #9c83ff;border-radius:12px;padding:12px 16px;font:700 15px system-ui;text-align:center;pointer-events:none;display:none';document.body.appendChild(portalMessage);
let portalCountdown=0,portalLastTick=performance.now();
function portalChargePulse(seconds){
 const t=Math.max(0,Math.min(3,seconds));
 // Frecuencia continua: de 0,6 destellos/s al inicio a 5 destellos/s al final.
 const phase=2*Math.PI*(.6*t+(4.4/6)*t*t);
 return Math.pow(.5-.5*Math.cos(phase),1.6);
}
let checkingPvpVersion=false;
async function switchSector(route){
 if(!route||player.level<route.level)return;
 combatAudio.play('portalTravel');
 if(route.to==='pvp'){
  if(checkingPvpVersion)return;checkingPvpVersion=true;
  try{await checkPvpVersion()}catch(error){portalCountdown=0;if(error.updateRequired)showPvpUpdate();else window.alert(error.message);return}finally{checkingPvpVersion=false}
  const portal=route.pos||graveyardPvpPortal,towardBase=currentStation().position.clone().sub(portal).normalize();
  playerMesh.position.copy(portal).addScaledVector(towardBase,350);
  if(save())location.href='./index.html?pvp=1';return;
 }
 activeSector=route.to;player.sector=activeSector;
 syncStationVisibility();
 const sector=currentSector();MAP_CENTER_X=sector.x;MAP_CENTER_Z=sector.z;
 playerMesh.position.copy(route.arrival);
 resetSectorPopulation();clearCombatShots();
 for(const d of drops)scene.remove(d.mesh);drops.length=0;
 renderMission();
 missionEvent(activeSector==='graveyard'?'travelGraveyard':activeSector==='belt'?'travelBelt':activeSector==='ember'?'travelEmber':'travelAurora',{sector:activeSector});
 portalCountdown=0;selectedPortalId=null;portalCharge.visible=false;portalChargeMaterial.opacity=0;save();lootToast('🌌 '+currentSectorName());
}
function updateSectorPortal(){if(PVP_MODE){portalMesh.visible=secondaryPortal.visible=false;portalMessage.style.display='none';return}
 const dt=Math.min(.1,(performance.now()-portalLastTick)/1000);portalLastTick=performance.now();
 const routes=sectorPortalRoutes().sort((a,b)=>playerMesh.position.distanceTo(a.pos)-playerMesh.position.distanceTo(b.pos)),route=routes[0];
 if(selectedPortalId!==route.id){portalCountdown=0;selectedPortalId=route.id}
 portalMesh.position.copy(route.pos);portalMesh.quaternion.copy(route.rotation);
 if(primaryPortalLabel.userData.destination!==route.to){primaryPortalLabel.userData.destination=route.to;primaryPortalLabel.userData.drawDestination(route.to)}
 secondaryPortal.visible=routes.length>1;
 if(routes[1]){secondaryPortal.position.copy(routes[1].pos);secondaryPortal.quaternion.copy(routes[1].rotation);const label=secondaryPortal.getObjectByName('stoneDestinationLabel');if(label&&label.userData.destination!==routes[1].to){label.userData.destination=routes[1].to;label.userData.drawDestination(routes[1].to)}}
 const distance=playerMesh.position.distanceTo(route.pos),near=distance<=350,unlocked=player.level>=route.level;
 if(activeSector==='aurora'&&unlocked&&near)missionEvent('portalNear',{sector:'aurora'});
 const charging=distance<=100&&unlocked&&!docked&&!landing;
 if(charging){combatAudio.play('portalCharge');portalCountdown+=dt;if(portalCountdown>=3){switchSector(route);portalMessage.style.display='none';return}}else portalCountdown=0;
 const pulse=charging?portalChargePulse(portalCountdown):0;
 const idleGlow=1.15+Math.sin(performance.now()*.0016)*.18;
 updatePortalEmission(portalMesh,idleGlow+(charging ? .8+pulse*1.4 : 0));
 if(secondaryPortal.visible)updatePortalEmission(secondaryPortal,idleGlow);
 portalCharge.visible=charging;portalChargeMaterial.opacity=pulse*.65;
 portalRing.rotation.z=0;portalMat.color.setHex(charging?0x70faff:unlocked?0x9e75ff:0x68448f);portalFill.opacity=.25;portalLight.intensity=charging?20+pulse*70:20;
 if(portalMesh.userData.portalModel){portalHalo.material.opacity=unlocked?.18:.08;portalHalo.scale.setScalar(1)}
 portalMessage.style.display=near&&!docked&&!landing?'block':'none';
 if(near)portalMessage.textContent=!unlocked?'🔒 Portal bloqueado · Llega al nivel '+route.level:charging?'🌀 Portal activándose · '+Math.ceil(3-portalCountdown)+' s':'🌀 '+(route.to==='pvp'?'Mapa PvP · requiere internet':route.to==='graveyard'?'Cementerio de Naves':route.to==='ember'?'Ascuas':route.to==='belt'?'Cinturón Perdido':'Aurora')+' · Acércate a 100 m';
}

const sectorNotice=document.createElement('div');sectorNotice.setAttribute('role','status');
sectorNotice.style.cssText='position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:35;max-width:85vw;padding:10px 15px;border-radius:12px;background:rgba(15,13,31,.82);border:1px solid rgba(255,160,75,.6);color:#ffe4ba;font:600 14px system-ui;text-align:center;pointer-events:none;display:none;';
document.body.appendChild(sectorNotice);
function sectorDistance(){if(PVP_MODE)return playerMesh.position.length();const sector=currentSector();return Math.hypot(playerMesh.position.x-sector.x,playerMesh.position.y,playerMesh.position.z-sector.z)}
// Recuperar partidas anteriores guardadas muy lejos, sin borrar su progreso.
if(sectorDistance()>currentSector().radius){const sector=currentSector();playerMesh.position.set(sector.x,110,sector.z+450);player.x=sector.x;player.y=sector.z+450;player.z=110}

// Membrana del límite: una esfera fija, visible suavemente solo al acercarse.
const zoneMembraneMaterial=new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,side:THREE.BackSide,
 uniforms:{tint:{value:new THREE.Color(0x91d9ff)},strength:{value:0}},
 vertexShader:`varying vec3 worldPoint; varying vec3 worldNormal;
 void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`uniform vec3 tint;uniform float strength;varying vec3 worldPoint;varying vec3 worldNormal;
 void main(){vec3 viewDirection=normalize(cameraPosition-worldPoint);float rim=pow(1.0-abs(dot(normalize(worldNormal),viewDirection)),2.0);gl_FragColor=vec4(tint,strength*(0.018+0.09*rim));}`
});
const zoneMembrane=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),zoneMembraneMaterial);
zoneMembrane.name='Membrana del límite del sector';zoneMembrane.frustumCulled=false;scene.add(zoneMembrane);
function updateZoneMembrane(){
 const sector=PVP_MODE?{x:0,z:0,radius:pvpSession?.radius||3000}:currentSector(),distance=PVP_MODE?playerMesh.position.length():sectorDistance();
 zoneMembrane.position.set(sector.x,0,sector.z);zoneMembrane.scale.setScalar(sector.radius);
 zoneMembraneMaterial.uniforms.tint.value.set(activeSector==='ember'?0xffba96:0x91d9ff);
 const proximity=THREE.MathUtils.clamp(1-Math.abs(sector.radius-distance)/800,0,1);
 zoneMembraneMaterial.uniforms.strength.value=proximity*proximity*(3-2*proximity);
 zoneMembrane.visible=!docked&&!landing&&proximity>0;
}

function updateSectorBoundary(dt){if(PVP_MODE){updateZoneMembrane();const d=Math.hypot(playerMesh.position.x,playerMesh.position.z);const radius=pvpSession?.radius||5900;if(d>radius){playerMesh.position.x*=radius/d;playerMesh.position.z*=radius/d;}return}
 updateZoneMembrane();
 if(docked||landing){sectorNotice.style.display='none';return}
 const sector=currentSector(),d=sectorDistance(),remaining=sector.radius-d;
 if(remaining>sector.warning){sectorNotice.style.display='none';return}
 sectorNotice.style.display='block';combatAudio.play('boundary');
 if(remaining>=0){sectorNotice.textContent='⚠️ Límite de '+currentSectorName()+' a '+Math.ceil(remaining)+' m';return}
 // Franja exterior de 200 m: conserva el daño de advertencia y evita volar a otro mapa.
 const maximumDistance=sector.radius+200;
 if(d>maximumDistance){
  const center=new THREE.Vector3(sector.x,0,sector.z);
  playerMesh.position.sub(center).multiplyScalar(maximumDistance/d).add(center);
 }
 player.hp=Math.max(0,player.hp-sector.damagePerSecond*dt);
 sectorNotice.textContent='☢️ Fuera del sector · -8 casco/s · Regresa al interior';
}
camera.position.copy(playerMesh.position).add(new THREE.Vector3(0,100,210));camera.lookAt(playerMesh.position.clone().add(new THREE.Vector3(0,8,-150)));
function hud(){const compact=$('hudCompactHealthFill');if(compact)compact.style.width=Math.max(0,Math.min(100,100*player.hp/player.maxHp))+'%';if(PVP_MODE)rankedName($('playerName'),player.name,player.livePvpRank);else $('playerName').textContent=player.name;$('classLabel').textContent='Nave '+(SHIP_TYPES[player.shipId]?.name||'Aurora');$('level').textContent='Nivel '+player.level;$('hpText').textContent=Math.ceil(player.hp)+'/'+player.maxHp;$('energyText').textContent=Math.ceil(player.energy)+'/'+player.maxEnergy;$('hpBar').style.width=player.hp/player.maxHp*100+'%';$('energyBar').style.width=player.energy/player.maxEnergy*100+'%';$('attack').textContent=player.attack;$('defense').textContent=player.defense;$('gold').textContent=player.gold;const lootCount=Object.values(player.loot||{}).reduce((a,b)=>a+(Number(b)||0),0);$('lootCount').textContent=lootCount;$('xpText').textContent='XP '+Math.floor(player.xp)+' / '+xpNeed();$('xpBar').style.width=player.xp/xpNeed()*100+'%';$('skillCd').textContent=skillCd>0?Math.ceil(skillCd)+'s':'';presentCombatButton($('skillBtn'),{remaining:skillCd,duration:7,blocked:docked||landing||recoveryPending});presentCombatButton($('fireBtn'),{pressed:fireHeld,blocked:docked||landing||recoveryPending})}
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
const panel=$('characterPanel');combatAudio.mount(panel);graphicsUI=mountGraphicsSettings(graphics,{parent:panel,storage:{setItem:(key,value)=>localStorage.setItem(key,value)}});const closeCharacterPanel=()=>{panel.classList.add('hidden');document.body.classList.remove('inventory-open')};$('characterBtn').onclick=()=>{$('nameInput').value=player.name;$('statList').innerHTML='Nave equipada: '+(SHIP_TYPES[player.shipId]?.name||'Aurora')+'<br>Nivel: '+player.level+'<br>Casco máximo: '+player.maxHp+'<br>Vida actual: '+Math.ceil(player.hp)+'<br>Energía máxima: '+player.maxEnergy+'<br>Potencia: '+player.attack+'<br>Escudo: '+player.defense+'<br>Velocidad: '+Math.round(player.speed*equippedBonus().speed);renderInventory();renderUpgrades();renderDrones();panel.classList.remove('hidden');document.body.classList.add('inventory-open')};$('closePanel').onclick=closeCharacterPanel;document.addEventListener('pointerdown',event=>{if(panel.classList.contains('hidden')||panel.contains(event.target)||event.target.closest('#characterBtn'))return;event.preventDefault();event.stopImmediatePropagation();closeCharacterPanel()},true);$('saveBtn').onclick=()=>{player.name=$('nameInput').value.trim()||'Nave Aurora';save();closeCharacterPanel()};// QA es local y no representa autenticación segura: mantenerlo solo en pruebas.
const activityJournal=mountJournal({getPlayer:()=>PVP_MODE&&!pvpHangar?readOfflinePilot(localStorage):player,onOpen:()=>resetDockControls()});
$('journalBtn').onclick=()=>activityJournal.open();$('hangarJournal').onclick=()=>activityJournal.open();
addEventListener('mundo:open-journal',()=>activityJournal.open());
const qaSwitch=$('qaSwitch'),qaTools=$('qaTools');
qaSwitch.textContent=qaActive?'Volver a partida normal':'Cambiar de partida';
$('qaPanel').classList.toggle('hidden',!window.MUNDO_PLAY_MODE?.testEnabled&&!qaActive);
qaTools.classList.toggle('hidden',!qaActive);
qaSwitch.onclick=()=>{if(!save())return;window.MUNDO_PLAY_MODE.choose()};
addEventListener('mundo:save-before-switch',()=>{save()});
function qaApply(fn,label=document.activeElement?.textContent){if(!qaActive)return;fn();logAction('qa',label||'Ayuda de prueba aplicada');save();hud();renderDrones();renderUpgrades();renderInventory();if(docked)hangarRefresh()}
$('qaCredits').onclick=()=>qaApply(()=>player.gold=(Number(player.gold)||0)+100000);
$('qaDrones').onclick=()=>qaApply(()=>{player.droneCount=8;syncShipStats()});
$('qaHeal').onclick=()=>qaApply(()=>{player.hp=player.maxHp;player.energy=player.maxEnergy});
$('qaLevels').onclick=()=>qaApply(()=>{for(let i=0;i<5;i++){player.level++;combatAudio.play('levelUp');player.maxEnergy+=5;player.shipBaseStats.maxHp+=10;player.shipBaseStats.attack+=2;player.shipBaseStats.defense++}syncShipStats();player.hp=player.maxHp;player.energy=player.maxEnergy});
$('qaMaterials').onclick=()=>qaApply(()=>{for(const t of LOOT_TYPES)player.loot[t.id]=(Number(player.loot[t.id])||0)+100});
$('resetBtn').onclick=()=>{if(confirm('¿Reiniciar la nave y todo su progreso?')&&safeStorageRemove(SAVE_KEY))location.reload()};
$('interactBtn').classList.add('hidden');$('dialogue').classList.add('hidden');renderMission();
hangarUI=mountHangarUI({player,isDocked:()=>docked,isPvpBase:()=>PVP_MODE&&!!pvpHangar,isOffline:()=>!PVP_MODE||!!pvpHangar,equip:equipFormation,equipShip:changeShip,log:logAction,changed:()=>{save();hud();renderInventory();hangarRefresh()}});
let boosterStatusSecond=-1;
function updateBoosterStatus(){
 const second=Math.floor(performance.now()/1000);if(second===boosterStatusSecond)return;boosterStatusSecond=second;
 const active=Object.entries(player.boosters).filter(([,seconds])=>seconds>0);
 const el=$('boosterStatus');el.classList.toggle('hidden',PVP_MODE||!active.length);
 const labels={damage:'⚡',resistance:'🛡',xp:'⭐'};
 el.textContent=active.map(([id,seconds])=>labels[id]+' '+Math.floor(Math.ceil(seconds)/60)+':'+String(Math.ceil(seconds)%60).padStart(2,'0')).join(' · ');
}
let graphicsDetailAt=0;
function updateGraphicsDetail(now){
 if(now<graphicsDetailAt)return;graphicsDetailAt=now+250;
 if(activeSector!=='graveyard')return;
 const profile=graphics.profile,origin=graveyard.environment.position;
 const localX=playerMesh.position.x-origin.x,localY=playerMesh.position.y-origin.y,localZ=playerMesh.position.z-origin.z;
 const visible=(object,distance)=>Math.hypot(object.position.x-localX,object.position.y-localY,object.position.z-localZ)<distance;
 const scraps=graveyard.environment.userData.scrapModels;
 if(scraps)for(const object of scraps.children)object.visible=visible(object,profile.debrisDistance);
 const rings=graveyard.environment.userData.ringDebris;
 if(rings)for(const object of rings.children)object.visible=visible(object,profile.detailDistance);
 for(const object of graveyard.environment.userData.wreckShips||[])object.visible=visible(object,profile.detailDistance);
}
let last=performance.now();
let recoveryPending=false;
const recoveryPanel=document.createElement('div');
recoveryPanel.style.cssText='position:fixed;inset:0;z-index:100;background:#020611dd;display:none;align-items:center;justify-content:center;padding:20px;color:white;font:16px system-ui';
recoveryPanel.innerHTML='<div style="max-width:440px;padding:24px;background:#101c30;border:1px solid #68bdde;border-radius:18px;text-align:center"><h2>Nave destruida</h2><p>Elige dónde recuperar tu nave.</p><p id="recoveryBalance"></p><button id="recoverCurrent" style="display:block;width:100%;padding:14px;margin:12px 0">Reparar en este mapa · 1.000 créditos</button><button id="recoverAurora" style="display:block;width:100%;padding:14px;margin:12px 0">Volver a base Aurora · 100 créditos</button><small id="recoveryHelp"></small></div>';
document.body.appendChild(recoveryPanel);
// Breve destello de destrucción para la nave del jugador, también en PvP.
function playerDestructionBurst(){
 const burst=document.createElement('div');
 burst.setAttribute('aria-hidden','true');
 burst.style.cssText='position:fixed;left:50%;top:50%;width:110px;height:110px;border-radius:50%;pointer-events:none;z-index:9990;transform:translate(-50%,-50%) scale(.2);opacity:1;background:radial-gradient(circle,#fff 0%,#ffe9a0 13%,#ff8b21 31%,#e83c17 48%,#ff551a55 65%,transparent 73%);box-shadow:0 0 35px 12px #ff8c2866;transition:transform .48s ease-out,opacity .48s ease-out';
 document.body.appendChild(burst);
 requestAnimationFrame(()=>{burst.style.transform='translate(-50%,-50%) scale(2.1)';burst.style.opacity='0'});
 setTimeout(()=>burst.remove(),550);
}
function showRecovery(){
 if(PVP_MODE||recoveryPending)return;
 combatAudio.play('defeat');playerDestructionBurst();
 recoveryPending=true;resetDockControls();explorerThreat=null;clearCombatShots();
 repairRobot.visible=repairBeam.visible=false;lockFrame.classList.add('hidden');
 sectorNotice.style.display='none';portalMessage.style.display='none';portalCountdown=0;
 $('recoveryBalance').textContent='Créditos disponibles: '+player.gold;
 $('recoverCurrent').disabled=player.gold<1000;$('recoverCurrent').textContent='Revivir en '+currentStationName()+' · 1.000 créditos';
 $('recoverAurora').textContent='Revivir en Aurora · '+pveRecoveryCost(false,player.gold).toLocaleString('es-CL')+' créditos';
 $('recoveryHelp').textContent=player.gold<100?'Rescate de emergencia: se cobra solo tu saldo disponible.':'';
 recoveryPanel.style.display='flex';save();
}
let recoveryBusy=false;
async function recoverShip(inCurrentMap){
 if(!recoveryPending||recoveryBusy||inCurrentMap&&player.gold<1000)return;
 recoveryBusy=true;
 try{
 $('recoverCurrent').disabled=$('recoverAurora').disabled=true;
 const cost=pveRecoveryCost(inCurrentMap,player.gold);
 const station=inCurrentMap?currentStation():auroraStation;
 const arrival=station.position.clone().add(new THREE.Vector3(0,165,350));
 // Persist payment, full health and the safe arrival together, without PvP auth.
 if(!save())throw Error('No se pudo guardar la partida antes del rescate.');
 const restored=settlePveRecovery(localStorage,SAVE_KEY,{current:inCurrentMap,sector:activeSector,arrival:{x:arrival.x,y:arrival.z,z:arrival.y}});
 Object.assign(player,restored);checkpointProfile(localStorage,window.COSMOS_ACTIVE_PROFILE);
 docked=false;landing=false;landingArmed=false;hangar.classList.add('hidden');
 if(!inCurrentMap&&activeSector!=='aurora')await switchSector({to:'aurora',level:0,arrival});
 else playerMesh.position.copy(arrival);
 combatAudio.play('respawn');recoveryPending=false;recoveryPanel.style.display='none';clearCombatShots();explorerThreat=null;
 camera.position.copy(playerMesh.position).add(new THREE.Vector3(0,100,210));save();hud();
 lootToast('Rescate a '+(inCurrentMap?currentStationName():'Aurora')+' · −'+cost+' créditos');
 }catch(error){$('recoveryHelp').textContent=error.message;$('recoverCurrent').disabled=player.gold<1000;$('recoverAurora').disabled=false;}finally{recoveryBusy=false}
}
$('recoverCurrent').onclick=()=>recoverShip(true);
$('recoverAurora').onclick=()=>recoverShip(false);

// AUTO supplies inputs to the existing flight/combat systems; it never awards loot.
let farmPilot=null,farmUI=null,farmUiTick=0;
if(!PVP_MODE){
 let config={};try{config=JSON.parse(safeStorageGet(SAVE_KEY+'.farmPilot')||'{}')}catch{}
 farmPilot=createFarmPilot(config);
 farmUI=mountFarmPilotUI({pilot:farmPilot,level:()=>player.level,onStart:resetDockControls,persist:c=>safeStorageSet(SAVE_KEY+'.farmPilot',JSON.stringify(c))});
 if(!PVP_MODE)mountPvpControlEditor({realm:window.MUNDO_PLAY_MODE?.mode||'normal',isHangarOpen:()=>docked,pve:true});
 const manual=e=>{if(e.target.closest?.('#farmAutoBtn,#farmAutoMenu'))return;if(farmPilot.running){farmPilot.stop();farmUI.refresh()}};
 document.addEventListener('pointerdown',manual,true);
 document.addEventListener('touchstart',manual,{capture:true,passive:true});
 addEventListener('keydown',e=>{if(!e.target.closest?.('#farmAutoMenu'))manual(e)},true);
 const suspend=()=>{farmPilot.stop('AUTO detenido · juego inactivo');farmUI.refresh()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});addEventListener('blur',suspend);addEventListener('pagehide',suspend);
}
function farmBasePoint(){
 const pads=activeSector==='graveyard'?graveyard.pads:activeSector==='ember'?emberLandingPads:activeSector==='belt'?beltLandingPads:modularLandingPads;
 if(pads.length){currentStation().updateMatrixWorld(true);let nearest=null,best=Infinity;for(const pad of pads){const box=new THREE.Box3().setFromObject(pad),p=box.getCenter(new THREE.Vector3());p.y=box.max.y+140;const d=p.distanceToSquared(playerMesh.position);if(d<best){nearest=p;best=d}}return nearest}
 return currentStation().position.clone().add(new THREE.Vector3(0,150,0));
}
let farmObstacles=[],farmObstacleAt=-Infinity,farmBase=null,farmObstacleSector=null;
function farmInput(dt,now){
 if(!farmPilot?.running)return null;
 const paused=farmUI.open||!panel.classList.contains('hidden')||document.body.classList.contains('journal-open')||document.body.classList.contains('portrait-blocked');
 if(now-farmObstacleAt>500||farmObstacleSector!==activeSector){farmObstacleSector=activeSector;farmObstacleAt=now;farmBase=farmBasePoint();farmObstacles=asteroidField.visible?asteroidField.children.filter(o=>o.position.distanceToSquared(playerMesh.position)<700*700).map(o=>({position:o.position,radius:Math.max(o.scale.x,o.scale.y,o.scale.z)*1.5})):[];}
 const command=farmPilot.tick({pvp:PVP_MODE,active:!document.hidden&&document.hasFocus()&&!graphicsLost,dead:player.hp<=0||recoveryPending,paused,abilityReady:classAbilityTime<=0&&player.energy>=SHIP_ABILITIES[player.shipId].energy,position:playerMesh.position,hp:player.hp,maxHp:player.maxHp,gold:player.gold,repairCost:Math.ceil(Math.max(0,player.maxHp-player.hp)*.3),robot:player.repairRobot,docked,landing,base:farmBase,sector:activeSector,level:player.level,routes:sectorPortalRoutes(),enemies,drops,safe:inSafeZone,center:currentSector(),radius:currentSector().radius,obstacles:farmObstacles,attacks:enemyShots.concat(titanProjectiles)},now/1000);
 if(!farmPilot.running)farmUI.refresh();
 if(command.recover){showRecovery();recoverShip(command.recoverCurrent)}
 if(command.repair)$('repairBtn').onclick();
 if(command.launch)leaveHangar();
 if(command.land)beginLanding();
 if(command.yaw!==undefined){yaw+=Math.atan2(Math.sin(command.yaw-yaw),Math.cos(command.yaw-yaw))*Math.min(1,dt*3);pitch+=(command.pitch-pitch)*Math.min(1,dt*3)}
 // Existing lock cone, projectile cadence and missiles still decide actual shots.
 if(command.ability&&!paused&&!docked&&!landing&&!inSafeZone(playerMesh.position))activateClassAbility();
 if(command.fire&&!paused&&!docked&&!landing&&!inSafeZone(playerMesh.position)){updateTargetLock();if(lockedEnemy===command.target){fire();skill()}}
 farmUiTick+=dt;if(farmUiTick>.5){farmUiTick=0;farmUI.refresh()}
 return command;
}
function loop(now){if(document.getElementById('worldLoading')){last=now;requestAnimationFrame(loop);return}const elapsed=Math.max(0,Math.min(1,(now-last)/1000)),dt=Math.min(elapsed,.04);last=now;
const autoInput=farmInput(dt,now);
if(player.hp>0&&player.hp/player.maxHp<=.25&&!docked&&!landing&&!recoveryPending&&panel.classList.contains('hidden')&&!document.body.classList.contains('journal-open'))combatAudio.play('lowLife');
const enginePower=Math.min(1,Math.hypot((autoInput?.throttle??joy.throttle)+(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),(autoInput?.strafe??joy.strafe??0)+(keys.d?1:0)-(keys.a?1:0)));
combatAudio.setEngine(enginePower,player.hp>0&&!recoveryPending&&!graphicsLost&&!docked&&!landing&&panel.classList.contains('hidden')&&!farmUI?.open&&!document.body.classList.contains('journal-open')&&!document.body.classList.contains('portrait-blocked')&&(!pvpSession||pvpSession.active&&!pvpHangar));
if(graphicsLost){requestAnimationFrame(loop);return}
graphics.sample(elapsed,!document.hidden&&!document.body.classList.contains('portrait-blocked')&&!document.body.classList.contains('inventory-open')&&!document.body.classList.contains('journal-open')&&!modelQueue.busy);
updateGraphicsDetail(now);
updateProAuras(THREE,enemies,now/1000);
if(pvpSession){pvpSession.beforeFrame(dt,now);if(pvpHangar){renderer.render(scene,camera);requestAnimationFrame(loop);return}if(!pvpSession.active){hud();renderer.render(scene,camera);requestAnimationFrame(loop);return}}if(document.body.classList.contains('journal-open')){renderer.render(scene,camera);requestAnimationFrame(loop);return}if(player.hp<=0||recoveryPending){showRecovery();hud();renderer.render(scene,camera);requestAnimationFrame(loop);return}if(tickBoosters(player,elapsed,PVP_MODE||document.hidden||docked||landing||!panel.classList.contains('hidden')||document.body.classList.contains('portrait-blocked'))){save();if(hangarUI)hangarUI.render(true)}
 updateBoosterStatus();fireCd=Math.max(0,fireCd-dt);skillCd=Math.max(0,skillCd-dt);updateClassAbility(dt);if(fireHeld&&!docked&&!landing&&panel.classList.contains('hidden'))fire();player.energy=Math.min(player.maxEnergy,player.energy+(docked?8:5)*dt*(shipRole(player.shipId)==='aurora'?1.2+specialLevel('energy')*.04:1));
const menuOpen=docked||landing||!panel.classList.contains('hidden')||!!document.activeElement?.matches('input,textarea,select')||!!farmUI?.open;const keyThrottle=menuOpen?0:(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),throttle=menuOpen?0:THREE.MathUtils.clamp((autoInput?.throttle??joy.throttle)+keyThrottle,-1,1);
if(!docked&&!landing&&keys.arrowleft){yaw+=1.6*dt;bankInput=.42}else if(!docked&&!landing&&keys.arrowright){yaw-=1.6*dt;bankInput=-.42}else if(lookId===null)bankInput=0;if(!docked&&!landing&&keys.r)pitch=Math.min(1.15,pitch+1.1*dt);if(!docked&&!landing&&keys.f)pitch=Math.max(-1.15,pitch-1.1*dt);
const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const strafe=menuOpen?0:THREE.MathUtils.clamp((autoInput?.strafe??joy.strafe)+(keys.d?1:0)-(keys.a?1:0),-1,1);const movementScale=Math.max(1,Math.hypot(throttle,strafe)),scrapMovement=scrapCombat.blocked()||pvpSession?.paralyzed?0:1;playerMesh.position.addScaledVector(forward,player.speed*equippedBonus().speed*throttle*dt*scrapMovement/movementScale);playerMesh.position.addScaledVector(right,player.speed*equippedBonus().speed*strafe*dt*scrapMovement/movementScale);advanceLanding(dt);if(pvpSession)pvpSession.input(menuOpen?[0,0,0]:forward.clone().multiplyScalar(throttle*scrapMovement/movementScale).addScaledVector(right,strafe*scrapMovement/movementScale).toArray(),[yaw,pitch],!menuOpen&&fireHeld,dt,now,player.speed);
if(pvpSession&&!docked&&!landing){const power=Math.min(1,Math.hypot(throttle,strafe)),step=correctionStep(pvpCorrection,player.speed*(power||1),dt);playerMesh.position.add(new THREE.Vector3(...step));pvpCorrection=pvpCorrection.map((v,i)=>v-step[i])}
// Vuelo libre en los tres ejes: el límite esférico del sector sustituye al antiguo techo/suelo.
updateSectorBoundary(dt);updateSectorPortal();
playerMesh.rotation.order='YXZ';playerMesh.rotation.y=yaw;playerMesh.rotation.x=pitch;const bankTarget=(bankInput-strafe*.16)*Math.min(1,.35+Math.abs(throttle)+Math.abs(strafe)*.65);playerMesh.rotation.z=THREE.MathUtils.lerp(playerMesh.rotation.z,bankTarget,1-Math.pow(.0008,dt));bankInput=THREE.MathUtils.lerp(bankInput,0,1-Math.pow(.02,dt));
const titanVisual=playerMesh.userData.titanModel,espectroVisual=playerMesh.userData.espectroModel;
const titanEnginesActive=player.shipId==='titan'&&!!titanVisual?.visible;
const espectroEnginesActive=player.shipId==='espectro'&&!!espectroVisual?.visible;
const assembledVisual=ASSEMBLED_SHIPS[player.shipId]?playerMesh.userData[player.shipId+'Model']:null;
const assembledEnginesActive=!!assembledVisual?.visible;
if(player.shipId==='adminpod')animateAdminPod(assembledVisual,now/1000,docked||landing?0:Math.hypot(throttle,strafe));
if(player.shipId==='obsidian')animateObsidian(assembledVisual,dt,docked||landing?0:Math.hypot(throttle,strafe));
const customEnginesActive=titanEnginesActive||espectroEnginesActive||assembledEnginesActive;
for(const glow of engineGlows)glow.visible=!customEnginesActive;
for(const l of engineLights){l.visible=!customEnginesActive&&graphics.profile.lights;l.intensity=18+Math.abs(throttle)*48}
for(const t of engineTrails){t.visible=!customEnginesActive;t.scale.y=.18+Math.abs(throttle)*1.35;t.scale.x=.75+Math.abs(throttle)*.18;t.scale.z=.75+Math.abs(throttle)*.18;t.material.opacity=.12+Math.abs(throttle)*.58}
for(const [visual,active] of [[titanVisual,titanEnginesActive],[espectroVisual,espectroEnginesActive],[assembledVisual,assembledEnginesActive]]){
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
for(const e of enemies){
 if(e.pvpRemote)continue;
 if(e.pro&&e.mesh.userData.proBadge)e.mesh.userData.proBadge.visible=true;
 if(e.dead){
  if(!e.titanAdd&&e.type!=='granTitan'&&!e.bossAdd&&e.type!=='carrier'&&now/1000>=e.dead){
   e.dead=0;e.maxHp=enemyMaxHp(e.type)*proMultiplier(e);e.hp=e.maxHp;e.aggressive=!e.pro&&e.type!=='devastator';
   e.home.copy(randomEnemyHome(e.type));e.mesh.position.copy(e.home);e.mesh.visible=enemyBelongsToSector(e,e.spawnRank);e.fireTimer=1+Math.random()*2;rejoinScrapPair(e);ensureAcechadorVisual(e);
  }
  continue;
 }
 if(e.bossAdd&&e.launchRemaining>0){advanceCarrierLaunch(e,dt);continue}
 if(!e.mesh.visible||e.type==='carrier'||e.type==='granTitan')continue;
 const t=TYPES[e.type],d=e.mesh.position.distanceTo(playerMesh.position);
 if(e.partner){
  // The launcher sets the squad's pace; the harpooner maintains its flank.
  const partnerAlive=!e.partner.dead&&e.partner.mesh.visible;
  if(e.type==='harpooner'&&partnerAlive){
   const target=e.partner.mesh.position.clone().add(new THREE.Vector3(150,0,0)),delta=target.sub(e.mesh.position),distance=delta.length();
   if(distance>1)e.mesh.position.addScaledVector(delta,Math.min(distance,t.speed*dt)/distance);
  }else if(d<COMBAT_RANGE&&!playerSafe&&!docked&&!landing&&d>800){
   e.mesh.position.addScaledVector(playerMesh.position.clone().sub(e.mesh.position).normalize(),Math.min(t.speed*dt,d-800));
  }
  if(d<COMBAT_RANGE&&!playerSafe&&!docked&&!landing){
   e.fireTimer-=dt;
   // Paired catapults and harpooners attack independently with separate cooldowns.
   if(e.fireTimer<=0&&d>80){enemyFire(e);e.fireTimer=e.type==='harpooner'?5:6}
  }
  e.mesh.lookAt(playerMesh.position);continue;
 }
 if(e.aggressive&&d<(e.type==='stalker'?1450:COMBAT_RANGE)&&!playerSafe&&!docked&&!landing){
  const dir=playerMesh.position.clone().sub(e.mesh.position).normalize();
  if(e.type==='stalker'){
    // Keep a sniper standoff beyond the player's 1200-unit weapon lock.
    if(d<1275)e.mesh.position.addScaledVector(dir,-Math.min(t.speed*dt,1325-d));
    else if(d>1375)e.mesh.position.addScaledVector(dir,Math.min(t.speed*dt,d-1350));
   }else if(d>800)e.mesh.position.addScaledVector(dir,Math.min(t.speed*dt,d-800));
  else if(d<65){registerExplorerThreat(e);applyPlayerDamage(Math.max(1,t.damage*proMultiplier(e)-player.defense*.25)*dt)}
  e.fireTimer-=dt;if(e.fireTimer<=0&&d>80){enemyFire(e);e.fireTimer=(e.type==='stalker'?3:e.type==='catapult'?6:e.type==='harpooner'?5:e.type==='scout'?2.8:e.type==='raider'?2.0:1.5)+Math.random()*.7}
 }
 if(e.bossAdd&&(d>=COMBAT_RANGE||playerSafe||docked||landing))patrolCarrierAdd(e,dt,now/1000);
 else e.mesh.lookAt(playerMesh.position);
}
updateEnemyShots(dt);scrapCombat.update(dt);
updateSupportDrones(dt,now);updateExplorer(dt,now);updateExplorerCombat(dt);updateCarrier(dt);updateGranTitan(dt);
 for(const p of shots){if(p.missile){
  p.missileAge=(p.missileAge||0)+dt;
  const aim=p.target&&!p.target.dead&&p.target.mesh.visible?p.target.mesh.position:p.missileAim;
  if(aim){const desired=aim.clone().sub(p.mesh.position).normalize().multiplyScalar(p.missileSpeed||650);
   const delay=p.missileGuideDelay||.55;
   p.vel.lerp(desired,Math.min(1,dt*(p.missileAge<delay?.12:3.7)))}
  p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.vel.clone().normalize());
 }p.mesh.position.addScaledVector(p.vel,dt);if(p.missile)updateMissileEffects(p,dt);else{p.travelled=(p.travelled||0)+p.vel.length()*dt;if(p.travelled>(p.range||COMBAT_RANGE))p.life=0}p.life-=dt;for(const e of enemies){if((!PVP_MODE||pvpSession?.canTarget(e.playerId))&&!p.pvpRemote&&!e.dead&&e.mesh.visible&&p.life>0&&(p.missile||playerMesh.position.distanceTo(e.mesh.position)<=(p.range||COMBAT_RANGE))&&(e.type==='granTitan'?titanHit(p.mesh.position):p.mesh.position.distanceTo(e.mesh.position)<(e.type==='carrier'?((carrierMesh.userData.hitRadius||205)*carrierMesh.scale.x):e.playerId==='pvp-super-boss'?180:(p.missile?44:30)))){p.life=0;damageEnemy(e,p.damage,!!p.missile)}}}for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0){removeMissileEffects(shots[i]);scene.remove(shots[i].mesh);shots.splice(i,1)}
if(player.hp<=0){showRecovery();hud();renderer.render(scene,camera);requestAnimationFrame(loop);return}
const back=forward.clone().multiplyScalar(-cameraZoom).add(new THREE.Vector3(0,cameraZoom*105/285,0));const desired=playerMesh.position.clone().add(back);camera.position.lerp(desired,1-Math.pow(.006,dt));camera.lookAt(playerMesh.position.clone().add(forward.clone().multiplyScalar(215)));if(!docked&&!landing)updateTargetLock();else lockFrame.classList.add('hidden');updateRepairRobot(dt,now/1000);updateExplorationMissions(dt);hud();renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();resizeGraphics()});
hud();

function openPvpHangar(){
 if(pvpHangar)return;
 pvpHangar={flightPlayer:player,board:missionBoard,ui:hangarUI,saved:null};
 player=createHangarEditor(readOfflinePilot(localStorage));if(pvpSession.adminShipAllowed)player.ownedShips.adminpod=true;normalizeHangar(player);
 missionBoard=createMissionBoard(missionCatalog,player.quests);docked=true;landing=false;resetDockControls();fireHeld=false;clearCombatShots();
 document.body.classList.add('docked');$('saleConfirm').classList.add('hidden');hangar.classList.remove('hidden');
 hangarUI=mountHangarUI({player,isDocked:()=>docked,isPvpBase:()=>PVP_MODE&&!!pvpHangar,isOffline:()=>!!pvpHangar,equip:equipFormation,equipShip:changeShip,log:logAction,changed:()=>{save();hud();renderInventory();hangarRefresh()}});
 hangarUI.show('home');hangarRefresh();
}
function closePvpHangar(){
 if(!pvpHangar||!save())return;
 combatAudio.play('takeoff');
 const adminSelection=player.shipId;const context=pvpHangar,updated=context.saved;Object.assign(context.flightPlayer,initialPvpPilot(updated));context.flightPlayer.maxHp*=20;context.flightPlayer.hp=context.flightPlayer.maxHp;player=context.flightPlayer;missionBoard=createMissionBoard(missionCatalog,player.quests=JSON.parse(JSON.stringify(updated.quests||{})));hangarUI=context.ui;pvpHangar=null;
 docked=landing=false;$('saleConfirm').classList.add('hidden');hangar.classList.add('hidden');document.body.classList.remove('docked');$('questTracker').classList.add('hidden');resetDockControls();
 loadAssembledVisual(player.shipId);syncPlayerShipVisuals();pvpSession.refreshLoadout(updated,adminSelection);hud();
}

if(PVP_MODE){
 for(const e of enemies)scene.remove(e.mesh);enemies.length=0;
 for(const drop of drops)scene.remove(drop.mesh);drops.length=0;
 const remotes=new Map();
 const arenaView=createArenaEnemyView({THREE,scene,camera,enemies,loader:new GLTFLoader(),onSelect:id=>pvpSession?.select(id),hidden:()=>!!pvpHangar||landing,makeMissile:createMissileMesh,targetPosition:id=>id===pvpSession?.myId?playerMesh.position:remotes.get(id)?.mesh.position,sound:(kind,point)=>combatAudio.play(kind,point)});
 const pvpSounds=createPvpSoundObserver((kind,point)=>combatAudio.play(kind,point));
 let respawnSoundTimer;
 const pvpDefeated=isMe=>{if(isMe){combatAudio.play('defeat');clearTimeout(respawnSoundTimer)}};
 const bossRoot=new THREE.Group();scene.add(bossRoot);bossRoot.visible=false;bossRoot.userData.hitRadius=180;
 const bossLabel=document.createElement('div');bossLabel.className='world-nameplate';bossLabel.hidden=true;bossLabel.innerHTML='<span>Titán del Nexo</span><small></small><div class="name-health"><i></i></div>';document.body.appendChild(bossLabel);
 const bossRemote={pvpRemote:true,playerId:'pvp-super-boss',type:'pilot',mesh:bossRoot,hp:0,maxHp:1000000,dead:1,aggressive:false,pilotName:'Titán del Nexo',pilotLevel:40};enemies.push(bossRemote);
 const bossRig=createNexoRig(THREE,bossRoot,scene);
 const bossLoader=new GLTFLoader();if(window.MUNDO_PLAY_MODE?.mode!=='test'){bossLoader.load(NEXO_VISUAL.body,g=>bossRig.mountBody(g.scene),undefined,error=>console.warn('Titán del Nexo: cuerpo no disponible',error));bossLoader.load(NEXO_VISUAL.arm,g=>bossRig.mountArm(g.scene),undefined,error=>console.warn('Titán del Nexo: cañones no disponibles',error))}
 bossLabel.setAttribute('role','button');bossLabel.tabIndex=0;bossLabel.onclick=()=>pvpSession?.select(bossRemote.playerId);bossLabel.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();bossLabel.click()},{passive:false});bossLabel.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();bossLabel.click()}};
 let bossInstance='',bossAttackSeq=0,bossTeleportSeq=0,bossFacing=0;const bossFlashes=[],bossGoal=new THREE.Vector3(0,120,-1800);
 function teleportFlash(pos){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0x88ddff,transparent:true,opacity:.6,wireframe:true,depthWrite:false}));mesh.position.set(...pos);scene.add(mesh);bossFlashes.push({mesh,life:.7})}
 function syncBoss(b,serverTime){
  if(!b){bossRoot.visible=false;bossLabel.hidden=true;bossRemote.dead=1;return}
  bossRemote.hp=b.hp;bossRemote.maxHp=b.maxHp;bossRemote.dead=b.hp>0?0:1;bossRoot.visible=b.hp>0;
  const fresh=bossInstance!==b.instanceId,jump=b.lastTeleport&&b.lastTeleport.seq>bossTeleportSeq;
  if(fresh){bossInstance=b.instanceId;bossAttackSeq=b.lastAttack?.seq||0;bossTeleportSeq=b.lastTeleport?.seq||0;bossRoot.position.set(...b.pos)}
  else if(jump){bossTeleportSeq=b.lastTeleport.seq;bossRoot.position.set(...b.pos);if(b.hp>0&&serverTime-b.lastTeleport.time<1500){teleportFlash(b.lastTeleport.from);teleportFlash(b.lastTeleport.to)}}
  else {const target=b.active?b.aimTargets?.[0]?.targetPos:null,dx=target?target[0]-b.pos[0]:b.pos[0]-bossGoal.x,dz=target?target[2]-b.pos[2]:b.pos[2]-bossGoal.z;if(Math.hypot(dx,dz)>.01)bossFacing=Math.atan2(-dx,-dz)}
  bossGoal.set(...b.pos);bossRig.assignTargets(b.aimTargets||[]);bossRig.setCharge((b.nextAttackAt-serverTime)/1000);
  bossLabel.querySelector('small').textContent=Math.ceil(b.hp).toLocaleString()+' / '+b.maxHp.toLocaleString()+' PV · Premio 1M';bossLabel.querySelector('i').style.width=(100*b.hp/b.maxHp)+'%';
  const attack=b.lastAttack;if(attack&&attack.seq>bossAttackSeq){bossAttackSeq=attack.seq;if(serverTime-attack.time<1500)bossRig.fire(attack.targets||[attack])}
 }
 function updateBossVisual(dt){
  bossRoot.position.lerp(bossGoal,1-Math.exp(-dt*12));bossRoot.rotation.y+=Math.atan2(Math.sin(bossFacing-bossRoot.rotation.y),Math.cos(bossFacing-bossRoot.rotation.y))*(1-Math.exp(-dt*5));bossRig.update(dt,performance.now()/1000);
  for(let i=bossFlashes.length-1;i>=0;i--){const f=bossFlashes[i];f.life-=dt;f.mesh.scale.setScalar(180+(1-f.life/.7)*220);f.mesh.material.opacity=Math.max(0,f.life/.7)*.6;if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();bossFlashes.splice(i,1)}}

  if(!bossRoot.visible){bossLabel.hidden=true;return}
  const point=bossRoot.position.clone().add(new THREE.Vector3(0,235,0)).project(camera),view=bossRoot.position.clone().sub(camera.position).dot(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));bossLabel.hidden=!!pvpHangar||landing||view<=0||point.z>1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1;bossLabel.style.left=((point.x+1)*50)+'%';bossLabel.style.top=((1-point.y)*50)+'%';
 }

 function cloneClean(source){const saved=[];source.traverse(o=>{saved.push([o,o.userData]);o.userData={}});let copy;try{copy=source.clone(true)}finally{for(const [o,data]of saved)o.userData=data}return copy}
 function syncRemoteVisual(r){const id=r.shipId;if(ASSEMBLED_SHIPS[id])loadAssembledVisual(id);const key=ASSEMBLED_SHIPS[id]?id+'Model':id==='titan'?'titanModel':id==='espectro'?'espectroModel':playerMesh.userData.xWingModel?'xWingModel':'auroraModel';const source=playerMesh.userData[key]||proceduralShip;if(source===r.source)return;r.source=source;r.mesh.clear();const copy=cloneClean(source);copy.visible=true;r.mesh.add(copy);}

 let returnPortal=null,returnModelReady=false;
 function mountReturnPortal(){
  if(returnPortal){scene.remove(returnPortal);returnPortal.getObjectByName('stoneDestinationLabel')?.material.map?.dispose();returnPortal.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.userData?.portalEnergy)m.dispose()})}
  returnPortal=clonePortalVisual();returnModelReady=!!portalMesh.userData.portalModel;returnPortal.position.set(0,120,850);returnPortal.rotation.y=Math.PI;returnPortal.getObjectByName('stoneDestinationLabel').userData.drawDestination(readOfflinePilot(localStorage).sector||'graveyard');returnPortal.getObjectByName('portalCharge').visible=false;scene.add(returnPortal);
 }
 mountReturnPortal();
 function keepArena(){if(!returnModelReady&&portalMesh.userData.portalModel)mountReturnPortal();graveyard.station.visible=graveyard.environment.visible=false;for(const light of emberSectorLights)light.visible=false;beltStation.visible=emberStation.visible=carrierMesh.visible=false;auroraStation.visible=true;auroraStation.position.set(0,-180,0);auroraStation.scale.setScalar(.65);auroraPlanetPivot.visible=emberMoonPivot.visible=emberMoonLight.visible=emberMoonFill.visible=false;portalMesh.visible=secondaryPortal.visible=false;portalMessage.style.display=sectorNotice.style.display='none';asteroidField.visible=false;}
 function clearFight(){resetDockControls();clearCombatShots();lockedEnemy=null;fireCd=skillCd=classAbilityTime=0;}
 docked=landing=false;hangar.classList.add('hidden');playerMesh.position.set(0,120,0);yaw=0;pitch=0;camera.position.set(0,225,285);camera.lookAt(0,120,-215);
 for(const id of ['characterBtn','questToggle','questTracker','pvpBtn','dockBtn','interactBtn','characterPanel','formationBtn'])$(id).classList.add('hidden');
 mountPvpZones(THREE,scene);$('hint').textContent='Base · Zona PvE hasta 1.800 m · Zona hostil hasta 2.950 m';$('stationDistance').textContent='Mapa PvP';
 pvpSession=startSharedSession({keepArena,repeatMissiles:()=>{if(pvpSession?.canFight){skillCd=0;skill()}},canLand:()=>!landing&&!docked&&selectLandingPlatform(),requestLanding:()=>pvpSession?.requestHangar(),openHangar:beginLanding,isHangarOpen:()=>!!pvpHangar||landing,pause:()=>{clearFight();pvpSounds.reset();clearTimeout(respawnSoundTimer)},clearFight,targetId:()=>lockedEnemy?.playerId,nearPortal:()=>playerMesh.position.distanceTo(returnPortal.position)<=100,
 frame(dt){
  updateBossVisual(dt);arenaView.update(dt);
  for(const shot of shots){if(!shot.pvpRemote&&pvpSession?.active&&!pvpSession.canFight)shot.life=0;if(shot.target?.playerId&&(pvpSession?.isJammed(shot.target.playerId)||(shot.target.playerId===pvpSession?.myId?!pvpSession?.canFight:!pvpSession?.canTarget(shot.target.playerId))))shot.target=null;}
  for(const r of remotes.values()){
   r.mesh.position.lerp(r.goal,1-Math.exp(-dt*12));syncRemoteVisual(r);if(r.shipId==='adminpod')animateAdminPod(r.mesh,performance.now()/1000,r.inHangar?0:Math.min(1,r.mesh.position.distanceTo(r.goal)/30));if(r.shipId==='obsidian')animateObsidian(r.mesh,dt,r.inHangar?0:Math.min(1,r.mesh.position.distanceTo(r.goal)/30));r.pet.visible=!!r.hasPet;if(r.hasPet){if(r.petStamp!==explorerMesh.children.length){r.pet.clear();const clone=cloneClean(explorerMesh);clone.visible=true;clone.position.set(-70,30,80);r.pet.add(clone);r.petStamp=explorerMesh.children.length}r.pet.position.copy(r.mesh.position);r.pet.rotation.copy(r.mesh.rotation)}r.drones.position.copy(r.mesh.position);r.drones.rotation.copy(r.mesh.rotation);for(let i=0;i<r.drones.children.length;i++){const [x,y,z]=formationOffset(r.formation||'fan',i,r.drones.children.length,performance.now()/1000);r.drones.children[i].position.set(x,z,-y)}
   const point=r.mesh.position.clone().add(new THREE.Vector3(0,68,0)).project(camera),view=r.mesh.position.clone().sub(camera.position).dot(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));r.label.hidden=view<=0||point.z>1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1;
   r.label.style.left=((point.x+1)*50)+'%';r.label.style.top=((1-point.y)*50)+'%';r.label.classList.toggle('dueling',!!pvpSession?.canTarget(r.playerId));r.label.classList.toggle('jammed',!!pvpSession?.isJammed(r.playerId));
  }
  updatePortalEmission(returnPortal,1.3+Math.sin(performance.now()*.002)*.2);
 },
 destroyed:pvpDefeated,
 confirmPvpTransfer(){finishPvpTransfer(localStorage,SAVE_KEY,false)},
 cancelPvpTransfer(){finishPvpTransfer(localStorage,SAVE_KEY,true)},
 markDeath(death){finishPvpTransfer(localStorage,SAVE_KEY,true);const pilot=readOfflinePilot(localStorage);if(pilot.pendingPvpDeath?.id===death.id)return;pilot.pendingPvpDeath=death;pilot.hp=0;localStorage.setItem(SAVE_KEY,JSON.stringify(pilot));},
 settleRespawn(bill){const pilot=settleRespawn(localStorage,SAVE_KEY,bill);player.gold=pilot.gold;hud();return pilot},
 respawnReady(bill){combatAudio.play('respawn');if(bill.destination==='aurora')location.href='index.html';},
 snapshot(me,others,force,pending,state){
  pvpSounds.update([me,...others],state.serverTime);
  syncBoss(state.enemies?.length?null:state.boss,state.serverTime);arenaView.sync(state.enemies||[],state.serverTime,state.players);
  if(pvpHangar||landing)return;
  const changed=player.shipId!==me.profile.shipId;
  if(changed){player.shipId=me.profile.shipId;loadAssembledVisual(player.shipId);syncPlayerShipVisuals();clearFight()}
  const wasHit=me.hp<player.hp;if(wasHit){combatAudio.play(me.hp<=0?'explosion':(me.skillUntil?.instantShield||0)>state.serverTime?'shieldHit':'impact');lastHitAt=lastIncomingAttackAt=performance.now()/1000;const npcThreat=arenaView.entities.get(me.lastDamagedBy)||(me.lastDamagedBy===bossRemote.playerId?bossRemote:null);if(npcThreat)registerExplorerThreat(npcThreat);}
  player.livePvpRank=me.pvpRank;player.name=me.name;player.level=me.profile.level;player.droneCount=me.profile.droneCount;player.droneFormation=me.profile.droneFormation;refreshFormationButton();for(const key of ['maxHp','maxEnergy','attack','defense','speed'])player[key]=me.profile[key];player.hp=me.hp;player.energy=me.energy;classAbilityTime=Math.max(0,((me.abilityUntil||0)-state.serverTime)/1000);
  const predicted=new THREE.Vector3(...me.pos).add(new THREE.Vector3(...pending.offset));
  if(force){pvpCorrection=[0,0,0];playerMesh.position.set(...me.pos);clearFight();classAbilityTime=Math.max(0,((me.abilityUntil||0)-state.serverTime)/1000);yaw=me.aim?.[0]||0;pitch=me.aim?.[1]||0;camera.position.copy(playerMesh.position).add(new THREE.Vector3(Math.sin(yaw)*285,105,Math.cos(yaw)*285));}
  else if(pending.fresh)pvpCorrection=predicted.sub(playerMesh.position).toArray();
  const ids=new Set(others.map(p=>p.id));for(const [id,r]of remotes)if(!ids.has(id)){scene.remove(r.mesh,r.drones,r.pet);r.label.remove();enemies.splice(enemies.indexOf(r),1);remotes.delete(id)}
  for(const other of others){let r=remotes.get(other.id);if(!r){const mesh=new THREE.Group(),drones=new THREE.Group(),pet=new THREE.Group(),label=document.createElement('div');label.className='world-nameplate';label.innerHTML='<span></span><small></small><div class="name-health"><i></i></div>';document.body.appendChild(label);scene.add(mesh,drones,pet);label.setAttribute('role','button');label.tabIndex=0;label.onclick=()=>pvpSession.select(other.id);label.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();pvpSession.select(other.id)},{passive:false});label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pvpSession.select(other.id)}};r={pvpRemote:true,playerId:other.id,type:'pilot',mesh,drones,pet,label,home:new THREE.Vector3(),goal:new THREE.Vector3(...other.pos),hp:1,maxHp:1,dead:0,aggressive:false,pilotName:'Invitado',pilotLevel:other.profile.level};mesh.position.copy(r.goal);remotes.set(other.id,r);enemies.push(r);
    for(let i=0;i<other.profile.droneCount;i++){const d=cloneClean(supportDrones[i].mesh);d.visible=true;d.position.set((i%2?1:-1)*[78,135,195,250][Math.floor(i/2)],14,125+Math.floor(i/2)*40);d.rotation.set(0,0,0);drones.add(d)}
   }
   if(r.drones.children.length!==other.profile.droneCount||r.droneStamp!==supportDrones[0]?.mesh.children.length){r.drones.clear();for(let i=0;i<other.profile.droneCount;i++){const d=cloneClean(supportDrones[i].mesh);d.visible=true;d.position.set((i%2?1:-1)*78,14,125);r.drones.add(d)}r.droneStamp=supportDrones[0]?.mesh.children.length}
   r.inHangar=other.hangar;r.hasPet=other.profile.explorerDrone;r.formation=other.profile.droneFormation;r.hp=other.hp;r.maxHp=other.profile.maxHp;r.shipId=other.profile.shipId;r.pilotName=other.name;r.pilotLevel=other.profile.level;r.goal.set(...other.pos);if(r.mesh.position.distanceTo(r.goal)>600)r.mesh.position.copy(r.goal);r.mesh.visible=true;if(other.aim){r.mesh.rotation.order='YXZ';r.mesh.rotation.set(other.aim[1],other.aim[0],0)}

   if(wasHit&&other.id===me.lastDamagedBy)registerExplorerThreat(r);
   rankedName(r.label.querySelector('span'),other.name+' #'+other.id.slice(-6),other.pvpRank);r.label.querySelector('small').textContent=SHIP_TYPES[other.profile.shipId].name+(other.hangar?' · En hangar':other.protected?' · Protegido':' · PvP')+Object.entries(other.skillUntil||{}).filter(([,until])=>until>state.serverTime).map(([id])=>' · '+(state.rules.skills?.[id]?.name||'')).join('');r.label.querySelector('i').style.width=(100*other.hp/r.maxHp)+'%';syncRemoteVisual(r);
  }
 },
 bossRewards(receipts){
  const latest=readOfflinePilot(localStorage),source=pvpHangar?player:latest;
  const result=saveBossReceipts(localStorage,SAVE_KEY,source,receipts,p=>pvpHangar?serializeHangarEditor(p,latest):p);
  if(result.ids.length){player.quests=result.pilot.quests||{};missionBoard=createMissionBoard(missionCatalog,player.quests);renderMission();for(const m of result.missions){combatAudio.play('mission');lootToast('🏆 '+m.title+' · +'+m.reward.toLocaleString('es')+' créditos · +'+m.xp+' XP')}player.gold=result.pilot.gold;player.pvpBossReceipts=result.pilot.pvpBossReceipts;player.xp=result.pilot.xp;if(pvpHangar)Object.assign(player,result.pilot);if(result.pilot.loot)player.loot=result.pilot.loot;if(pvpHangar){pvpHangar.saved=serializeHangarEditor(result.pilot,latest);hangarRefresh()}hud()}
  return result;
 },
 remoteShots(bullets){for(const b of bullets){
  combatAudio.play(b.missile?'missile':'enemyLaser',{x:b.pos[0],y:b.pos[1],z:b.pos[2]});
  const mesh=b.missile?createMissileMesh():new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,48,7),new THREE.MeshBasicMaterial({color:0xff7777,transparent:true,opacity:.95,depthWrite:false}));mesh.position.set(...b.pos);const vel=new THREE.Vector3(...b.vel);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vel.clone().normalize());scene.add(mesh);
  const target=b.target===pvpSession?.myId?{mesh:playerMesh,dead:false,playerId:pvpSession?.myId}:b.target===bossRemote.playerId&&bossRoot.visible?bossRemote:arenaView.entities.get(b.target)||remotes.get(b.target);
  const shot={pvpRemote:true,pvpSent:true,mesh,vel,life:b.life,damage:0,missile:b.missile,missileSpeed:b.speed,missileGuideDelay:b.delay,missileAge:b.age,target,missileAim:null};if(b.missile)shot.missileEffects=addMissileEffects(mesh);shots.push(shot);
 }},
 });
 // Se puede tocar una nave en ambos lados de la pantalla, sin capturar el joystick.
 const taps=new Map(),picker=new THREE.Raycaster();
 const ui='button,input,select,textarea,a,#worldPanel,#worldTarget,#worldInvite,#pvpSkills,.world-nameplate,#joystick,#hud,#radarWidget,#zoomControls,#combatControls,#hangarPanel';
 document.addEventListener('pointerdown',e=>{if(e.target.closest?.(ui))return;taps.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false})},true);
 document.addEventListener('pointermove',e=>{const t=taps.get(e.pointerId);if(t&&Math.hypot(e.clientX-t.x,e.clientY-t.y)>15)t.moved=true},true);
 document.addEventListener('pointercancel',e=>taps.delete(e.pointerId),true);
 document.addEventListener('pointerup',e=>{
  const tap=taps.get(e.pointerId);taps.delete(e.pointerId);if(!tap||tap.moved||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>15)return;
  picker.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
  let selected=null,best=65,near=Infinity;
  for(const r of [...remotes.values(),bossRemote,...arenaView.entities.values()]){
   if(r.dead)continue;const hit=picker.intersectObject(r.mesh,true)[0];if(hit&&hit.distance<near){near=hit.distance;selected=r.playerId}
  }
  if(!selected)for(const r of [...remotes.values(),bossRemote,...arenaView.entities.values()]){
   if(r.dead)continue;const p=r.mesh.position.clone().project(camera),view=r.mesh.position.clone().sub(camera.position).dot(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));if(p.z>1||view<=0)continue;
   const d=Math.hypot((p.x+1)*innerWidth/2-e.clientX,(1-p.y)*innerHeight/2-e.clientY);if(d<best){best=d;selected=r.playerId}
  }
  if(selected)pvpSession.select(selected);else pvpSession.clearSelection();
 },true);
 keepArena();
}

// Keep the initial scene covered until the first wave of models is ready.
// A bounded fallback prevents a broken GLB or slow connection from trapping the player.
window.cosmosModelsReady=new Promise(resolve=>{
 const started=performance.now();
 let quietSince=0,slowPrompt=false;
 const poll=()=>{
  const selected=({adminpod:'adminpodModel',titan:'titanModel',espectro:'espectroModel',segadora:'segadoraModel',bastion:'bastionModel',centella:'centellaModel',obsidian:'obsidianModel',azote:'azoteModel',egida:'egidaModel',vertigo:'vertigoModel'})[player.shipId];
  const playerReady=selected
   ?!!(playerMesh.userData[selected]||playerMesh.userData[selected+'Failed'])
   :!!(playerMesh.userData.xWingModel||playerMesh.userData.auroraModel||playerMesh.userData.auroraModelFailed);
  const quiet=playerReady&&!modelQueue.busy&&!window.cosmosAssetsLoading;
  if(quiet){if(!quietSince)quietSince=performance.now()}else quietSince=0;
  const elapsed=performance.now()-started;
  if(quietSince&&performance.now()-quietSince>=600){
   resolve();return;
  }
  if(elapsed>=30000&&!slowPrompt&&window.cosmosLoadingSlow){slowPrompt=true;void window.cosmosLoadingSlow().then(proceed=>{if(proceed)resolve();else setTimeout(()=>{slowPrompt=false},30000)}).catch(()=>{slowPrompt=false})}
  setTimeout(poll,120);
 };
 setTimeout(poll,120);
});

