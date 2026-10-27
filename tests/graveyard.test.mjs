import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {segmentDistance,createScrapCombat,linkScrapPairs,placeScrapPairs,rejoinScrapPair}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/graveyard.js',import.meta.url))).toString('base64'));
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}clone(){return new V(this.x,this.y,this.z)}copy(v){Object.assign(this,v);return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}normalize(){return this.multiplyScalar(1/(Math.hypot(this.x,this.y,this.z)||1))}multiplyScalar(t){this.x*=t;this.y*=t;this.z*=t;return this}addScaledVector(v,t){this.x+=v.x*t;this.y+=v.y*t;this.z+=v.z*t;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this}}
class Geo{setFromPoints(){return this}dispose(){}}
class Material{constructor(args){Object.assign(this,args)}clone(){return new Material(this)}dispose(){}}
class Mesh{constructor(geometry,material){Object.assign(this,{geometry,material,children:[],userData:{},position:new V(),rotation:{x:0,y:0,z:0},scale:{setScalar(){}},quaternion:{setFromUnitVectors(){}}})}add(child){this.children.push(child)}traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}}
class Group extends Mesh{}
const THREE={Vector3:V,Mesh,Group,Line:Mesh,BufferGeometry:Geo,SphereGeometry:Geo,TorusGeometry:Geo,IcosahedronGeometry:Geo,ConeGeometry:Geo,MeshStandardMaterial:Material,MeshBasicMaterial:Material,LineBasicMaterial:Material};
const objects=new Set(),scene={add:x=>objects.add(x),remove:x=>objects.delete(x)};
let hit=true,total=0;const pos=new V(0,0,500),combat=createScrapCombat(THREE,scene,{position:()=>pos,canHit:()=>hit,damage:(x,dt=1)=>total+=x*dt,notify(){}});
const enemy={type:'harpooner',dead:0,mesh:{position:new V(),visible:true,userData:{}}};
assert.equal(segmentDistance(new V(),new V(0,0,1000),pos),0);
combat.fire(enemy);combat.update(.8);assert(combat.blocked());assert.equal(total,0,'no instant damage on latch');
combat.update(1);assert.equal(total,50);assert(combat.blocked());
combat.update(2);assert.equal(total,150);assert(!combat.blocked(),'three seconds deals 150 total');
combat.fire(enemy);combat.update(.8);assert(!combat.blocked(),'immunity prevents another tether');
combat.update(5);combat.fire(enemy);combat.update(.8);assert(combat.blocked());enemy.dead=1;combat.update(.01);assert(!combat.blocked(),'destroying owner releases cable');combat.clear();assert.equal(objects.size,0);
const launcher={type:'catapult',dead:0,home:new V(),mesh:{position:new V(),visible:true,userData:{}}};enemy.dead=0;enemy.home=new V();linkScrapPairs([launcher,enemy]);placeScrapPairs([launcher,enemy]);assert.equal(enemy.mesh.position.x,150);assert.equal(enemy.partner,launcher);assert.equal(launcher.partner,enemy);
launcher.mesh.position.x=100;rejoinScrapPair(enemy);assert.equal(enemy.mesh.position.x,250);
launcher.mesh.position=new V();enemy.mesh.position=new V();pos.x=0;total=0;combat.fire(enemy);combat.update(.8);assert(combat.blocked());assert.equal(objects.size,2,'latch starts companion warning');
combat.update(1.4);combat.update(1.5);assert.equal(total,445,'bomb hits while tether active: 300 plus 145 tether damage');assert(combat.blocked());combat.update(.1);assert.equal(total,450);assert(!combat.blocked());combat.clear();assert.equal(objects.size,0);
enemy.type='catapult';total=0;combat.fire(enemy);combat.update(1.4);combat.update(1.5);assert.equal(total,300);combat.clear();assert.equal(objects.size,0);
combat.fire(enemy);combat.update(1.4);pos.x=500;combat.update(1.5);assert.equal(total,300,'moving outside blast avoids damage');combat.clear();
pos.x=0;combat.fire(enemy);hit=false;combat.update(1.4);assert.equal(objects.size,0,'safe zone cancels charging attack');
console.log('Passed: paired placement/respawn, coordinated bomb, swept collision, 3s tether at 50/s, immunity, owner death, 300 blast/evasion, cleanup.');


// Boss spears share the existing three-second tether and its anti-chain immunity.
hit=true;combat.clear();total=0;
const boss={dead:0,mesh:{visible:true,userData:{},position:new V(),updateMatrixWorld(){},worldToLocal:v=>v,localToWorld:v=>v}};
assert(combat.snag(boss,new V(20,0,0)));assert(combat.blocked());
assert(!combat.snag(boss,new V()),'multiple spears cannot stack tethers');
combat.update(3);assert.equal(total,150);assert(!combat.blocked());
assert(!combat.snag(boss,new V()),'boss respects existing immunity');
combat.update(5);assert(combat.snag(boss,new V()));boss.dead=1;combat.update(.01);assert(!combat.blocked());
combat.clear();assert.equal(objects.size,0,'boss cable disposed');

// Pro attacks carry their owner through bombs and tether ticks for ×2 damage.
const proHits=[];const eliteCombat=createScrapCombat(THREE,scene,{position:()=>pos,canHit:()=>true,damage:(amount,elapsed=1,owner)=>proHits.push({amount,elapsed,owner}),notify(){}});
const proHarpoon={type:'harpooner',pro:true,dead:0,mesh:{position:new V(),visible:true,userData:{}}};pos.x=0;pos.z=500;eliteCombat.fire(proHarpoon);eliteCombat.update(.8);eliteCombat.update(1);assert.equal(proHits[0].owner,proHarpoon);assert.equal(proHits[0].amount,50);eliteCombat.clear();proHits.length=0;
const proCatapult={...proHarpoon,type:'catapult'};eliteCombat.fire(proCatapult);eliteCombat.update(1.4);eliteCombat.update(1.5);assert.equal(proHits[0].owner,proCatapult);assert.equal(proHits[0].amount,300);eliteCombat.clear();
