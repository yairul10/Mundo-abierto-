import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {INFERNO:c,inInfernoFlames,advanceInferno,infernoPower}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/inferno.js',import.meta.url))).toString('base64'));
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
assert.equal(advanceInferno(state,2.5),2.5);assert.equal(state.phase,'fade');
assert.equal(infernoPower(state),1);
assert.equal(advanceInferno(state,.25),.1875);assert.equal(infernoPower(state),.5);
assert.equal(advanceInferno(state,.25),.0625);assert.equal(infernoPower(state),0);
assert.equal(advanceInferno(state,3.5),0);assert.equal(state.phase,'charge');
for(const step of [1/30,1/60,1/144]){
 state={phase:'charge',elapsed:0};let seconds=0;
 for(let elapsed=0;elapsed<16-1e-9;elapsed+=step)seconds+=advanceInferno(state,Math.min(step,16-elapsed));
 assert(Math.abs(seconds-6.5)<1e-7,'damage is independent of frame rate');
}
state={phase:'charge',elapsed:0};assert.equal(advanceInferno(state,16),6.5,'long frame counts exactly two bursts');
console.log('Inferno: dual cones, range, vertical bounds, overlap, hull radius and frame-independent cycle passed.');

assert.equal(c.damage,300,'Inferno deals triple its former flame damage');
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
assert.match(game,/inferno:\{hp:19500,damage:300/,'triple base health and damage');
assert.match(game,/aggressive:!pro&&type!=='devastator'&&type!=='inferno'/,'Inferno spawns passive');
assert.equal((game.match(/e\.aggressive=!e\.pro&&e\.type!=='devastator'&&e\.type!=='inferno'/g)||[]).length,2,'both respawn paths reset aggression');
assert.match(game,/const active=e\.aggressive===true&&activeSector==='graveyard'/,'proximity alone cannot start pursuit or flames');
assert.match(game,/if\(damage>0\)e\.aggressive=true/,'positive damage provokes retaliation');
