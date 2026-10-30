import assert from 'node:assert/strict';
import {OBSIDIAN_SKINS,allowedObsidianSkin,applyObsidianSkin,resetObsidianClone} from '../js/obsidian-skins.js';
// Authoritative admin status must be boolean true. Unknown skins fail closed.
for(const role of [false,undefined,null,1,'true'])assert.equal(allowedObsidianSkin('imperial',role),'original');
assert.equal(allowedObsidianSkin('imperial',true),'imperial');
assert.equal(allowedObsidianSkin('__proto__',true),'original');
assert.equal(allowedObsidianSkin('unknown',true),'original');
assert.deepEqual(Object.keys(OBSIDIAN_SKINS),['original','carmesi','imperial']);
// Exercise material ownership, shader setup and restoration without loading WebGL.
class Color{constructor(value){this.value=value}set(value){this.value=value}getHex(){return this.value}}
class Material{constructor(){this.map={};this.color=new Color(0xffffff);this.disposed=false}clone(){return new Material()}dispose(){this.disposed=true}}
const THREE={Color,Vector3:class{constructor(...xyz){this.xyz=xyz}}};
const original=new Material(),mesh={isMesh:true,name:'hull',material:original};
const root={userData:{},traverse(fn){fn(mesh)}};
applyObsidianSkin(THREE,root,'carmesi');const red=mesh.material;
assert.notEqual(red,original);assert.equal(original.disposed,false);
const shader={uniforms:{},fragmentShader:'#include <map_fragment>'};red.onBeforeCompile(shader);
assert.match(shader.fragmentShader,/energyMask/);assert.match(shader.fragmentShader,/skinTrim/);
applyObsidianSkin(THREE,root,'carmesi');assert.equal(mesh.material,red);
// Remote clone restoration must not change the local selected material.
const remoteMesh={...mesh},remote={userData:{},traverse(fn){fn(remoteMesh)}};
resetObsidianClone(remote);assert.equal(remoteMesh.material,original);assert.equal(mesh.material,red);
applyObsidianSkin(THREE,root,'imperial');assert.equal(red.disposed,true);assert.equal(original.disposed,false);
applyObsidianSkin(THREE,root,'original');assert.equal(mesh.material,original);assert.equal(original.disposed,false);
console.log('Obsidian skins: admin gate, material isolation, shader masks and reversible selection.');
