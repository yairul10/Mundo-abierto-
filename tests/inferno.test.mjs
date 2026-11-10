import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {INFERNO:c,inInfernoFlames,advanceInferno}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/inferno.js',import.meta.url))).toString('base64'));
for(const side of [-1,1]){
 assert(inInfernoFlames({x:side*c.nozzleX,y:c.nozzleY,z:c.nozzleZ}),'both nozzles hit');
 assert(inInfernoFlames({x:side*240,y:0,z:850}),'wide outer front is covered');
}
assert(inInfernoFlames({x:0,y:0,z:500}),'jets overlap without a central gap');
for(const point of [{x:0,y:0,z:-100},{x:0,y:0,z:1100},{x:600,y:0,z:500},{x:0,y:600,z:500}])assert(!inInfernoFlames(point),'behind, beyond, side and above miss');
assert(inInfernoFlames({x:c.nozzleX,y:0,z:c.nozzleZ-20},30),'pilot hull radius counts at the edge');
let state={phase:'charge',elapsed:0};
assert.equal(advanceInferno(state,.5),0);assert.equal(state.phase,'charge');
assert.equal(advanceInferno(state,1),.5);assert.equal(state.phase,'fire');
assert.equal(advanceInferno(state,3),2.5);assert.equal(state.phase,'cooldown');
assert.equal(advanceInferno(state,3.5),0);assert.equal(state.phase,'charge');
for(const step of [1/30,1/60,1/144]){
 state={phase:'charge',elapsed:0};let seconds=0;
 for(let elapsed=0;elapsed<16-1e-9;elapsed+=step)seconds+=advanceInferno(state,Math.min(step,16-elapsed));
 assert(Math.abs(seconds-6)<1e-7,'damage is independent of frame rate');
}
state={phase:'charge',elapsed:0};assert.equal(advanceInferno(state,16),6,'long frame counts exactly two bursts');
console.log('Inferno: dual cones, range, vertical bounds, overlap, hull radius and frame-independent cycle passed.');
