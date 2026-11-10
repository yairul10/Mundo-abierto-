import test from 'node:test';
import assert from 'node:assert/strict';
import {COOP_CORRIDOR,constrainCorridor,zoneOf} from './zones.mjs';
import {ARENA_ENEMIES,ensureArenaEnemies} from './arena-enemies.mjs';
import {canDamage,advance} from './world-rules.mjs';
test('cooperative cylinder bounds preserve the base and forward route',()=>{
 for(const position of [[9999,9999,9999],[-9999,-9999,-99999],[0,120,850]]){constrainCorridor(position);assert(Math.hypot(position[0],position[1]-120)<=1540.0001);assert(position[2]>=-12440&&position[2]<=1140)}
 assert.equal(zoneOf({corridor:true,pos:[0,120,0]}),'base');assert.equal(zoneOf({corridor:true,pos:[0,120,-8000]}),'pve');
 assert.equal(zoneOf({pos:[0,120,-4550]}),'hostile');
});
test('test realm has three Colossi in first 4km, normal layout is unchanged',()=>{
 const testState={realm:'test',players:[]};ensureArenaEnemies(testState,1000);
 const colossi=testState.arenaEnemies.filter(b=>b.kind==='colossusPro');
 assert.equal(colossi.length,3);assert.deepEqual(colossi.map(b=>b.rules.pos[2]),[-1200,-2500,-3800]);
 for(const b of testState.arenaEnemies){assert.equal(b.rules.corridor,true);assert.equal(b.rules.zone,'pve');assert(Math.abs(b.pos[0])<1600)}
 const normal={realm:'normal',players:[]};ensureArenaEnemies(normal,1000);assert.equal(normal.arenaEnemies.length,ARENA_ENEMIES.length);assert.equal(normal.arenaEnemies.find(b=>b.kind==='nexo').rules.zone,'hostile');
});
test('allies cannot damage one another, existing PvP still works',()=>{
 const player=(id,corridor)=>({id,corridor,connected:true,hp:100,pos:[0,120,corridor?-3000:-4500],profile:{},baseInside:false,baseEnteredAt:null});
 const a=player('a',true),b=player('b',true);assert.equal(canDamage(a,b,10000),false);
 assert.equal(canDamage(player('a',false),player('b',false),10000),true);
 const npc={...b,id:'npc',npc:true,rules:{corridor:true,zone:'pve'}};assert.equal(canDamage(a,npc,10000),true);
});

test('different cooperative boss types are separated by over 3 km',()=>{const s={realm:'test',players:[]};ensureArenaEnemies(s,1000);const last=s.arenaEnemies.find(b=>b.id==='pvp-coloso-3'),titan=s.arenaEnemies.find(b=>b.kind==='granTitanPro'),nexo=s.arenaEnemies.find(b=>b.kind==='nexo');assert(last.rules.pos[2]-titan.rules.pos[2]>=3000);assert(titan.rules.pos[2]-nexo.rules.pos[2]>=3000)});
