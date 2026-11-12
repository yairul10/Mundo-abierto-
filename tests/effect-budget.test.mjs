import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
test('cloud shader uses adaptive samples with the same range and opacity scaling',async()=>{
 const source=await readFile(new URL('../js/cooperative-clouds.js',import.meta.url),'utf8');
 assert.match(source,/if\(float\(i\)>=sampleCount\)break/);
 assert.match(source,/float\(i\)\*27\.\/\(sampleCount-1\.\)/);
 assert.match(source,/\(99\.5\+f\*9\.\)\*28\.\/sampleCount/);
 assert.match(source,/uniforms.sampleCount.value=budget\(\).cloudSteps/);
});
