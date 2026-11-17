// Frame textured model surfaces, excluding flame and wake effects.
// Always measure at zoom 1: previous frames must never compound the zoom.
export function fitPreviewCamera(THREE,camera,root){
 camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 root.updateWorldMatrix(true,true);
 const point=new THREE.Vector3();let extent=0;
 root.traverse(mesh=>{
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(!mesh.isMesh||!mesh.geometry||!materials.some(m=>m?.map))return;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox;if(!box)return;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   point.set(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);
   extent=Math.max(extent,Math.abs(point.x),Math.abs(point.y));
  }
 });
 camera.zoom=Number.isFinite(extent)&&extent>0?Math.min(1.5,.9/extent):1;
 camera.updateProjectionMatrix();
 return camera.zoom;
}
