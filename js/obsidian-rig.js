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
   if(r>1e-6){const scale=(outside-(outside-r)*.72)/r;v.x*=scale;v.y*=scale}
   v.z*=.65;v.applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);
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
 return root;
}
export function animateObsidian(root,dt){root?.traverse(o=>{if(o.name==='obsidian-ring-0')o.rotation.z+=dt*.38;else if(o.name==='obsidian-ring-1')o.rotation.z-=dt*.55})}
