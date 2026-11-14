import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoopFarmPilot} from '../js/coop-farm-pilot.js';
const state=()=>({position:{x:0,y:120,z:-2500},hp:100,maxHp:100,safe:false,robot:true,canFight:true,enemies:[{id:'enemy',hp:100,position:{x:0,y:120,z:-3200}}],threats:[]});
test('cooperative auto strafes while aiming and moves away from incoming projectiles and bomb impact zones',()=>{
 const p=createCoopFarmPilot(),s=state();let c=p.tick(s,1);assert.equal(c.fire,true);assert.equal(c.targetId,'enemy');assert.notEqual(c.strafe,0);
 s.threats=[{position:{x:100,y:120,z:-2550},velocity:{x:-200,y:0,z:0}}];c=p.tick(s,1);assert.equal(c.strafe,-1);
 s.threats=[{position:{x:2000,y:120,z:-2000},target:{x:-40,y:120,z:-2500},radius:150}];c=p.tick(s,1);assert.equal(c.strafe,1);
});
test('low hull triggers retreat without firing and keeps repairing until 95% before returning to combat',()=>{
 const p=createCoopFarmPilot(),s=state();s.hp=30;let c=p.tick(s,1);assert.equal(p.retreating,true);assert.equal(c.fire,false);assert.equal(c.targetId,null);assert.ok(c.throttle>0);assert.ok(Math.abs(c.yaw)>3);
 s.position={x:0,y:120,z:-250};s.safe=true;s.canFight=false;c=p.tick(s,2);assert.equal(c.throttle,0);assert.equal(c.strafe,0);assert.match(p.status,/Reparando/);assert.equal(s.hp,30,'pilot never grants health');
 s.hp=94;p.tick(s,3);assert.equal(p.retreating,true);s.hp=95;c=p.tick(s,4);assert.equal(p.retreating,false);assert.equal(c.fire,false);
 s.safe=false;s.canFight=true;s.position={x:0,y:120,z:-2500};c=p.tick(s,5);assert.equal(c.fire,true);
});
test('no robot waits for manual repair and reset clears the retreat state without spending credits',()=>{
 const p=createCoopFarmPilot(),s=state();s.hp=10;s.robot=false;s.safe=true;p.tick(s,1);assert.match(p.status,/manual/);assert.equal(s.hp,10);assert.equal(s.gold,undefined);p.reset();assert.equal(p.retreating,false);
 s.hp=100;s.enemies=[];s.position={x:0,y:120,z:-250};const c=p.tick(s,2);assert.ok(c.throttle>0);assert.equal(c.fire,false);
});
