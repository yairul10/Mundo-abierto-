import assert from 'node:assert/strict';
import {profile,makeCombatPlayer,volley,stepCombat,ability,defenseDamage} from './combat.mjs';

const raw={hp:321,maxHp:1080,energy:200,maxEnergy:275,attack:85,defense:90,speed:190,shipId:'titan',level:36,droneCount:8,explorerDrone:true,repairRobot:true,repairRobotLevel:5,upgrades:{missiles:4},shipSpecializations:{titan:{armor:3,repair:2,fortress:2}}};
assert.equal(profile(raw).hp,321);assert.equal(profile(raw).maxHp,1080);assert.equal(profile(raw).attack,85);assert.equal(profile(raw).defense,90);assert.equal(profile(raw).missiles,5);
const a={id:'a',pos:[0,0,400],connected:true,hp:0},b={id:'b',pos:[0,0,-400],connected:true,hp:0};makeCombatPlayer(a,raw);makeCombatPlayer(b,{...raw,shipId:'aurora',maxHp:900,hp:800,defense:0,repairRobot:false});
const s={status:'active',players:[a,b],simTime:10000},shot={offset:[0,0,-58],direction:[0,0,-1],kind:'laser'};assert.equal(volley(s,a,{weapon:'laser',shots:[shot,shot]},10000).length,2);assert.equal(volley(s,a,{weapon:'laser',shots:[shot]},10100),null);for(let t=10050;t<=10800;t+=50)stepCombat(s,t);assert.equal(b.hp,715);
assert.equal(volley(s,a,{weapon:'missile',shots:Array(6).fill({...shot,speed:650,delay:.5,locked:true})},11000),null);assert.equal(volley(s,a,{weapon:'laser',shots:[{...shot,offset:[999,0,0]}]},11000),null);
assert(Math.abs(defenseDamage(a,100,12000,()=>1)-(100-22.5)*.87)<1e-10);const energyBefore=a.energy;assert(ability(a,12000));assert.equal(a.energy,energyBefore-55);assert(!ability(a,12100));assert(Math.abs(defenseDamage(a,100,12100,()=>1)-(100-22.5)*.87*.3)<1e-10);
a.abilityUntil=0;a.hp=300;a.lastHit=a.lastIncoming=a.lastAttack=15000;a.firing=false;s.simTime=15000;stepCombat(s,15050);assert.equal(a.hp,300);s.simTime=17500;stepCombat(s,17600);assert.equal(a.hp,305.4);
console.log('PASS: importa vida/daño/defensa/mejoras, doble láser, daño validado, cadencia, misiles, Titan y robot.');
