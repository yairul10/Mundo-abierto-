import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from './node_modules/three/build/three.module.js';
import {createNexoRig,NEXO_VISUAL} from '../../js/pvp-boss-rig.js';
const scene=new T.Scene(),root=new T.Group();scene.add(root);const rig=createNexoRig(T,root,scene);
const body=new T.Mesh(new T.BoxGeometry(2.3,3.5,1.38).translate(0,1.75,0),new T.MeshStandardMaterial());rig.mountBody(body);const bodyBox=new T.Box3().setFromObject(root.children[0].children.at(-1));assert(Math.abs(bodyBox.max.y-bodyBox.min.y-360)<1e-6);
const armGeometry=new T.BoxGeometry(1.5,.9,.5).translate(-.05,0,0),armMaterial=new T.MeshStandardMaterial(),arm=new T.Mesh(armGeometry,armMaterial);rig.mountArm(arm);
const mounted=rig.arms.map(a=>a.pivot.children.at(-1));assert.equal(mounted[0].children[0].geometry,mounted[1].children[0].geometry,'Both arms share geometry');assert.equal(mounted[0].children[0].material,mounted[1].children[0].material,'Both arms share textures/materials');
root.updateMatrixWorld(true);for(let i=0;i<2;i++){const box=new T.Box3().setFromObject(mounted[i]);assert(Math.abs(box.min.x-NEXO_VISUAL.shoulders[i][0])<1e-4,'Collar begins at its shoulder pivot');assert(Math.abs(box.max.x-box.min.x-170)<1e-4)}
root.position.set(100,70,-1500);root.rotation.y=.8;
const targets=[{targetId:'a',targetPos:[-400,140,-800]},{targetId:'b',targetPos:[600,20,-1100]}];rig.assignTargets(targets);for(let i=0;i<100;i++)rig.update(.02,i*.02);
for(const a of rig.arms){const pivot=a.pivot.getWorldPosition(new T.Vector3()),muzzle=a.muzzle.getWorldPosition(new T.Vector3()),goal=new T.Vector3(...targets.find(t=>t.targetId===a.targetId).targetPos);assert(muzzle.clone().sub(pivot).normalize().dot(goal.sub(pivot).normalize())>.999,'Each muzzle independently points at its world target under a rotated body')}
const assignment=rig.arms.map(a=>a.targetId);rig.assignTargets([...targets].reverse());assert.deepEqual(rig.arms.map(a=>a.targetId),assignment,'HP rank changes do not needlessly swap cannons');
rig.setCharge(.4);rig.update(.01,1);assert(rig.arms.every(a=>a.charge.visible));rig.update(.5,1.5);assert(rig.arms.every(a=>!a.charge.visible));
const before=scene.children.length;rig.fire(targets);assert.equal(scene.children.length,before+2,'Two giant laser effects');rig.update(.5,2);assert.equal(scene.children.length,before,'Laser effects expire');
rig.assignTargets([targets[0]]);assert.equal(rig.arms.filter(a=>a.target).length,1,'Solo target does not create a second shot');
assert(rig.flames.every(f=>f.position.y<-170));const lengths=rig.flames.map(f=>f.scale.y);rig.update(.02,2.8);assert(rig.flames.some((f,i)=>f.scale.y!==lengths[i]),'Downward thrusters animate');
let disposals=0;armGeometry.addEventListener('dispose',()=>disposals++);rig.dispose();rig.dispose();assert.equal(disposals,1,'Shared GPU resource disposed exactly once');
for(const path of [NEXO_VISUAL.body,NEXO_VISUAL.arm]){const bytes=readFileSync(new URL('../../'+path.split('?')[0],import.meta.url)),size=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+size));assert.equal(bytes.readUInt32LE(8),bytes.length);assert(data.images.every(i=>i.mimeType==='image/jpeg'&&!i.uri));assert(data.accessors.every(a=>a.count>0));assert(bytes.length<3500000,'Mobile textures remain compressed')}
console.log('Nexo rig: shared models, socket alignment, independent world aiming, charge, dual lasers, thrusters, expiration and unique disposal passed.');
