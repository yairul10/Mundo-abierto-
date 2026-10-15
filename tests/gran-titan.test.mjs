import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const moduleSource=readFileSync(new URL('../js/gran-titan.js',import.meta.url),'utf8');
const {titanScale,titanPattern,titanBombOffsets,titanPatrolPoint,createTitanCycle,advanceTitanCycle}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
assert.equal(titanScale(40),1);assert.equal(titanScale(105),2.3);assert.equal(titanScale(1000),2.3);
for(let round=0;round<10;round++){const lanes=titanPattern(round);assert.equal(lanes.length,6);assert.equal(new Set(lanes).size,6);assert(lanes.includes(0));assert(!lanes.includes([-2,-1,1,2][round%4]))}
const c=createTitanCycle();let fires=0;for(let i=0;i<80;i++){const s=advanceTitanCycle(c,.1,true);if(s.fire)fires++;assert(s.open>=0&&s.open<=1)}assert.equal(fires,1);
advanceTitanCycle(c,.1,true);assert.equal(c.kind,'bomb');assert.equal(c.round,1);
advanceTitanCycle(c,2,true);assert.equal(advanceTitanCycle(c,0,false).open,0);assert.equal(c.time,0);assert.equal(c.fired,false);
console.log('Gran Titan: capped stats, rotating escape lane, one shot per cycle, alternating bombs and safe interruption.');

for(let round=0;round<8;round++){const targets=titanBombOffsets(round);assert.equal(targets.length,4);assert.deepEqual(targets[0],{x:0,z:0});assert.equal(targets.filter(p=>Math.hypot(p.x,p.z)<150).length,1);assert(targets.every(p=>Math.hypot(p.x-600,p.z)>150))}
for(let a=0;a<7;a+=.1){const p=titanPatrolPoint(a);assert(Math.abs(Math.hypot(p.x,p.z)-2800)<1e-8);assert(p.y>=30&&p.y<=210)}
