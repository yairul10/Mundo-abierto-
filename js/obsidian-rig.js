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
 const body=fit(parts[0],124);body.rotation.y=Math.PI;root.add(body);
 for(let i=0;i<2;i++){
  const pivot=new THREE.Group();pivot.name='obsidian-ring-'+i;pivot.position.set(0,5,20);pivot.rotation.y=i?Math.PI/2:0;
  pivot.add(fit(parts[i+1],i?74:100));root.add(pivot);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(12,16,12),new THREE.MeshStandardMaterial({color:0x44ffdc,emissive:0x16d9be,emissiveIntensity:1.6,roughness:.65}));core.position.set(0,5,20);root.add(core);
 return root;
}
export function animateObsidian(root,dt){root?.traverse(o=>{if(o.name==='obsidian-ring-0')o.rotation.z+=dt*.38;else if(o.name==='obsidian-ring-1')o.rotation.z-=dt*.55})}
