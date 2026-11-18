import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExplorerDesign} from '../js/explorer-design.js';
test('explorer Obsidian preview preserves source material and restores it',()=>{
 const base={emissive:{setHex(){}},clone(){return {emissive:{setHex(){}},dispose(){this.disposed=true}}}};
 const part={isMesh:true,material:base},root={traverse(fn){fn(part)}};
 applyExplorerDesign({},root,'obsidian');const painted=part.material;assert.notEqual(painted,base);assert.equal(base.disposed,undefined);
 const shader={fragmentShader:'#include <map_fragment>'};painted.onBeforeCompile(shader);assert.match(shader.fragmentShader,/droneBlue/);
 applyExplorerDesign({},root,'original');assert.equal(part.material,base);assert.equal(painted.disposed,true);
 applyExplorerDesign({},root,'unknown');assert.equal(part.material,base);
});
