import assert from 'node:assert/strict';
import {TITAN_BOMB_FUSE,TITAN_BLAST_DURATION,titanBombProgress,createTitanEffects} from '../js/titan-effects.js';
assert.equal(TITAN_BOMB_FUSE,3.5,'warning and damage keep the original dodge window');
assert(titanBombProgress(2)<1,'bomb cannot sit at target waiting for its fuse');
assert.equal(titanBombProgress(TITAN_BOMB_FUSE),1);assert.equal(titanBombProgress(-1),0);assert.equal(titanBombProgress(10),1);
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}copy(v){Object.assign(this,v);return this}setScalar(v){this.x=this.y=this.z=v;return this}multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this}}
class Geometry{dispose(){this.disposed=true}}
class Material{constructor(args){Object.assign(this,args)}dispose(){this.disposed=true}}
class Mesh{constructor(geometry,material){Object.assign(this,{geometry,material,children:[],position:new V(),scale:new V(1,1,1),quaternion:{copy(){},setFromUnitVectors(){}},userData:{}})}add(o){this.children.push(o)}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}removeFromParent(){this.removed=true}}
const T={Vector3:V,Group:Mesh,Mesh,SphereGeometry:Geometry,RingGeometry:Geometry,ConeGeometry:Geometry,MeshBasicMaterial:Material,DoubleSide:2};
const effects=createTitanEffects(T,()=>3),blast=effects.blast(new V(10,20,30));
assert.equal(blast.userData.sparks.children.length,3,'low graphics still has an explosion');
effects.animateBlast(blast,.1,{quaternion:{}});assert(blast.userData.core.scale.x>24);assert(blast.userData.wave.scale.x>20);assert(blast.userData.core.material.opacity>.5,'clear initial flash');
effects.animateBlast(blast,TITAN_BLAST_DURATION,{quaternion:{}});assert.equal(blast.userData.core.material.opacity,0);assert.equal(blast.userData.wave.material.opacity,0);
effects.dispose(blast);assert(blast.removed);assert(blast.userData.shell.geometry.disposed);assert(blast.userData.core.material.disposed);
console.log('Titan bombs: arrival synchronized to fuse, visible flash/wave at low quality, fade and GPU cleanup.');
