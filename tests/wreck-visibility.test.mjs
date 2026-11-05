import test from 'node:test';
import assert from 'node:assert/strict';
import {createWreckVisibility} from '../js/wreck-visibility.js';
test('Entering a wreck fades isolated materials and leaving restores the originals',()=>{
 let boundsBuilt=0,clones=0;
 class Box{
  setFromObject(root){boundsBuilt++;this.root=root;return this}
  expandByScalar(){return this}
  containsPoint(point){return point.inside}
 }
 const original={opacity:.8,transparent:false,depthWrite:true,clone(){clones++;return {...this}}};
 const other={opacity:1,transparent:false,depthWrite:true,clone(){clones++;return {...this}}};
 const meshes=[{isMesh:true,material:original},{isMesh:true,material:[original,other]}];
 const root={updateWorldMatrix(){},traverse(fn){meshes.forEach(fn)}};
 const visibility=createWreckVisibility({Box3:Box});
 visibility.add(root);
 visibility.update({inside:false},1,true);
 assert.equal(clones,0,'outside wrecks allocate no fade materials');
 visibility.update({inside:true},.1,true);
 assert.equal(meshes[0].material.opacity,.8*.7);
 assert.equal(meshes[0].material,meshes[1].material[0],'repeated materials share one fade clone');
 assert.equal(original.opacity,.8);assert.equal(original.transparent,false);
 visibility.update({inside:true},1,true);
 assert.equal(meshes[0].material.opacity,.8*.12);
 assert.equal(meshes[0].material.depthWrite,false);
 visibility.update({inside:false},1,true);
 assert.equal(meshes[0].material,original);
 assert.deepEqual(meshes[1].material,[original,other]);
 visibility.update({inside:true},1,true);
 assert.equal(clones,2,'reentry reuses clones');
 visibility.update({inside:true},1,false);
 assert.equal(meshes[0].material,original,'leaving the sector restores original rendering');
 assert.equal(boundsBuilt,1,'static bounds are not rebuilt each frame');
});
