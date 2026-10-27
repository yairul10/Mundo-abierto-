import {attachAssembledEngines} from './assembled-engines.js?v=305';
// Narrow the band toward its outside radius; keep the opening larger without
// shrinking the hoop. Work in the fitted hoop frame, preserving imported transforms/UVs.
export function slimObsidianRing(THREE,ring){
 ring.updateMatrixWorld(true);
 const points=[],v=new THREE.Vector3();let outside=0;
 ring.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.geometry=mesh.geometry.clone();
  const position=mesh.geometry.attributes.position,world=mesh.matrixWorld.clone(),inverse=world.clone().invert();
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i).applyMatrix4(world);outside=Math.max(outside,Math.hypot(v.x,v.y));
  }
  points.push({mesh,position,world,inverse});
 });
 for(const {mesh,position,world,inverse} of points){
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i).applyMatrix4(world);const r=Math.hypot(v.x,v.y);
   if(r>1e-6){const scale=(outside-(outside-r)*.504)/r;v.x*=scale;v.y*=scale}
   v.z*=.455;v.applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);
  }
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 }
 return ring;
}
// Three independent models, centered before scaling so rings rotate around the reactor.
export async function loadObsidian(THREE,loader){
 const parts=[];
 try{
  for(const file of ['ancestral-fighter','ancestral-portal','ancestral-inner-ring'])parts.push((await loader.loadAsync('./assets/models/'+file+'.glb?v=300')).scene);
 }catch(error){for(const part of parts)part.traverse(o=>o.geometry?.dispose());throw error}
 const root=new THREE.Group();root.name='Obsidian';
 function fit(source,span){
  const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  source.position.sub(center);const wrapper=new THREE.Group();wrapper.add(source);wrapper.scale.setScalar(span/Math.max(size.x,size.y,size.z));return wrapper;
 }
 // Uploaded hull points along -X; flight forward is -Z. Rotate hull only.
 const body=fit(parts[0],124);body.rotation.y=-Math.PI/2;root.add(body);
 // Near-parallel concentric hoops stand across the hull, as in the concept.
 // The fixed frame sets the plane; only its centered child spins in that plane.
 for(let i=0;i<2;i++){
  const frame=new THREE.Group();frame.position.set(0,3,14);frame.rotation.set(i?.08:-.04,i?-.08:.06,0);
  const pivot=new THREE.Group();pivot.name='obsidian-ring-'+i;
  pivot.add(slimObsidianRing(THREE,fit(parts[i+1],i?68:98)));frame.add(pivot);root.add(frame);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(8,16,12),new THREE.MeshStandardMaterial({color:0x0ab7a8,emissive:0x09cdb8,emissiveIntensity:.45,roughness:.65}));core.position.set(0,3,14);root.add(core);
 attachAssembledEngines(THREE,root,'obsidian');
 attachObsidianWake(THREE,root);
 return root;
}
// Three lightweight flowing ribbons, fading toward their tips (additive black = invisible).
function attachObsidianWake(THREE,root){
 for(let ribbon=0;ribbon<3;ribbon++){
  const segments=24,positions=new Float32Array((segments+1)*6),colors=new Float32Array((segments+1)*6),indices=[];
  for(let i=0;i<=segments;i++){
   const u=i/segments,fade=Math.pow(1-u,1.7);
   for(let side=0;side<2;side++)colors.set([.08*fade,.85*fade,.72*fade],i*6+side*3);
   if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='obsidian-wake-'+ribbon;mesh.userData.wakeOwned=true;mesh.visible=false;mesh.frustumCulled=false;root.add(mesh);
 }
}
export function animateObsidian(root,dt,power=0){
 if(!root)return;
 const step=Math.max(0,Math.min(.1,Number(dt)||0)),target=Math.max(0,Math.min(1,Number(power)||0));
 root.userData.wakeTime=(root.userData.wakeTime||0)+step;
 root.userData.wakePower=(root.userData.wakePower||0)+(target-(root.userData.wakePower||0))*(1-Math.exp(-step*9));
 const time=root.userData.wakeTime,strength=root.userData.wakePower;
 root.traverse(o=>{
  if(o.name==='obsidian-ring-0')o.rotation.z+=step*.38;
  else if(o.name==='obsidian-ring-1')o.rotation.z-=step*.55;
  else if(o.name.startsWith('obsidian-wake-')){
   // Remote ship clones must own their animated buffers and material.
   if(!o.userData.wakeOwned){o.geometry=o.geometry.clone();o.material=o.material.clone();o.userData.wakeOwned=true}
   o.visible=strength>.015;o.material.opacity=strength*.34;if(!o.visible)return;
   const ribbon=Number(o.name.slice(-1)),position=o.geometry.attributes.position,segments=position.count/2-1;
   for(let i=0;i<=segments;i++){
    const u=i/segments,phase=time*3.2-u*7+ribbon*2.1;
    const x=(ribbon-1)*10+Math.sin(phase)*u*12,y=-2+Math.cos(phase*.8)*u*9,z=51+u*(60+strength*130),width=(1-u)*(1.8+Math.sin(u*Math.PI)*4.8);
    position.setXYZ(i*2,x-width,y,z);position.setXYZ(i*2+1,x+width,y+width*.7,z);
   }
   position.needsUpdate=true;
  }
 });
}
