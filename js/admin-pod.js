// Flight frame: forward -Z. Anchors measured from the supplied Hoverpod mesh.
export const ADMIN_POD_ANCHORS=Object.freeze({engine:[0,-8,55.5],steam:[0,41.5,17.2]});
export async function loadAdminPod(T,loader){
 const source=(await loader.loadAsync('./assets/models/admin-hoverpod.glb?v=337')).scene;
 const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),scale=124/Math.max(size.x,size.z);
 const pivot=new T.Group();source.position.sub(center);pivot.add(source);pivot.scale.setScalar(scale);pivot.rotation.y=Math.PI;
 source.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;m.metalness=.12;m.roughness=.9;m.needsUpdate=true}});
 const root=new T.Group();root.add(pivot);root.scale.setScalar(.75);
 const nozzle=new T.Group();nozzle.position.set(...ADMIN_POD_ANCHORS.engine);root.add(nozzle);
 const flame=new T.Mesh(new T.ConeGeometry(5.5,30,12,1,true).translate(0,15,0),new T.MeshBasicMaterial({color:0xffaf45,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));flame.rotation.x=Math.PI/2;flame.name='adminPodFlame';nozzle.add(flame);
 // Shared geometry and bounded count: no new meshes/textures during animation.
 const pixels=new Uint8Array(64*64*4);
 // Rounded overlapping lobes give each burst a cartoon cloud silhouette.
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const i=(y*64+x)*4;let alpha=0;
  for(const [cx,cy,r]of [[25,29,16],[39,31,15],[32,20,14],[32,40,14],[17,36,10]]){
   const d=Math.hypot(x-cx,y-cy)/r;alpha=Math.max(alpha,Math.min(1,Math.max(0,(1-d)*7)));
  }
  pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*alpha);
 }
 const steamTexture=new T.DataTexture(pixels,64,64);steamTexture.needsUpdate=true;
 for(let i=0;i<8;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:steamTexture,color:0xe1eff3,transparent:true,opacity:0,depthWrite:false}));puff.name='adminPodSteam'+i;puff.visible=false;root.add(puff)}
 return root;
}
const steamStates=new WeakMap();
export function animateAdminPod(root,time,power=0){
 if(!root)return;
 root.updateWorldMatrix(true,true);
 root.traverse(o=>{
  if(o.name==='adminPodFlame'){o.visible=power>.02;o.scale.set(1,.3+Math.min(1,power)*(1+.1*Math.sin(time*24)),1)}
  if(o.name!=='adminPodSteam0')return;
  const emitter=o.parent;
  let state=steamStates.get(emitter);
  if(!state){
   const puffs=emitter.children.filter(p=>p.name.startsWith('adminPodSteam'));
   // Remote ships clone their visuals, so give every particle its own material.
   for(const p of puffs)p.material=p.material.clone();
   state={puffs,particles:[],next:time,index:0,last:time};steamStates.set(emitter,state);
  }
  if(time-state.last>.5||time<state.last){state.particles=[];state.next=time;for(const p of state.puffs)p.visible=false}
  state.last=time;
  if(time>=state.next){
   const puff=state.puffs[state.index++%state.puffs.length];
   const world=emitter.localToWorld(puff.position.clone().set(...ADMIN_POD_ANCHORS.steam));
   state.particles=state.particles.filter(p=>p.puff!==puff);
   state.particles.push({puff,world,born:time});state.next=time+(power>.02?.34:.75);
  }
  state.particles=state.particles.filter(p=>{
   const age=time-p.born,t=age/1.65;if(t>=1){p.puff.visible=false;return false}
   // Store emission in world space so the cloud stays behind when the ship turns.
   const world=p.world.clone();world.y+=age*13;
   p.puff.position.copy(emitter.worldToLocal(world));p.puff.visible=true;
   p.puff.scale.setScalar(9+15*t);p.puff.material.opacity=.68*Math.min(1,age/.1)*Math.pow(1-t,1.3);
   return true;
  });
 });
}
