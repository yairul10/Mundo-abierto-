import test from 'node:test';
import assert from 'node:assert/strict';
import {auroraEnemyDamage} from '../js/aurora-enemy-damage.js';

test('Aurora damage is reduced for normal scouts and raiders through level 10',()=>{
 for(const type of ['scout','raider'])for(const level of [1,5,10]){
  const context={sector:'aurora',level,enemy:{type}};
  assert.equal(auroraEnemyDamage(10,context),3);
  assert.equal(auroraEnemyDamage(2,context),.6);
 }
});
test('normal damage applies after level 10 and outside the intended encounter',()=>{
 const base={sector:'aurora',level:10,enemy:{type:'scout'}};
 for(const changes of [{level:11},{sector:'belt'},{pvp:true},{enemy:{type:'sentinel'}},{enemy:{type:'scout',pro:true}},{enemy:{type:'scout',bossAdd:true}},{level:0}]){
  assert.equal(auroraEnemyDamage(10,{...base,...changes}),10);
 }
});
