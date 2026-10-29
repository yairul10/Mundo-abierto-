import test from 'node:test';
import assert from 'node:assert/strict';
import {settlePveRecovery,pveRecoveryCost} from '../js/pve-recovery.js';
const make=(gold=2000)=>{let raw=JSON.stringify({gold,hp:0,maxHp:4283,energy:0,maxEnergy:955,shipId:'obsidian',sector:'graveyard',loot:{core:7}});return {getItem:()=>raw,setItem:(_,v)=>raw=v}};
for(const sector of ['aurora','belt','ember','graveyard'])test('Offline recovery in '+sector,()=>{
 const s=make(),p=settlePveRecovery(s,'save',{current:true,sector,arrival:{x:1,y:2,z:3}});
 assert.equal(p.sector,sector);assert.equal(p.gold,1000);assert.equal(p.hp,4283);assert.equal(p.energy,955);assert.equal(p.shipId,'obsidian');assert.deepEqual(p.loot,{core:7});assert.equal(p.pendingPvpTransfer,undefined);assert.equal(JSON.parse(s.getItem()).hp,4283);
});
test('Aurora rescue charges 100 or available balance',()=>{for(const gold of [2000,99,0]){const p=settlePveRecovery(make(gold),'save',{current:false,sector:'graveyard',arrival:{x:0,y:1,z:2}});assert.equal(p.gold,gold-pveRecoveryCost(false,gold));assert.equal(p.sector,'aurora')}});
test('Insufficient current-map credits leave save intact',()=>{const s=make(999),before=s.getItem();assert.throws(()=>settlePveRecovery(s,'save',{current:true,sector:'graveyard',arrival:{x:1,y:2,z:3}}));assert.equal(s.getItem(),before)});
test('Storage failure does not return a revived pilot',()=>{const s=make();s.setItem=()=>{throw Error('quota')};assert.throws(()=>settlePveRecovery(s,'save',{current:true,sector:'graveyard',arrival:{x:1,y:2,z:3}}),/quota/)});

// Exercise the actual game dispatcher with decisions from the real pilot.
import {readFileSync} from 'node:fs';
import {createFarmPilot} from '../js/farm-pilot.js';
test('AUTO passes its configured recovery destination to the game',()=>{
 const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
 const block=source.match(/if\(command\.recover\)\{showRecovery\(\);recoverShip\([^)]*\)\}/)?.[0];
 assert.ok(block,'Game recovery dispatcher exists');
 const dispatch=new Function('command','showRecovery','recoverShip',block);
 for(const recovery of ['current','aurora'])for(const gold of [0,999,1000,2000])for(const allowCredits of [false,true]){
  const pilot=createFarmPilot({map:'graveyard',recovery,allowCredits});pilot.start(172);
  const command=pilot.tick({pvp:false,active:true,dead:true,paused:false,gold},1);
  let shown=0,result=null;const storage=make(gold);
  dispatch(command,()=>shown++,current=>{result=settlePveRecovery(storage,'save',{current,sector:'graveyard',arrival:{x:1,y:2,z:3}})});
  assert.equal(shown,command.recover?1:0);
  if(command.recover){assert.equal(result.sector,recovery==='current'?'graveyard':'aurora');assert.equal(result.gold,gold-pveRecoveryCost(recovery==='current',gold))}
  else assert.equal(result,null);
 }
});
