import {SHIP_PREVIEWS,shipThumbnail,disposePreviewModel,fitPreviewModel} from './ship-preview-catalog.js?v=252';
// Only one independent, demand-loaded WebGL preview is alive across the hangar.
let active=null;
export function stopAssemblyPreview(){active?.cleanup();active=null}
export async function startAssemblyPreview(container,id){
 if(!container||!SHIP_PREVIEWS[id]){stopAssemblyPreview();return}
 if(active?.id===id){active.mount(container);return}
 stopAssemblyPreview();
 let host=container,cancelled=false,raf=0,renderer=null,observer=null,model=null,lastTime=0,lastRender=0,dragging=false,lastX=0;
 const fallback=()=>{if(!cancelled&&host.isConnected)host.innerHTML=shipThumbnail(id)};
 const resize=()=>{if(!renderer||!camera)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.position.set(2.6,2.1,-3.3).multiplyScalar(1/Math.min(1,camera.aspect));camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
 const cleanup=()=>{if(cancelled)return;cancelled=true;cancelAnimationFrame(raf);observer?.disconnect();disposePreviewModel(model);model=null;if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=null}};
 let camera=null;
 const session={id,cleanup,mount(next){observer?.disconnect();host=next;if(renderer&&model)host.replaceChildren(renderer.domElement);else host.innerHTML=shipThumbnail(id);observer?.observe(host);resize()}};
 active=session;host.innerHTML=shipThumbnail(id);
 try{
  const THREE=await import('three');
  const {GLTFLoader}=await import((window.THREE_CDN||'https://cdn.jsdelivr.net/npm/three@0.180.0')+'/examples/jsm/loaders/GLTFLoader.js');
  if(cancelled)return;
  const scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,4/3,.1,100);camera.position.set(2.6,2.1,-3.3);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xe5f2ff,0x34435c,2.8));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,-4);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9fcfff,1.8);fill.position.set(-4,2,3);scene.add(fill);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y';
  const gltf=await new GLTFLoader().loadAsync('./assets/models/'+SHIP_PREVIEWS[id].model+'?v=252');
  if(cancelled){disposePreviewModel(gltf.scene);return}
  model=gltf.scene;const turntable=fitPreviewModel(THREE,model,id);scene.add(turntable);host.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Modelo 3D de '+SHIP_PREVIEWS[id].name+'. Arrastra para girar.');
  renderer.domElement.addEventListener('webglcontextlost',e=>{if(cancelled)return;e.preventDefault();if(active===session)stopAssemblyPreview();if(host.isConnected)host.innerHTML=shipThumbnail(id)});
  renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragging){turntable.rotation.y+=(e.clientX-lastX)*.012;lastX=e.clientX}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{dragging=false});
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  function frame(t){
   if(cancelled)return;
   if(!host.isConnected||host.closest('#hangarPanel')?.classList.contains('hidden')){if(active===session)stopAssemblyPreview();return}
   if(!document.hidden&&host.getClientRects().length&&t-lastRender>=1000/30){if(!dragging&&lastTime)turntable.rotation.y+=Math.min((t-lastTime)/1000,.05)*.3;renderer.render(scene,camera);lastTime=t;lastRender=t}else if(document.hidden)lastTime=0;
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
 }catch(error){if(!cancelled){console.warn('Vista 3D no disponible; se conserva la miniatura.',error);fallback();if(active===session)stopAssemblyPreview();else cleanup()}}
}
