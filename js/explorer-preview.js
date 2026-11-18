import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {applyExplorerDesign} from './explorer-design.js?v=1';
const $=id=>document.getElementById(id),host=$('viewer'),status=$('status');
try{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,100);
 camera.position.set(0,1.1,4.6);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xe5f7ff,0x293147,2.6));
 const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(4,6,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa0d8ff,1.2);fill.position.set(-4,2,-3);scene.add(fill);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0x0a1426);host.append(renderer.domElement);
 let shaderFailed=false;renderer.debug.onShaderError=()=>{shaderFailed=true;status.textContent='No se pudo mostrar la pintura. Prueba la vista original.'};
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}addEventListener('resize',resize);resize();
 const gltf=await new GLTFLoader().loadAsync('./assets/models/scifidrone.glb?v=105'),model=gltf.scene;
 model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),longest=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(longest)||longest<=0)throw Error('invalid model');
 model.scale.setScalar(2.3/longest);model.position.copy(center).multiplyScalar(-2.3/longest);
 model.traverse(part=>{if(!part.isMesh)return;part.frustumCulled=false;const array=Array.isArray(part.material),mats=array?part.material:[part.material];part.material=(array?mats.map(tint):tint(mats[0]));});
 function tint(material){if(!material)return material;const tinted=material.clone();if(tinted.color){const c=tinted.color,lum=c.r*.2126+c.g*.7152+c.b*.0722;if(lum>.15&&lum<.78)c.lerp(new THREE.Color(0x7cb8e8),.17)}if('emissive'in tinted){tinted.emissive=new THREE.Color(0x123f8e);tinted.emissiveIntensity=.18}if('roughness'in tinted){tinted.roughness=.85;tinted.roughnessMap=null}if('metalness'in tinted){tinted.metalness=.08;tinted.metalnessMap=null}tinted.side=THREE.DoubleSide;tinted.transparent=false;tinted.opacity=1;tinted.depthWrite=true;return tinted}
 const turntable=new THREE.Group();turntable.add(model);scene.add(turntable);
 let auto=true,last=0,zoom=1;
 function paint(id){shaderFailed=false;applyExplorerDesign(THREE,model,id);for(const name of ['original','obsidian'])$(name).setAttribute('aria-pressed',String(name===id));renderer.compile(scene,camera);if(!shaderFailed)status.textContent=id==='obsidian'?'Pintura Obsidian · Vista de prueba':'Dron original · Vista de prueba'}
 $('original').onclick=()=>paint('original');$('obsidian').onclick=()=>paint('obsidian');
 $('spin').onclick=()=>{auto=!auto;$('spin').setAttribute('aria-pressed',String(auto))};
 $('zoomIn').onclick=()=>{zoom=Math.min(2.5,zoom*1.2)};$('zoomOut').onclick=()=>{zoom=Math.max(.6,zoom/1.2)};$('reset').onclick=()=>{zoom=1;turntable.rotation.set(0,0,0)};
 let dragging=false,x=0,y=0;renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;x=e.clientX;y=e.clientY;auto=false;$('spin').setAttribute('aria-pressed','false');renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;turntable.rotation.y+=(e.clientX-x)*.012;turntable.rotation.x=Math.max(-1.3,Math.min(1.3,turntable.rotation.x+(e.clientY-y)*.012));x=e.clientX;y=e.clientY});for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{dragging=false});
 paint('obsidian');function frame(now){let dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!document.hidden){if(auto)turntable.rotation.y+=dt*.22;camera.zoom=zoom*.78*Math.min(1,camera.aspect);camera.updateProjectionMatrix();renderer.render(scene,camera)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
}catch(error){status.textContent='No se pudo cargar la vista 3D. Comprueba tu conexión y vuelve a abrir la página.';console.error(error)}
