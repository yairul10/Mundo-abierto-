import assert from 'node:assert/strict';
import {createInputHistory} from '../js/pvp-input-history.js';
import {movementDuration} from '../server/pvp/movement-time.mjs';
const h=createInputHistory(),server={lastInput:0,movementCredit:.15},speed=620;
let local=[0,0,0],position=[0,0,0],seq=0,packets=[],snapshots=[],checks=0;
for(let frame=1;frame<=300;frame++){
 const now=frame*1000/60,move=frame<100?[0,0,-1]:frame<200?[1,0,0]:[0,0,0];
 h.frame(move,1/60);local=local.map((v,i)=>v+move[i]*speed/60);
 if(frame%3===0)packets.push({...h.packet(++seq),arrival:Math.ceil(now/500)*500+100});
 while(packets.length&&packets[0].arrival<=now){
  const m=packets.shift(),dt=movementDuration(server,m,m.arrival);position=position.map((v,i)=>v+m.move[i]*speed*dt);
  snapshots.push({seq:m.seq,pos:[...position],arrival:m.arrival+350});
 }
 while(snapshots.length&&snapshots[0].arrival<=now){
  const s=snapshots.shift();h.acknowledge(s.seq);const predicted=[...s.pos];
  for(const input of h.pending())for(let i=0;i<3;i++)predicted[i]+=input.move[i]*speed*input.dt;
  assert(Math.hypot(...predicted.map((v,i)=>v-local[i]))<1e-7,'Prediction retains every unacknowledged and unsent frame during 500ms network bursts');checks++;
 }
}
assert(checks>50);h.reset();assert.deepEqual(h.pending(),[],'Respawn/reconnect discards old movement');
const abusive={lastInput:0,movementCredit:.15};let granted=0;for(let i=0;i<100;i++)granted+=movementDuration(abusive,{dt:1000},100);
assert(granted<=.250001,'Burst cannot grant more than elapsed time plus initial credit');
assert.equal(movementDuration({lastInput:0},{},400),.15,'Older clients still supported');
assert.equal(movementDuration({lastInput:0},{dt:-1},100),0);
console.log('PASS: delayed/bunched movement, turns, stops, unsent frames, reset, legacy APK and server time budget');
