import * as THREE from 'three';
import {fitPreviewCamera} from './preview-framing.js?v=506';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {loadObsidian,animateObsidian} from './obsidian-rig.js?v=308';
import {applyObsidianSkin,animatePreviewCore} from './obsidian-design-skin.js?v=517';
import {fitPreviewModel} from './ship-preview-catalog.js?v=355';
const $=id=>document.getElementById(id),host=$('viewer'),status=$('status');
let model,turntable,auto=true,last=0,renderer,shaderFailed=false,zoomFactor=1.35;
try{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
 const view=rear=>{camera.position.set(2.6,1.8,rear?3.8:-3.8);camera.lookAt(0,0,0);if(turntable)turntable.rotation.y=0};
 view(false);scene.add(new THREE.HemisphereLight(0xe5f2ff,0x34435c,2.8));
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,-4);scene.add(key);
 const fill=new THREE.DirectionalLight(0x9fcfff,1.8);fill.position.set(-4,2,3);scene.add(fill);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.setClearColor(0x0a1426);host.append(renderer.domElement);
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{shaderFailed=true;status.textContent='No se pudo mostrar la pintura. Prueba la vista original.';console.error(gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment));};
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.zoom=Math.min(1.15,camera.aspect*1.35);camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
 addEventListener('resize',resize);resize();
 model=await loadObsidian(THREE,new GLTFLoader());
 // Smoother sphere in this preview; the actual game model is untouched.
 model.children.filter(o=>o.isMesh&&o.geometry?.type==='SphereGeometry').forEach(o=>{o.geometry.dispose();o.geometry=new THREE.SphereGeometry(8,48,32)});
 // A soft halo is isolated to this comparison view and respects scene depth.
 const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
 const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,0.55)');gradient.addColorStop(.38,'rgba(255,255,255,0.26)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55,toneMapped:false}));
 glow.position.set(0,3,14);glow.scale.set(28,28,1);model.add(glow);
 turntable=fitPreviewModel(THREE,model,'obsidian');scene.add(turntable);
 const paint=id=>{shaderFailed=false;applyObsidianSkin(THREE,model,id);glow.visible=id==='chile'||id==='mexico';glow.material.color.set(id==='mexico'?0x39ff85:0x50bfff);for(const name of ['original','chile','mexico'])$(name).setAttribute('aria-pressed',String(name===id));renderer.compile(scene,camera);if(!shaderFailed)status.textContent=id==='mexico'?'Prueba 517 · México: verde oscuro y escudo.':id==='chile'?'Diseño Chile · Misma geometría.':'Diseño original · Misma geometría.';};
 $('original').onclick=()=>paint('original');$('chile').onclick=()=>paint('chile');$('mexico').onclick=()=>paint('mexico');
 const stopRotation=()=>{auto=false;$('spin').setAttribute('aria-pressed','false')};
 $('front').onclick=()=>{stopRotation();view(false)};$('rear').onclick=()=>{stopRotation();view(true)};
 $('zoomIn').onclick=()=>{zoomFactor=Math.min(2.3,zoomFactor*1.2)};
 $('zoomOut').onclick=()=>{zoomFactor=Math.max(.65,zoomFactor/1.2)};
 $('zoomReset').onclick=()=>{zoomFactor=1.35};
 $('spin').onclick=()=>{auto=!auto;$('spin').setAttribute('aria-pressed',String(auto))};
 let dragging=false,x=0;
 renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;x=e.clientX;stopRotation();renderer.domElement.setPointerCapture(e.pointerId)});
 renderer.domElement.addEventListener('pointermove',e=>{if(dragging){turntable.rotation.y+=(e.clientX-x)*.012;x=e.clientX}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{dragging=false});
 paint('mexico');
 function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!document.hidden){if(auto)turntable.rotation.y+=dt*.22;animateObsidian(model,dt,0);animatePreviewCore(model,now*.001);fitPreviewCamera(THREE,camera,turntable);camera.zoom*=zoomFactor;camera.updateProjectionMatrix();renderer.render(scene,camera)}requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
}catch(error){status.textContent='No se pudo cargar la vista 3D. Recarga la página para reintentar.';console.error(error)}
