import assert from 'node:assert/strict';
import test from 'node:test';
import {snapshotFrames} from '../server/pvp/snapshot-delta.mjs';
import {restoreWorldSnapshot} from '../js/world-snapshot.js';

const player=id=>({id,name:'Pilot '+id,pos:[0,120,0],hp:100,profile:{shipId:'aurora',maxHp:100,maxEnergy:100,attack:500,speed:200,droneCount:8,formation:'wheel',ownedFormations:['wheel','shield'],skills:['shield','fury']},skillUntil:{},death:null});
const world=()=>({type:'world',serverTime:1000,rules:{capacity:24,radius:6000},players:Array.from({length:24},(_,i)=>player('pilot-'+i)),enemies:[{id:'boss',hp:100000,pos:[0,120,2000],targets:[]}],boss:null,events:[],groups:[],invites:[]});
test('delta reconstructs movement, damage, profile changes, removals and reordered entities exactly',()=>{
 const original=world(),first=snapshotFrames(original);let client=JSON.parse(first.full);
 // Mutation must not mutate the saved baseline.
 original.players[0].pos[0]=55;original.players[0].hp=75;original.players[0].profile.attack=600;
 original.players[1].death={id:'death',time:1100};delete original.players[1].skillUntil;
 original.players.splice(2,1);original.players.reverse();original.players.push(player('new'));
 original.enemies[0].targets=['pilot-0'];original.enemies.push({id:'add',hp:100,pos:[10,120,2000]});
 original.serverTime=1100;original.events=[{id:'hit',type:'damage'}];original.groups=[{id:'group',members:['pilot-0','new']}];
 const second=snapshotFrames(original,first.state);assert(second.delta);
 client=restoreWorldSnapshot(JSON.parse(second.delta),client);assert.deepEqual(client,JSON.parse(second.full));
 original.players.find(p=>p.id==='pilot-1').death=null;original.enemies=[];original.events=[];delete original.boss;
 const third=snapshotFrames(original,second.state);client=restoreWorldSnapshot(JSON.parse(third.delta||third.full),client);
 assert.deepEqual(client,JSON.parse(third.full));assert.equal(first.state.players[0].pos[0],0);
});
test('full frames recover after reconnect or object reconstruction and old-server messages pass through',()=>{
 const first=snapshotFrames(world());assert.equal(first.delta,null);
 const message=JSON.parse(first.full);assert.equal(restoreWorldSnapshot(message,null),message);
 assert.throws(()=>restoreWorldSnapshot({type:'worldDelta'},null),/initial/);
 const restarted=snapshotFrames(world());assert.deepEqual(restoreWorldSnapshot(JSON.parse(restarted.full),null),message);
 const ping={type:'pong'};assert.equal(restoreWorldSnapshot(ping,message),ping);
});
test('24 moving players use fewer bytes without losing state',t=>{
 const s=world();let previous,client,fullBytes=0,deltaBytes=0;
 for(let tick=0;tick<100;tick++){
  s.serverTime+=100;for(const p of s.players)p.pos[0]+=5;
  if(tick%10===0)s.players[0].hp--;
  const frames=snapshotFrames(s,previous),wire=frames.delta||frames.full;
  client=restoreWorldSnapshot(JSON.parse(wire),client);assert.deepEqual(client,JSON.parse(frames.full));
  fullBytes+=Buffer.byteLength(frames.full);deltaBytes+=Buffer.byteLength(wire);previous=frames.state;
 }
 t.diagnostic(JSON.stringify({fullBytes,deltaBytes,reductionPercent:Math.round((1-deltaBytes/fullBytes)*100)}));
 assert(deltaBytes<fullBytes*.6);
});
