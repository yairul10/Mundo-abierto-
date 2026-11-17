import test from 'node:test';
import assert from 'node:assert/strict';
import {applyObsidianSkin} from '../js/obsidian-skins.js';
import {animateObsidian} from '../js/obsidian-rig.js';
class Matrix{
 constructor(label='matrix'){this.label=label}
 clone(){return new Matrix(this.label)}
 invert(){this.label='inverse('+this.label+')';return this}
 multiply(other){this.label+='*'+other.label;return this}
}
class Color{constructor(hex=0xffffff){this.hex=hex;this.r=1;this.g=1;this.b=1}set(hex){this.hex=hex;return this}getHex(){return this.hex}}
class Material{
 constructor(){this.isMeshStandardMaterial=true;this.map={atlas:'original'};this.normalMap={normal:'original'};this.roughnessMap={roughness:'original'};this.metalnessMap={metal:'original'};this.metalness=.7;this.roughness=.4;this.color=new Color();this.disposed=false}
 clone(){return Object.assign(new Material(),this)}
 dispose(){this.disposed=true}
}
const THREE={Color,Vector3:class{}};
function fixture(){
 const original=new Material(),geometry={type:'BufferGeometry',attributes:{position:{array:new Float32Array([1,2,3])}}};
 const root={name:'Obsidian',userData:{},matrixWorld:new Matrix('ship'),updateWorldMatrix(){},traverse(fn){for(const o of [this,outer,inner,hull,ring])fn(o)}};
 const outer={name:'obsidian-ring-0',parent:root,rotation:{z:0},matrixWorld:new Matrix('outer')};
 const inner={name:'obsidian-ring-1',parent:root,rotation:{z:0},matrixWorld:new Matrix('inner')};
 const hull={name:'hull',parent:root,isMesh:true,material:original,geometry,matrixWorld:new Matrix('hull')};
 const ring={name:'ring-mesh',parent:outer,isMesh:true,material:original,geometry,matrixWorld:new Matrix('ring-mesh')};
 return {root,outer,inner,hull,ring,original,geometry};
}
test('Chile paints original model materials while preserving geometry, atlas and normal maps',()=>{
 const f=fixture(),vertices=[...f.geometry.attributes.position.array];
 applyObsidianSkin(THREE,f.root,'chile');
 assert.equal(f.hull.geometry,f.geometry);assert.equal(f.ring.geometry,f.geometry);
 assert.deepEqual([...f.geometry.attributes.position.array],vertices);
 assert.equal(f.hull.material.map,f.original.map);assert.equal(f.hull.material.normalMap,f.original.normalMap);
 assert.equal(f.original.metalness,.7);assert.equal(f.original.roughness,.4);assert.equal(f.original.disposed,false);
 assert.equal(f.hull.material.metalness,.12);assert.equal(f.hull.material.roughness,.82);
 const painted=f.hull.material;applyObsidianSkin(THREE,f.root,'original');
 assert.equal(f.hull.material,f.original);assert.equal(f.ring.material,f.original);assert.equal(painted.disposed,true);
});
test('Chile shader follows trim and surfaces, draws flag stars and anchors rotating ring segments',()=>{
 const f=fixture();applyObsidianSkin(THREE,f.root,'chile');
 const shader=()=>({uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'});
 const hull=shader(),ring=shader();f.hull.material.onBeforeCompile(hull);f.ring.material.onBeforeCompile(ring);
 assert.equal(hull.uniforms.skinRing.value,false);assert.equal(ring.uniforms.skinRing.value,true);
 assert.match(hull.uniforms.skinFrame.value.label,/inverse\(ship\)/);
 assert.match(ring.uniforms.skinFrame.value.label,/inverse\(outer\)/);
 assert.match(hull.fragmentShader,/chilePanels/);assert.match(hull.fragmentShader,/chileStar/);
 assert.match(hull.fragmentShader,/frontFlag/);assert.match(hull.fragmentShader,/rearFlag/);
 assert.match(hull.vertexShader,/skinNormal = mat3\(skinFrame\) \* normal/);
});
test('painting keeps both original ring animations in opposite directions',()=>{
 const f=fixture();applyObsidianSkin(THREE,f.root,'chile');
 animateObsidian(f.root,.05,0);
 assert.ok(f.outer.rotation.z>0);assert.ok(f.inner.rotation.z<0);
 applyObsidianSkin(THREE,f.root,'original');animateObsidian(f.root,.05,0);
 assert.ok(f.outer.rotation.z>.05*.38);assert.ok(f.inner.rotation.z<-.05*.55);
});
