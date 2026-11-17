import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPreviewCamera} from '../js/preview-framing.js';
const THREE={Vector3:class{
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 applyMatrix4(m){this.x+=m.x;this.y+=m.y;return this}
 project(camera){this.x*=camera.zoom/camera.aspect;this.y*=camera.zoom;return this}
}};
function fixture(){
 const camera={zoom:.001,aspect:.65,updateProjectionMatrix(){},updateMatrixWorld(){}};
 const mesh={isMesh:true,material:{map:{}},matrixWorld:{x:0,y:0},geometry:{boundingBox:{min:{x:-1,y:-1,z:-1},max:{x:1,y:1,z:1}}}};
 const effect={...mesh,material:{},geometry:{boundingBox:{min:{x:-1000,y:-1000,z:-1000},max:{x:1000,y:1000,z:1000}}}};
 const root={updateWorldMatrix(){},traverse(fn){fn(mesh);fn(effect)}};
 return {camera,root,mesh};
}
test('preview zoom is stable across repeated frames and excludes effects',()=>{
 const {camera,root}=fixture();const expected=.9*camera.aspect;
 for(let i=0;i<600;i++)assert.equal(fitPreviewCamera(THREE,camera,root),expected);
});
test('preview adapts to viewport changes and returns to a larger size',()=>{
 const {camera,root}=fixture();fitPreviewCamera(THREE,camera,root);const portrait=camera.zoom;
 camera.aspect=2;fitPreviewCamera(THREE,camera,root);assert.equal(camera.zoom,.9);assert.ok(camera.zoom>portrait);
 camera.aspect=.65;assert.equal(fitPreviewCamera(THREE,camera,root),portrait);
});
