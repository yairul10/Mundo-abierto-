import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHangar,buyBooster,tickBoosters} from '../js/hangar-systems.js';
import {projectileMultiplier,combatBoosterTimers} from '../js/damage-boosters.js';
import {offlineRoster} from '../js/pvp-loadout.js';
import {makeCombatPlayer,volley,stepCombat} from '../server/pvp/combat.mjs';
const shot={offset:[0,0,0],direction:[0,0,-1]};
test('precision costs 300k for ten minutes, stacks time, survives reload and pauses in menus',()=>{
 const p={gold:600000};normalizeHangar(p);assert.equal(buyBooster(p,'precision'),true);assert.equal(p.gold,300000);assert.equal(p.boosters.precision,600);
 assert.equal(buyBooster(p,'precision'),true);assert.equal(p.boosters.precision,1200);assert.equal(buyBooster(p,'precision'),false);
 const saved=JSON.parse(JSON.stringify(p));normalizeHangar(saved);tickBoosters(saved,20,true);assert.equal(saved.boosters.precision,1200);
 tickBoosters(saved,20,false);assert.equal(saved.boosters.precision,1180);assert.equal(projectileMultiplier(saved.boosters),3);assert.equal(projectileMultiplier(saved.boosters,true),2);
 tickBoosters(saved,1180,false);assert.equal(projectileMultiplier(saved.boosters),1);
 assert.equal(combatBoosterTimers({precision:Infinity}).precision,86400);
 const roster=offlineRoster({...p,shipId:'aurora',ownedShips:{aurora:true},shipBaseStats:{maxHp:100,attack:10,defense:0,speed:220}});assert.equal(roster.profiles.aurora.boosters.precision,1200);
});
test('server triples ship, drone and pet laser speed, doubles bounded missiles and preserves damage',()=>{
 const p={id:'me',pos:[0,0,0],connected:true};makeCombatPlayer(p,{attack:100,droneCount:1,explorerDrone:true,upgrades:{laserSpeed:5},boosters:{precision:600,damage2:300}});
 const s={status:'active',players:[p],bullets:[]};
 const lasers=volley(s,p,{weapon:'laser',shots:[{...shot,kind:'laser'},{...shot,kind:'drone'}]},10000);
 assert.deepEqual(lasers.map(b=>b.speed),[18600,3450]);assert.deepEqual(lasers.map(b=>b.damage),[300,120]);
 assert.equal(volley(s,p,{weapon:'explorer',shots:[shot]},10000)[0].speed,3450);
 const missile=volley(s,p,{weapon:'missile',shots:[{...shot,speed:999999}]},10000)[0];assert.equal(missile.speed,1700);assert.equal(missile.damage,240);
 p.boosterTickAt=10000;p.boostersPaused=true;stepCombat(s,11000);assert.equal(p.profile.boosters.precision,600);
 p.boostersPaused=false;stepCombat(s,12000);assert.equal(p.profile.boosters.precision,599);
 p.profile.boosters.precision=0;assert.equal(volley(s,p,{weapon:'laser',shots:[shot]},13000)[0].speed,6200);
});
