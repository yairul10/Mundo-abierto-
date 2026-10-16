import assert from 'node:assert/strict';
import {createFarmPilot,farmConfig,nextFarmSector,FARM_MAPS} from '../js/farm-pilot.js';
const pos=(x=0,y=0,z=0)=>({x,y,z});
const enemy=(type,x=900)=>({type,hp:100,dead:0,aggressive:false,mesh:{visible:true,position:pos(x)}});
const state=()=>({pvp:false,active:true,dead:false,paused:false,position:pos(),hp:100,maxHp:100,gold:1000,repairCost:21,robot:false,docked:false,landing:false,base:pos(0,0,200),sector:'aurora',level:40,routes:[{to:'belt',level:10,pos:pos(2000)}],enemies:[],drops:[],safe:()=>false,center:pos(),radius:3000,obstacles:[],attacks:[]});
const setup=(c={})=>{const p=createFarmPilot(c);assert.ok(p.start(40));return p};
assert.equal(farmConfig({map:'pvp',selections:{aurora:['bad','scout']}}).map,'aurora');
assert.deepEqual(farmConfig({selections:{aurora:[]}}).selections.aurora,[]);
assert.ok(!farmConfig().selections.ember.includes('carrier'));assert.ok(!farmConfig().selections.graveyard.includes('granTitan'));
assert.equal(nextFarmSector('graveyard','aurora'),'ember');assert.equal(nextFarmSector('aurora','graveyard'),'belt');assert.equal(nextFarmSector('pvp','aurora'),null);
let p=setup(),s=state();s.enemies=[enemy('granTitan',200),enemy('scout')];let c=p.tick(s,1);assert.equal(c.target.type,'scout');assert.equal(c.fire,true);assert.ok(c.throttle>0);assert.equal(s.gold,1000);assert.equal(s.enemies[1].hp,100);
p.stop();assert.equal(p.tick(s,2).fire,false);assert.equal(p.running,false);
p=setup();s=state();s.active=false;p.tick(s,1);assert.equal(p.running,false);s.active=true;assert.equal(p.tick(s,2).fire,false);
p=setup();s=state();s.pvp=true;p.tick(s,1);assert.equal(p.running,false);assert.equal(p.start(40,true),false);
p=setup({map:'graveyard'});s=state();c=p.tick(s,1);assert.equal(c.fire,false);assert.equal(c.yaw,-Math.PI/2);s.level=1;p.tick(s,2);assert.equal(p.running,false);
p=createFarmPilot({map:'ember'});assert.equal(p.start(10),false);
p=setup();s=state();s.enemies=[enemy('scout')];s.hp=29;c=p.tick(s,1);assert.equal(c.fire,false);assert.equal(c.target,null);s.docked=true;c=p.tick(s,2);assert.equal(c.repair,false);assert.equal(c.launch,false);s.hp=100;assert.equal(p.tick(s,3).launch,true);
p=setup({allowCredits:true});s=state();s.hp=10;s.docked=true;assert.equal(p.tick(s,1).repair,true);s.gold=0;assert.equal(p.tick(s,2).repair,false);
for(const authorized of [false,true]){p=setup({allowCredits:authorized});s=state();s.dead=true;assert.equal(p.tick(s,1).recover,authorized);s.gold=0;assert.equal(p.tick(s,2).recover,true)}
p=setup();s=state();s.paused=true;s.enemies=[enemy('scout')];assert.equal(p.tick(s,1).fire,false);assert.equal(p.tick(s,2).throttle,0);
p=setup();s=state();s.drops=[{sector:'aurora',mesh:{position:pos(150)}}];c=p.tick(s,1);assert.equal(c.fire,false);assert.ok(c.throttle>0);assert.equal(p.status,'Patrullando');
p=setup();s=state();s.enemies=[enemy('scout')];const clear=p.tick(s,1);s.obstacles=[{position:pos(160),radius:50}];c=p.tick(s,2);assert.ok(c.pitch>clear.pitch);assert.equal(c.fire,false);
p=setup({map:'ember',selections:{ember:['carrier']}});s=state();s.sector='ember';s.enemies=[enemy('carrier')];assert.equal(p.tick(s,1).target.type,'carrier');s.enemies[0].dead=1;assert.equal(p.tick(s,1.1).target,null);
for(const m of Object.values(FARM_MAPS))assert.ok(Object.keys(m.enemies).length);
console.log('AUTO: selection, bosses, portals, level gates, manual stop, inactive/PvP, drone-owned collection, avoidance, retreat and explicit credit permission passed.');

assert.equal(farmConfig(null).map,'aurora');
p=setup();s=state();s.enemies=[enemy('scout',1000)];s.drops=[{sector:'aurora',mesh:{position:pos(720)}}];c=p.tick(s,1);assert.equal(c.fire,true);assert.equal(c.target,s.enemies[0]);assert.equal(p.status,'Combate automático');
// Real flight integration converges on portal range without editing position directly.
p=setup({map:'belt'});s=state();let yaw=0,pitch=0;for(let i=0;i<2400;i++){const dt=1/60,c=p.tick(s,i*dt);if(c.yaw!==undefined){yaw+=Math.atan2(Math.sin(c.yaw-yaw),Math.cos(c.yaw-yaw))*dt*3;pitch+=(c.pitch-pitch)*dt*3;}s.position.x+=-Math.sin(yaw)*Math.cos(pitch)*220*c.throttle*dt;s.position.y+=Math.sin(pitch)*220*c.throttle*dt;s.position.z+=-Math.cos(yaw)*Math.cos(pitch)*220*c.throttle*dt;}assert.ok(Math.hypot(s.position.x-2000,s.position.y,s.position.z)<100);

assert.equal(farmConfig({recovery:'invalid'}).recovery,'aurora');
assert.equal(farmConfig({recovery:'current'}).recovery,'current');
for(const gold of [0,999,1000,1001])for(const authorized of [false,true]){
 p=setup({recovery:'current',allowCredits:authorized});s=state();s.dead=true;s.gold=gold;
 c=p.tick(s,1);assert.equal(c.recover,authorized&&gold>=1000);assert.equal(c.recoverCurrent,true);assert.equal(s.gold,gold);
 s.paused=true;assert.equal(p.tick(s,2).recover,undefined);
}
p=setup();s=state();s.enemies=[enemy('scout')];s.abilityReady=true;assert.equal(p.tick(s,1).ability,true);
s.abilityReady=false;assert.equal(p.tick(s,2).ability,false);
s.abilityReady=true;s.hp=20;assert.equal(p.tick(s,3).ability,false);
p=setup();s=state();s.abilityReady=true;assert.equal(p.tick(s,1).ability,false);
