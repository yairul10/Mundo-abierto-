import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {COOP_STOPS,coopStopReached} from '../js/coop-auto-policy.js';
import {ROOM_CODE,roomName} from '../server/pvp/expedition.mjs';
function loadClass(path,name,extra={}){
 const code=readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export /gm,'');
 return vm.runInNewContext(code+'\n'+name,{DurableObject:class{},ROOM_CODE,roomName,COOP_STOPS,coopStopReached,...extra});
}
const Lobby=loadClass('../server/pvp/coop-lobby.mjs','CoopLobby');
const World=loadClass('../server/pvp/shared-world.mjs','SharedWorld');
function lobbyFixture(rows,completed=[]){
 const entered=[],checked=[],roomMap=new Map(rows.map(r=>[r.code,r])),writes=[];
 const lobby=Object.create(Lobby.prototype);
 lobby.ctx={storage:{sql:{exec(sql,...args){writes.push({sql,args});return {toArray:()=>[]}}}}};
 lobby.chooseRoom=(action,code,attempted)=>rows.find(r=>!attempted.has(r.code))||{code:'NEWWWW',visibility:'common'};
 lobby.pendingRooms=async()=>[];
 lobby.env={ROOMS:{getByName(name){const code=name.slice(-6);return{
  async autoStopReached(stop){checked.push({code,stop});return completed.includes(code)},
  async enter(body){entered.push(code);return {playerId:body.accountId}}
 }}}};
 return {lobby,entered,checked,writes,roomMap};
}
test('auto common routing skips the previous room and completed checkpoints, without closing their rooms',async()=>{
 const rows=[{code:'ABCDEF',visibility:'common'},{code:'BCDEFG',visibility:'common'},{code:'CDEFGH',visibility:'common'}];
 const f=lobbyFixture(rows,['BCDEFG']);
 const result=await f.lobby.enterRoom({accountId:'pilot',coop:{action:'common',excludeCode:'ABCDEF',autoStop:'colossi'}});
 assert.equal(result.room.code,'CDEFGH');assert.deepEqual(f.entered,['CDEFGH']);
 assert.deepEqual(f.checked,[{code:'BCDEFG',stop:'colossi'},{code:'CDEFGH',stop:'colossi'}]);
 assert.equal(f.writes.some(w=>w.sql.includes('closed=1')),false);
});
test('auto common routing creates another common when existing rooms are unsuitable',async()=>{
 const f=lobbyFixture([{code:'ABCDEF',visibility:'common'}],['ABCDEF']);
 const result=await f.lobby.enterRoom({accountId:'pilot',coop:{action:'common',autoStop:'inferno'}});
 assert.equal(result.room.code,'NEWWWW');assert.equal(result.room.visibility,'common');assert.deepEqual(f.entered,['NEWWWW']);
});
test('ordinary common joins retain existing behavior without auto checkpoint queries',async()=>{
 const f=lobbyFixture([{code:'ABCDEF',visibility:'common'}],['ABCDEF']);
 const result=await f.lobby.enterRoom({accountId:'pilot',coop:{action:'common'}});
 assert.equal(result.room.code,'ABCDEF');assert.deepEqual(f.checked,[]);
});
test('the room RPC checks authoritative progress without resetting enemies, players or lives',()=>{
 const world=Object.create(World.prototype),state={room:{status:'active'},arenaEnemies:['pvp-coloso-1','pvp-coloso-2','pvp-coloso-3'].map(id=>({id,hp:0})),players:[{coopDeaths:1}]};
 world.worldLoad=()=>state;const before=JSON.stringify(state);
 assert.equal(world.autoStopReached('colossi'),true);assert.equal(world.autoStopReached('inferno'),false);assert.equal(world.autoStopReached('all'),false);
 assert.equal(JSON.stringify(state),before);
 state.room.status='completed';assert.equal(world.autoStopReached('all'),true);
});
