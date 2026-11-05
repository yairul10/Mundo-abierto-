// Each stationary wreck owns its fade materials. Shared source models stay intact.
export function createWreckVisibility(THREE){
 const wrecks=[];
 function add(root){
  root.updateWorldMatrix(true,true);
  wrecks.push({root,bounds:new THREE.Box3().setFromObject(root).expandByScalar(20),amount:1,meshes:null});
 }
 function prepare(wreck){
  const materials=new Map();
  wreck.meshes=[];
  wreck.root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const original=mesh.material;
   const faded=(Array.isArray(original)?original:[original]).map(material=>{
    if(!materials.has(material)){
     const clone=material.clone();
     clone.transparent=true;clone.depthWrite=false;
     materials.set(material,{clone,opacity:material.opacity});
    }
    return materials.get(material).clone;
   });
   wreck.meshes.push({mesh,original,faded:Array.isArray(original)?faded:faded[0]});
  });
  wreck.materials=[...materials.values()];
 }
 function update(position,dt,active){
  for(const wreck of wrecks){
   const target=active&&wreck.bounds.containsPoint(position) ? .12 : 1;
   if(wreck.amount===target)continue;
   if(!wreck.meshes)prepare(wreck);
   const step=Math.max(0,dt)*3;
   wreck.amount+=Math.max(-step,Math.min(step,target-wreck.amount));
   if(Math.abs(wreck.amount-target)<.00001)wreck.amount=target;
   for(const {clone,opacity} of wreck.materials)clone.opacity=opacity*wreck.amount;
   for(const {mesh,original,faded} of wreck.meshes)mesh.material=wreck.amount===1?original:faded;
  }
 }
 return {add,update};
}
