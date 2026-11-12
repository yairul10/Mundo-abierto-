// Independent presentation clocks: never gate simulation or network updates.
export function createRefreshGate(interval=100){
 let last=null;
 return {reset(){last=null},ready(now,force=false){
  if(force||last===null||now<last||now-last>=interval){last=now;return true}return false;
 }};
}
// Keep logical transforms separate so navigation sees individual rocks.
export function batchStaticField(THREE,group,objects){
 const batches=[];
 for(const object of objects){
  let batch=batches.find(b=>b.geometry===object.geometry&&b.material===object.material);
  if(!batch){batch={geometry:object.geometry,material:object.material,objects:[]};batches.push(batch)}
  batch.objects.push(object);
 }
 for(const batch of batches){batch.mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.objects.length);group.add(batch.mesh)}
 function refresh(){for(const batch of batches){
  batch.objects.forEach((object,i)=>{object.updateMatrix();batch.mesh.setMatrixAt(i,object.matrix)});
  batch.mesh.instanceMatrix.needsUpdate=true;
  batch.mesh.computeBoundingBox();batch.mesh.computeBoundingSphere();
 }}
 refresh();return {refresh,batches};
}
