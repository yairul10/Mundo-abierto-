import assert from 'node:assert/strict';
import {createMovementPrediction,correctionStep} from '../js/pvp-prediction.js';
// A 1.2 second round trip exceeds the former 12-packet history window.
const h=createMovementPrediction();let pos=[0,0,0],seq=0,packets=[],checks=0;
for(let frame=1;frame<=240;frame++){
 const move=frame<80?[0,0,-1]:frame<160?[1,0,0]:[0,0,0],speed=frame<120?620:480,dt=1/60;
 h.frame(move,speed*dt);pos=pos.map((v,i)=>v+move[i]*speed*dt);
 if(frame%3===0){h.sent(++seq);packets.push({seq,pos:[...pos],arrival:frame+72})}
 while(packets.length&&packets[0].arrival<=frame){const p=packets.shift(),a=h.acknowledge(p.seq,p.pos);assert(a.fresh);const predicted=p.pos.map((v,i)=>v+a.offset[i]);assert(Math.hypot(...predicted.map((v,i)=>v-pos[i]))<1e-7,'Replay preserves delayed movement, turns, stops and speed changes');
  for(let i=0;i<20;i++)assert.equal(h.acknowledge(p.seq,p.pos).fresh,false,'Other pilots cannot trigger duplicate corrections');checks++;
 }
}
assert(checks>40);
function correct(fps){let error=[-400,0,0],total=0;for(let i=0;i<fps;i++){const step=correctionStep(error,220,1/fps);assert(Math.hypot(...step)<=220/fps*.35+1e-9,'Correction cannot reverse full-throttle travel');total-=step[0];error=error.map((v,j)=>v-step[j])}return total}
assert(Math.abs(correct(30)-correct(60))<1e-7,'Smoothing depends on elapsed time rather than snapshot or frame count');
h.reset(100);assert.deepEqual(h.acknowledge(100,[0,0,0]).offset,[0,0,0]);assert.equal(h.acknowledge(50,[0,0,0]).fresh,false,'Old pre-respawn acknowledgements do not teleport the pilot');
console.log('PASS: 1.2s latency, unsent frames, turns, speed changes, 20 duplicate broadcasts, bounded smooth corrections, respawn');
