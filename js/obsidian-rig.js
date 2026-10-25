import {attachAssembledEngines} from './assembled-engines.js?v=303';
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
 // Longitudinal hoops surround the reactor, rather than facing the pilot like a portal.
 // The fixed frame sets the plane; only its centered child spins in that plane.
 for(let i=0;i<2;i++){
  const frame=new THREE.Group();frame.position.set(0,3,14);frame.rotation.y=Math.PI/2;frame.rotation.z=i?-.28:.12;
  const pivot=new THREE.Group();pivot.name='obsidian-ring-'+i;
  pivot.add(fit(parts[i+1],i?64:88));frame.add(pivot);root.add(frame);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(8,16,12),new THREE.MeshStandardMaterial({color:0x44ffdc,emissive:0x16d9be,emissiveIntensity:1.6,roughness:.65}));core.position.set(0,3,14);root.add(core);
 attachAssembledEngines(THREE,root,'obsidian');
 return root;
}
export function animateObsidian(root,dt){root?.traverse(o=>{if(o.name==='obsidian-ring-0')o.rotation.z+=dt*.38;else if(o.name==='obsidian-ring-1')o.rotation.z-=dt*.55})}
