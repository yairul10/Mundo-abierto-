import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudLayerCount,constrainCooperativePosition} from '../js/cooperative-clouds.js';
import {effectBudget,cloudSample} from '../js/effect-budget.js';
test('quality budgets preserve cloud depth and distance coverage',()=>{
 let prior=0;
 for(const level of ['verylow','low','medium','high']){
  const b=effectBudget(level);assert.ok(b.cloudSteps>prior);prior=b.cloudSteps;
  assert.equal(cloudSample(0,b.cloudSteps).distance,60);
  assert.equal(cloudSample(b.cloudSteps-1,b.cloudSteps).distance,cloudSample(27,28).distance);
  let depth=0;for(let i=0;i<b.cloudSteps;i++)depth+=cloudSample(i,b.cloudSteps).stepLength;
  assert.ok(Math.abs(depth-6188)<.00001);
  assert.ok(Object.isFrozen(b));
 }
});
test('budgets contain only presentation settings',()=>{
 assert.deepEqual(Object.keys(effectBudget('low')).sort(),['bursts','cloudSteps','effectDistance','fragments','lightningSegments','previewFps'].sort());
 assert.equal(effectBudget('unknown'),effectBudget('medium'));
});
test('texture layers stay bounded across quality changes without changing corridor limits',()=>{
 assert.deepEqual(['verylow','low','medium','high'].map(level=>cloudLayerCount(effectBudget(level))),[2,2,3,4]);
 for(const level of ['high','low','medium','verylow']){
  const p={x:3000,y:3120,z:-15000};cloudLayerCount(effectBudget(level));constrainCooperativePosition(p);
  assert.ok(Math.abs(Math.hypot(p.x,p.y-120)-1540)<.001);assert.equal(p.z,-12440);
 }
});
