import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRefreshGate,batchStaticField} from '../js/frame-work.js';

test('presentation clock limits refreshes, permits explicit actions and recovers after pauses',()=>{
 const gate=createRefreshGate(100);let count=0;
 for(let t=0;t<1000;t+=10)if(gate.ready(t))count++;
 assert.equal(count,10);
 assert.equal(gate.ready(901,true),true);assert.equal(gate.ready(950),false);
 assert.equal(gate.ready(5000),true);assert.equal(gate.ready(5001),false);
 gate.reset();assert.equal(gate.ready(5001),true);assert.equal(gate.ready(0),true);
});
test('batching preserves every material and refreshes individual transforms and bounds',()=>{
 class InstancedMesh{
  constructor(geometry,material,count){Object.assign(this,{geometry,material,count,matrices:[],instanceMatrix:{}})}
  setMatrixAt(i,m){this.matrices[i]={...m}}
  computeBoundingBox(){this.boxUpdates=(this.boxUpdates||0)+1}
  computeBoundingSphere(){this.sphereUpdates=(this.sphereUpdates||0)+1}
 }
 const geometries=Array.from({length:5},()=>({})),materials=Array.from({length:4},()=>({}));
 const rocks=Array.from({length:100},(_,i)=>({geometry:geometries[i%5],material:materials[i%4],x:i,updateMatrix(){this.matrix={x:this.x}}}));
 const group={children:[],add(o){this.children.push(o)}};
 const result=batchStaticField({InstancedMesh},group,rocks);
 assert.equal(group.children.length,20);assert.equal(group.children.reduce((n,m)=>n+m.count,0),100);
 for(const batch of result.batches){for(const [i,rock] of batch.objects.entries()){
  assert.equal(batch.mesh.geometry,rock.geometry);assert.equal(batch.mesh.material,rock.material);
  assert.equal(batch.mesh.matrices[i].x,rock.x);rock.x+=1000;
 }}
 result.refresh();
 for(const batch of result.batches){assert.equal(batch.mesh.boxUpdates,2);assert.equal(batch.mesh.sphereUpdates,2);assert.equal(batch.mesh.instanceMatrix.needsUpdate,true);batch.objects.forEach((r,i)=>assert.equal(batch.mesh.matrices[i].x,r.x))}
});
test('game gates presentation only and keeps asteroid navigation on individual rocks',async()=>{
 const source=await readFile(new URL('../js/game3d.js',import.meta.url),'utf8');
 assert.match(source,/function hud\(force=true\)\{\s*if\(!hudRefresh.ready/);
 assert.match(source,/pvpSession.beforeFrame\(dt,now\)/);
 assert.match(source,/asteroidRocks.filter/);
 assert.doesNotMatch(source,/asteroidField.children/);
 assert.match(source,/asteroidBatches.refresh\(\)/);
 assert.match(source,/covered!==wasCovered/);
});
