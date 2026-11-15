// CPU/scene regression checks, not a device FPS benchmark.
import assert from 'node:assert/strict';
import {mountCooperativeClouds} from '../js/cooperative-clouds.js';
import {createCloudLightning} from '../js/cloud-lightning.js';
import {createArenaEnemyView} from '../js/pvp-enemies.js';
import {effectBudget} from '../js/effect-budget.js';
const T=await import(process.env.COSMOS_THREE||'three');
for(const level of ['verylow','low','medium','high']){
 const scene=new T.Scene(),u={lightningColor:{value:new T.Color()},lightningColor2:{value:new T.Color()},lightningPosition:{value:new T.Vector3()},lightningPower:{value:0},eye:{value:new T.Vector3()},cameraWorld:{value:new T.Matrix4()}},fx=createCloudLightning(T,scene,u,()=>.5,{budget:()=>effectBudget(level)});
 let flashes=0,geometry=0;for(let frame=0;frame<200;frame++){fx.update(.025);if(u.lightningPower.value>0)flashes++;geometry=Math.max(geometry,scene.children[0].children.length)}assert.ok(flashes>0);
 if(['verylow','low'].includes(level))assert.equal(geometry,0);else assert.ok(geometry>0);
 fx.dispose();assert.equal(scene.children.length,0);
 const clouds=mountCooperativeClouds(T,scene,{budget:()=>effectBudget(level)}),sky=scene.getObjectByName('Nubes volumétricas cooperativas');clouds.update(.1);assert.equal(sky.material.uniforms.sampleCount.value,effectBudget(level).cloudSteps);assert.ok(sky.material.fragmentShader.includes('if(sampleCount<=18.)'));
 clouds.dispose();assert.equal(scene.children.length,0);
 console.log(level+': lightning meshes '+geometry+', ambient flashes '+flashes);
}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),origin=new T.Vector3(0,120,0);camera.position.set(0,120,300);camera.updateMatrixWorld();let limit=2200;
const view=createArenaEnemyView({THREE:T,scene,camera,enemies:[],hidden:()=>false,detailOrigin:()=>origin,detailDistance:()=>limit});
const hinge=new T.Group(),mesh=new T.Group();mesh.position.set(5000,120,0);
const npc={playerId:'npc',kind:'colossusPro',model:'colossus',mesh,goal:mesh.position.clone(),hp:100,maxHp:100,dead:0,active:true,launchBaysUntil:null,label:{hidden:false,style:{}},rig:{panels:[{hinge,openAngle:1}]},flames:[]};view.entities.set('npc',npc);
view.update(.1);assert.equal(mesh.visible,false);assert.equal(hinge.rotation.x,0);assert.equal(npc.hp,100);assert.equal(view.entities.size,1);assert.equal(npc.label.hidden,true);
npc.goal.set(0,120,-1000);view.update(.1);assert.equal(mesh.visible,true);assert.ok(hinge.rotation.x>0);assert.equal(npc.hp,100);
limit=Infinity;npc.goal.set(5000,120,0);view.update(.1);assert.equal(mesh.visible,true);
const catMesh=new T.Group();catMesh.position.set(5000,120,0);let catUpdates=0;limit=2200;const cat={...npc,playerId:'cat',kind:'reinforcement',model:'catapult',mesh:catMesh,goal:catMesh.position.clone(),rig:{update(){catUpdates++}},label:{hidden:false,style:{}}};view.entities.set('cat',cat);view.update(.1);assert.equal(catUpdates,0);cat.goal.set(0,120,-1000);view.update(.1);assert.equal(catUpdates,1);assert.equal(cat.hp,100);
console.log('NPC presentation: distant animation skipped, live state retained, nearby and ordinary arena rendering restored.');
