import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldUseCoopAbility,coopRepeatChoice,coopStopReached} from '../js/coop-auto-policy.js';
test('automatic ship abilities respect cooldown, active effects, safety and the enabled switch',()=>{
 const fighting={enabled:true,canFight:true,engaged:true};
 assert.equal(shouldUseCoopAbility(fighting),true);
 for(const patch of [{remaining:1},{active:1},{safe:true},{canFight:false},{enabled:false},{engaged:false}])assert.equal(shouldUseCoopAbility({...fighting,...patch}),false);
 assert.equal(shouldUseCoopAbility({canFight:true,retreating:true}),true);
 assert.equal(shouldUseCoopAbility({canFight:true,paralyzed:true}),true);
 assert.equal(shouldUseCoopAbility({canFight:true}),false);
});
test('common destinations sanitize stop and room codes, and private repetitions remain new rooms',()=>{
 assert.deepEqual(coopRepeatChoice({roomType:'common',roomCode:'ABCDEF',stop:'colossi'}),{action:'common',excludeCode:'ABCDEF',autoStop:'colossi'});
 assert.deepEqual(coopRepeatChoice({roomType:'common',roomCode:'invalid',stop:'invalid'}),{action:'common',autoStop:'all'});
 assert.deepEqual(coopRepeatChoice({roomType:'private',roomCode:'ABCDEF'}),{action:'create'});
});
