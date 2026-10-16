// Vista 3D bajo demanda: un único modelo activo, sin afectar al motor de combate.
let active=null;
export function stopAssemblyPreview(){if(active){active();active=null}}
export async function startAssemblyPreview(container,id){
 stopAssemblyPreview();
 if(!container||id!=='segadora')return;
 let cancelled=false,raf=0,renderer=null,resizeObserver=null,model=null;
 const cleanup=()=>{cancelled=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}if(model){model.traverse(o=>{if(o.geometry)o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose?.()}})}};
 active=cleanup;
 try{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  if(cancelled)return;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
  scene.add(new THREE.HemisphereLight(0xd7edff,0x334055,2.5));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(4,7,6);scene.add(light);
  const fill=new THREE.DirectionalLight(0xff6677,1.4);fill.position.set(-5,2,-3);scene.add(fill);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y';
  container.replaceChildren(renderer.domElement);
  const gltf=await new GLTFLoader().loadAsync('./assets/models/segadora.glb?v=240');
  if(cancelled){renderer.dispose();renderer.domElement.remove();return}
  model=gltf.scene;
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  model.position.sub(center);model.scale.setScalar(3/Math.max(size.x,size.y,size.z));
  // Igual orientación correctiva que en el combate.
  model.rotation.y=-Math.PI/2;
  scene.add(model);camera.position.set(0,2.2,7.5);camera.lookAt(0,0,0);
  let dragging=false,lastX=0,auto=true,lastTime=0;
  renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;auto=false;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragging){model.rotation.y+=(e.clientX-lastX)*.012;lastX=e.clientX}});
  renderer.domElement.addEventListener('pointerup',()=>{dragging=false;auto=true});
  renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;auto=true});
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
  function frame(t){if(cancelled||!container.isConnected)return;if(!document.hidden&&container.getClientRects().length){if(auto&&lastTime)model.rotation.y+=Math.min((t-lastTime)/1000,.05)*.3;renderer.render(scene,camera)}lastTime=t;raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame);
 }catch(err){if(!cancelled){console.warn('Vista 3D no disponible; se muestra la imagen de respaldo.',err);cleanup();container.innerHTML='<img class="formation-preview ship-preview" src="./assets/ship-previews/segadora.webp?v=212" alt="Segadora" style="width:100%;height:100%;object-fit:contain">';active=null}}
}
