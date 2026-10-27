import test from 'node:test';import assert from 'node:assert/strict';
import {equip,importRoster,applyHangarLoadout,attack,advance} from '../server/pvp/world-rules.mjs';
import {awardKill} from '../server/pvp/pvp-results.mjs';
import {recordArenaDamage,ensureArenaEnemies,advanceArenaEnemies} from '../server/pvp/arena-enemies.mjs';
import {pvpMultipliers} from '../js/pvp-loadout.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
import {canAssembleShip,assembleShip} from '../js/assembled-ships.js';
const raw={aurora:{maxHp:500,attack:50,defense:25,speed:110,maxEnergy:500,level:100},adminpod:{maxHp:99999,attack:99999,speed:4999}};
function pilot(id,admin=false){const p={id,name:id,connected:true,clientVersion:4,adminShipAllowed:admin,pos:[4100,120,0],roster:importRoster(raw)};equip(p,'aurora');return p}
test('admin ship is capability gated and derives exact stats from Aurora, ignoring forged admin stats',()=>{
 const denied=pilot('denied');assert.equal(equip(denied,'adminpod'),false);assert.equal(denied.profile.shipId,'aurora');
 const admin=pilot('admin',true);assert(equip(admin,'adminpod'));assert.equal(admin.profile.maxHp,300000);assert.equal(admin.profile.attack,160);assert.equal(admin.profile.speed,374);assert.equal(admin.profile.defense,50);assert.equal(admin.profile.shipId,'adminpod');
 admin.clientVersion=3;assert.equal(equip(admin,'adminpod'),false);admin.clientVersion=4;admin.pos=[0,120,0];admin.hangar=true;assert.equal(applyHangarLoadout({invites:[]},admin,raw,'adminpod'),null);assert.equal(admin.profile.maxHp,300000,'Loadout refresh does not compound hull');
 assert.deepEqual(pvpMultipliers('adminpod'),{hp:15,attack:1.6,defense:1,speed:1.7});
});
test('admin combat earns no player results, farmed-admin results or boss contribution',()=>{
 const admin=pilot('admin',true),other=pilot('other');equip(admin,'adminpod');const s={players:[admin,other],events:[],simTime:100000};assert.equal(awardKill(s,admin,other,100000,'admin-kill'),null);assert.equal(awardKill(s,other,admin,100000,'farm-admin'),null);
 ensureArenaEnemies(s,100000);recordArenaDamage(s,s.boss,admin,1000,100000);assert.deepEqual(s.boss.contributions,{});
 other.pos=[4200,120,0];const bullets=attack(s,admin,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},100000);assert(bullets[0].noRewards);equip(admin,'aurora');other.hp=1;advance(s,100100);assert(other.death);assert.equal(s.pendingKills?.length||0,0,'In-flight admin shot remains unrewarded after changing ship');
});
test('admin selection never changes permanent offline ship or grants free ownership',()=>{
 const original={shipId:'aurora',ownedShips:{aurora:true},shipBaseStats:{maxHp:1000,attack:100,defense:50,speed:220},maxHp:1000,hp:900,maxEnergy:500,gold:123,level:100,loot:{}};
 const editor=createHangarEditor(original);editor.ownedShips.adminpod=true;editor.shipId='adminpod';editor.maxHp=15000;editor.hp=15000;const saved=serializeHangarEditor(editor,original);assert.equal(saved.shipId,'aurora');assert.equal(saved.maxHp,1000);assert.equal(saved.gold,123);assert.equal(saved.ownedShips.adminpod,undefined);assert.equal(original.hp,900);
 assert.equal(canAssembleShip(editor,'adminpod','pvp'),false);assert.equal(assembleShip(editor,'adminpod','pvp'),false);
});

test('equipping admin ship suppresses pending boss and first-attacker escort rewards at defeat',()=>{
 const admin=pilot('admin',true),s={players:[admin],events:[],simTime:100000};ensureArenaEnemies(s,100000);const boss=s.arenaEnemies.find(e=>e.kind==='colossusPro');recordArenaDamage(s,boss,admin,1,100000);boss.hp=boss.maxHp*.69;advanceArenaEnemies(s,100100,()=>true,()=>.1);const add=s.arenaEnemies.find(e=>e.parentId===boss.id);recordArenaDamage(s,add,admin,1,100100);add.hp--;equip(admin,'adminpod');add.hp=0;boss.hp=0;advanceArenaEnemies(s,100200,()=>true,()=>.1);assert.equal(s.bossRewards.filter(r=>r.playerId===admin.id).length,0);
});
