import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pveRecoveryCost,settlePveRecovery} from '../js/pve-recovery.js';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const show=source.slice(source.indexOf('function showRecovery(){'),source.indexOf('let recoveryBusy=false;'));
test('Aurora button re-enables at every death after previous recovery disabled it',()=>{
 for(const gold of [476,99,0,1000]){
  const nodes=Object.fromEntries(['recoverCurrent','recoverAurora','recoveryBalance','recoveryHelp'].map(id=>[id,{disabled:true}]));
  const style=()=>({style:{}}),player={gold};let saves=0;
  const draw=new Function('$','player','pveRecoveryCost','combatAudio','resetDockControls','clearCombatShots','playerDestructionBurst','repairRobot','repairBeam','lockFrame','sectorNotice','portalMessage','currentStationName','save',
   'let PVP_MODE=false,recoveryPending=false,explorerThreat=null,portalCountdown=0;'+show+';return ()=>{recoveryPending=false;showRecovery()}');
  const showDeath=draw(id=>nodes[id],player,pveRecoveryCost,{play(){}},()=>{},()=>{},()=>{},{},{},{classList:{add(){}}},style(),style(),()=> 'Estación Recuperación',()=>saves++);
  for(let death=0;death<3;death++){
   nodes.recoverAurora.disabled=true;showDeath();assert.equal(nodes.recoverAurora.disabled,false);
   assert.equal(nodes.recoverCurrent.disabled,gold<1000);
   assert.match(nodes.recoverAurora.textContent,new RegExp(pveRecoveryCost(false,gold)+' créditos'));
  }
  assert.equal(saves,3);
 }
});
test('476 credits rescue to Aurora costs 100; emergency rescue never creates negative balance',()=>{
 for(const gold of [476,99,0]){
  let raw=JSON.stringify({gold,hp:0,maxHp:788,energy:0,maxEnergy:100,shipId:'titan',loot:{nucleoNexo:2}});
  const result=settlePveRecovery({getItem:()=>raw,setItem:(_,v)=>raw=v},'save',{current:false,sector:'graveyard',arrival:{x:0,y:0,z:0}});
  assert.equal(result.gold,Math.max(0,gold-100));assert.equal(result.hp,788);assert.equal(result.sector,'aurora');assert.equal(result.loot.nucleoNexo,2);
 }
});
