import assert from 'node:assert/strict';
import {makeCombatPlayer,volley,stepCombat} from '../server/pvp/combat.mjs';
const length=v=>Math.hypot(...v),direction=(from,to)=>{const v=to.map((x,i)=>x-from[i]),n=length(v);return v.map(x=>x/n)};
function run({origin=[120,40,0],aim=true,level=0,weapon='laser',invalid}={}){
 const pilot={id:'pilot',pos:[0,0,0],connected:true};makeCombatPlayer(pilot,{maxHp:100,attack:100,defense:0,speed:500,droneCount:1,explorerDrone:true,upgrades:{laserSpeed:level}});
 const npc={id:'titan-reinforcement',pos:[0,0,-800],connected:true,npc:true,kind:'reinforcement',hp:100,hitRadius:35};
 const offset=[26,0,-58],start=origin.map((x,i)=>x+offset[i]),shot={offset,direction:direction(start,npc.pos)};
 if(aim)shot.aimPoint=[...npc.pos];
 if(invalid==='point')shot.aimPoint=[800,0,-800];
 if(invalid==='nan')shot.aimPoint=[NaN,0,0];
 if(invalid==='offset')shot.offset=[1000,0,0];
 const state={status:'active',players:[pilot,npc],simTime:10000},message={weapon,origin,targetId:npc.id,shots:[shot]};
 const bullets=volley(state,pilot,message,10000);
 const spawn=bullets?.[0]?.pos.slice();
 for(let t=10025;t<=11000;t+=25)stepCombat(state,t);
 return {hp:npc.hp,bullets,spawn};
}
assert.equal(run({aim:false}).hp,100,'reproduces visible aim missing when moving with predicted origin');
assert.equal(run({aim:false,origin:[0,0,0]}).hp,50,'old protocol hits while stationary');
for(const origin of [[120,40,0],[-120,0,0],[0,120,0],[0,0,120]])for(const level of [0,5]){
 const result=run({origin,level});assert.equal(result.hp,50,'moving player hits small Titan add');assert.deepEqual(result.spawn,[26,0,-58],'server muzzle never trusts predicted origin');
}
assert.equal(run({weapon:'explorer'}).hp,80,'explorer uses reconciled aim');
for(const invalid of ['point','nan','offset'])assert.equal(run({invalid}).bullets,null);
assert.equal(run({origin:[2000,0,0]}).bullets,null,'reject unbounded predicted movement');
assert.equal(run({origin:[0,0,0]}).hp,50,'new stationary ray unchanged');
console.log('PvP movement: reproduces old moving miss/stationary hit; corrected lateral, vertical and forward movement, both laser speeds, explorer and origin/aim validation.');
