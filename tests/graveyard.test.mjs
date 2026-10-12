import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {segmentDistance,createScrapCombat}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/graveyard.js',import.meta.url))).toString('base64'));
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}clone(){return new V(this.x,this.y,this.z)}copy(v){Object.assign(this,v);return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}normalize(){return this.multiplyScalar(1/(Math.hypot(this.x,this.y,this.z)||1))}multiplyScalar(t){this.x*=t;this.y*=t;this.z*=t;return this}addScaledVector(v,t){this.x+=v.x*t;this.y+=v.y*t;this.z+=v.z*t;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this}}
class Geo{setFromPoints(){return this}dispose(){}}
class Material{constructor(args){Object.assign(this,args)}clone(){return new Material(this)}dispose(){}}
class Mesh{constructor(geometry,material){Object.assign(this,{geometry,material,position:new V(),rotation:{x:0},scale:{setScalar(){}},quaternion:{setFromUnitVectors(){}}})}}
const THREE={Vector3:V,Mesh,Line:Mesh,BufferGeometry:Geo,SphereGeometry:Geo,IcosahedronGeometry:Geo,ConeGeometry:Geo,MeshStandardMaterial:Material,MeshBasicMaterial:Material,LineBasicMaterial:Material};
const objects=new Set(),scene={add:x=>objects.add(x),remove:x=>objects.delete(x)};
let hit=true,total=0;const pos=new V(0,0,500),combat=createScrapCombat(THREE,scene,{position:()=>pos,canHit:()=>hit,damage:x=>total+=x,notify(){}});
const enemy={type:'harpooner',dead:0,mesh:{position:new V(),visible:true,userData:{}}};
assert.equal(segmentDistance(new V(),new V(0,0,1000),pos),0);
combat.fire(enemy);combat.update(.8);assert(combat.blocked());assert.equal(total,25);
combat.update(2);assert(!combat.blocked());
combat.fire(enemy);combat.update(.8);assert(!combat.blocked(),'immunity prevents another tether');
combat.update(5);combat.fire(enemy);combat.update(.8);assert(combat.blocked());enemy.dead=1;combat.update(.01);assert(!combat.blocked(),'destroying owner releases cable');combat.clear();assert.equal(objects.size,0);
enemy.type='catapult';enemy.dead=0;total=0;combat.fire(enemy);combat.update(1.4);combat.update(1.5);assert.equal(total,110);combat.clear();assert.equal(objects.size,0);
combat.fire(enemy);combat.update(1.4);pos.x=500;combat.update(1.5);assert.equal(total,110,'moving outside blast avoids damage');combat.clear();
pos.x=0;combat.fire(enemy);hit=false;combat.update(1.4);assert.equal(objects.size,0,'safe zone cancels charging attack');
console.log('Passed: swept collision, tether duration/immunity/owner death, bomb damage/evasion, safe-zone cancellation, cleanup.');
