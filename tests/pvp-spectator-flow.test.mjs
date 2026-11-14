import test from 'node:test';
import assert from 'node:assert/strict';
import {spectatorPilots,spectatorPilot,nextSpectatorPilot,arenaDeathMessage} from '../js/pvp-spectator.js';
const me={id:'me',hp:0,team:'a'},ally={id:'ally',hp:10,team:'a'},rival={id:'rival',hp:10,team:'b'};
test('eliminated team players follow living allies, switch targets and keep observing when their team falls',()=>{
 const second={id:'second',hp:20,team:'a'},state={match:{status:'active'},players:[me,ally,second,rival]};
 assert.equal(spectatorPilot(state,me,null).id,'ally');assert.equal(nextSpectatorPilot(state,me,'ally'),'second');assert.equal(nextSpectatorPilot(state,me,'ally',-1),'second');
 state.players=[me,rival];assert.equal(spectatorPilot(state,me,'ally').id,'rival');
 state.match.status='finished';assert.equal(spectatorPilot(state,me,'rival'),null);
});
test('Arena20 spectators can follow every surviving opponent and automatically replace a destroyed target',()=>{
 const state={match:{status:'active',freeForAll:true},players:[me,ally,rival]};
 assert.equal(spectatorPilots(state,me).length,2);assert.equal(spectatorPilot(state,me,'rival').id,'rival');
 state.players=[me,ally,{...rival,hp:0}];assert.equal(spectatorPilot(state,me,'rival').id,'ally');
 assert.equal(spectatorPilot(state,{...me,hp:1},null),null);
 assert.doesNotMatch(arenaDeathMessage(state.match),/La partida terminó/);assert.match(arenaDeathMessage({status:'finished'}),/La partida terminó/);
});
