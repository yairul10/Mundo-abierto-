import test from 'node:test';
import assert from 'node:assert/strict';
import {guidePrecisionLaser,PRECISION_GUIDANCE} from '../js/precision-guidance.js';
import {makeCombatPlayer,volley,stepCombat} from '../server/pvp/combat.mjs';
test('precision gently turns toward a selected nearby target, preserving speed and the total angle limit',()=>{
 const shot={guidance:true,pos:[0,0,0],vel:[0,0,-12000]},target=[150,0,-1000];
 assert.equal(guidePrecisionLaser(shot,target,.025),true);assert.ok(shot.vel[0]>0);assert.ok(Math.abs(Math.hypot(...shot.vel)-12000)<1e-8);
 assert.ok(shot.guidedTurn<=PRECISION_GUIDANCE.turnRate*.025+1e-10);
 for(let i=0;i<100;i++)guidePrecisionLaser(shot,[500,0,-1000],.025);
 assert.ok(shot.guidedTurn<=PRECISION_GUIDANCE.maxTurn+1e-10);
 assert.ok(Math.acos(-shot.vel[2]/12000)<=PRECISION_GUIDANCE.maxTurn+1e-10);
 for(const target of [[1000,0,0],[0,0,500],[0,0,-1500]]){const b={guidance:true,pos:[0,0,0],vel:[0,0,-12000]};assert.equal(guidePrecisionLaser(b,target,.025),false);assert.deepEqual(b.vel,[0,0,-12000])}
});
function fixture(precision=600){
 const a={id:'a',pos:[0,0,0],connected:true},b={id:'b',pos:[80,0,-900],connected:true};
 for(const p of [a,b])makeCombatPlayer(p,{maxHp:10000,hp:10000,attack:10,defense:0,speed:220,droneCount:1,boosters:{precision:p===a?precision:0}});
 return {a,b,s:{status:'active',players:[a,b],simTime:10000,canDamage:(owner,target)=>!target||owner.id!==target.id}};
}
const shot={offset:[0,0,-58],direction:[0,0,-1],kind:'laser'};
test('server grants guidance only to boosted ship lasers with a valid selected target; jamming cancels it',()=>{
 for(const precision of [0,600]){
  const {a,b,s}=fixture(precision),bullets=volley(s,a,{weapon:'laser',targetId:b.id,shots:[shot,{...shot,kind:'drone'}]},10000);
  assert.equal(!!bullets[0].guidance,precision>0);assert.equal(bullets[1].guidance,false);
  if(precision){stepCombat(s,10025);assert.ok(bullets[0].vel[0]>0)}else{stepCombat(s,10025);assert.equal(bullets[0].vel[0],0)}
 }
 {const {a,s}=fixture();const [b]=volley(s,a,{weapon:'laser',shots:[shot]},10000);assert.equal(b.guidance,false);assert.equal(b.target,null)}
 {const {a,b,s}=fixture();b.skillUntil={interference:20000};const [bullet]=volley(s,a,{weapon:'laser',targetId:b.id,shots:[shot]},10000);assert.equal(bullet.target,null);stepCombat(s,10025);assert.equal(bullet.vel[0],0)}
 {const {a,b,s}=fixture();const [bullet]=volley(s,a,{weapon:'laser',targetId:b.id,shots:[shot]},10000);b.skillUntil={interference:20000};stepCombat(s,10025);assert.equal(bullet.target,null);assert.equal(bullet.vel[0],0)}
 {const {a,b,s}=fixture();s.canDamage=(owner,target)=>!target;const [bullet]=volley(s,a,{weapon:'laser',targetId:b.id,shots:[shot]},10000);assert.equal(bullet.target,null)}
});
