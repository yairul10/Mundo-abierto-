import assert from 'node:assert/strict';
import {titanBombTangent} from '../js/titan-effects.js';
const start={x:10,y:40,z:300},target={x:220,y:-15,z:-800},arc=180;
const position=u=>[start.x+(target.x-start.x)*u,start.y+(target.y-start.y)*u+Math.sin(Math.PI*u)*arc,start.z+(target.z-start.z)*u];
for(const u of [0,.15,.5,.85,1]){
 const a=position(u-1e-5),b=position(u+1e-5),t=titanBombTangent(start,target,arc,u);
 for(let i=0;i<3;i++)assert(Math.abs((b[i]-a[i])/2e-5-t[i])<1e-5,'nose follows the actual curved flight tangent');
}
assert(titanBombTangent(start,target,arc,0)[1]>0);
assert(titanBombTangent(start,target,arc,1)[1]<0);
assert.deepEqual(titanBombTangent(start,target,0,.5),[210,-55,-1100]);
assert.deepEqual(titanBombTangent(start,start,0,0),[0,1,0],'stationary fallback is a valid direction');
console.log('Titan projectile orientation follows straight and arcing paths without changing timing or damage.');
