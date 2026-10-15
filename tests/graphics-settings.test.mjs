import assert from 'node:assert/strict';
import {QUALITY,renderRatio,normalizeGraphics,createGraphicsController} from '../js/graphics-settings.js';
assert.equal(normalizeGraphics('corrupt'),'auto');
for(const profile of Object.values(QUALITY)){
 const ratio=renderRatio(profile,2712,1220,3);
 assert(2712*1220*ratio*ratio<=profile.maxPixels+1);
 assert(ratio<=profile.pixelRatio);
}
const simulate=(controller,seconds,fps,eligible=true)=>{for(let i=0;i<seconds*fps;i++)controller.sample(1/fps,eligible)};
const c=createGraphicsController();simulate(c,18,24);assert.equal(c.level,'low','sustained slow gameplay reduces quality');
simulate(c,18,60);assert.equal(c.level,'low','short recovery cannot cause oscillation');
simulate(c,35,60);assert.equal(c.level,'medium','sustained smooth play can recover');
c.select('high');simulate(c,40,15);assert.equal(c.level,'high','manual choice is respected');
c.select('auto');simulate(c,40,15,false);assert.equal(c.level,'medium','loading, background and menus do not lower auto quality');
c.recover();assert.equal(c.level,'low','context loss retry starts conservatively');assert.equal(c.mode,'auto');
c.select('high');c.recover();assert.equal(c.level,'low');assert.equal(c.mode,'high','recovery does not overwrite saved preference');
console.log('Graphics: pixel memory budgets, automatic adaptation, hysteresis, suspended sampling, manual quality and safe recovery passed.');
