import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
test('portal countdown participates in the normal enemy safe-zone decision',()=>{
 const line=source.match(/const playerSafe=([^;]+);updateDock\(\);/);assert.ok(line);
 const safe=new Function('updateZone','portalTransitProtected','return '+line[1]);
 assert.equal(safe(()=>false,()=>true),true);assert.equal(safe(()=>false,()=>false),false);assert.equal(safe(()=>true,()=>false),true);
});
test('ordinary, carrier and Titan launchers return before creating attacks during transit',()=>{
 for(const [name,end] of [['enemyFire(e)','// Misil visual detallado'],['fireCarrierMissile()','function updateEnemyShots'],['fireTitan()','function updateGranTitan']]){
  const start=source.indexOf('function '+name+'{');assert.ok(start>=0);
  const body=source.slice(start,source.indexOf(end,start));
  const run=new Function('portalTransitProtected',body+';return '+name.split('(')[0]);
  assert.doesNotThrow(()=>run(()=>true)({type:'scout'}));
 }
});
test('an already charging Acechador cancels its aim and disposes the marker during countdown',()=>{
 const body=source.slice(source.indexOf('function updateEnemyShots(dt){'),source.indexOf('const shots=[];'));
 let removed=0,disposed=0;const enemy={type:'stalker',dead:false,mesh:{visible:true},aiming:{time:.01,line:{geometry:{dispose(){disposed++}},material:{dispose(){disposed++}}}}};
 const run=new Function('enemies','portalTransitProtected','scene',`const enemyShots=[],activeSector='graveyard',docked=false,landing=false,playerMesh={position:{}},inSafeZone=()=>false;${body};return updateEnemyShots`)([enemy],()=>true,{remove(){removed++}});
 run(.04);assert.equal(enemy.aiming,null);assert.equal(removed,1);assert.equal(disposed,2);
});
test('Titan availability and attack cycle stop at the portal',()=>{
 const start=source.indexOf('function updateGranTitan(dt){'),code=source.slice(start,source.indexOf('function damageEnemy',start));
 const available=code.match(/const available=([^;]+);/)[1],active=code.match(/const active=([^;]+);/)[1];
 const evaluate=new Function('portalTransitProtected',`const titanEnemy={aggressive:true,mesh:{visible:true,position:{}}},docked=false,landing=false,inSafeZone=()=>false,playerMesh={position:{distanceTo:()=>500}},COMBAT_RANGE=1200;return [${available},${active}];`);
 assert.deepEqual(evaluate(()=>true),[false,false]);assert.deepEqual(evaluate(()=>false),[true,true]);
});
