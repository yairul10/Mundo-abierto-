import test from 'node:test';
import assert from 'node:assert/strict';
import {missileLaunches} from '../js/missile-launch.js';
import {enterPvp,advancePvp,pvpMessage,pvpSnapshot} from '../server/pvp/pvp-match.mjs';
const fixed=()=>.5;
test('player and bot missile fans share bounded offsets, speeds and guidance delays',()=>{
 const launches=missileLaunches([0,120,0],[0,0,-1],[0,120,-1000],11,fixed);
 assert.equal(launches.length,11);const headings=new Set();
 for(const l of launches){assert.ok(Math.hypot(...l.offset)<500);assert.ok(Math.abs(Math.hypot(...l.direction)-1)<1e-12);assert.ok(l.speed>=440&&l.speed<=850);assert.ok(l.delay>=.42&&l.delay<=1.22);headings.add(l.direction.map(v=>v.toFixed(5)).join(','));}
 assert.equal(headings.size,11);assert.ok(launches.some(l=>Math.abs(l.direction[0])>.3));assert.equal(launches[0].speed,645);assert.ok(Math.abs(launches[0].delay-.82)<1e-12);
});
async function fixture(bot=true){const s={players:[],events:[],duels:[],invites:[]},world={ctx:{storage:{setAlarm:async()=>{}},getWebSockets:()=>[]},worldSave(){},worldBroadcast(){},startSimulation(){}},ws={send(){}};
 const body={accountId:'human',clientVersion:5,realm:'normal',pvpRoom:{code:'ABCDEF',visibility:bot?'practice':'private',bot},shipId:'obsidian',roster:{obsidian:{maxHp:1000,attack:100,defense:0,speed:220,maxEnergy:100}}};
 await enterPvp(world,s,body,'human',10000);s.players[0].connected=true;if(!bot){await enterPvp(world,s,{...body,accountId:'other'},'other',10000);s.players[1].connected=true;s.players[1].ready=true}
 await pvpMessage(world,s,s.players[0],{type:'ready',ready:true},ws,10000);return {s,world,ws,human:s.players[0]};
}
test('a practice window freezes the countdown and resumes with the remaining preparation time',async()=>{
 const {s,world,ws,human}=await fixture();assert.equal(s.pvpMatch.startsAt,13000);
 await pvpMessage(world,s,human,{type:'practicePause',paused:true},ws,11000);advancePvp(s,21000);
 assert.equal(s.pvpMatch.status,'countdown');assert.equal(s.pvpMatch.startsAt,23000);assert.equal(pvpSnapshot(s,21000).match.pauseReason,'window');
 await pvpMessage(world,s,human,{type:'practicePause',paused:false},ws,21000);advancePvp(s,22999);assert.equal(s.pvpMatch.status,'countdown');advancePvp(s,23000);assert.equal(s.pvpMatch.status,'active');
});
test('practice pauses shots and damage without a burst of accumulated simulation on resume',async()=>{
 const {s,world,ws,human}=await fixture();advancePvp(s,13000);
 human.skillUntil={instantShield:16000};human.skillReadyAt={instantShield:43000};human.last_missile=13000;
 s.bullets=[{id:'pending',owner:s.players[1].id,pos:[0,120,600],vel:[0,0,4000],life:1,range:1200,damage:100,age:0,travelled:0}];
 await pvpMessage(world,s,human,{type:'practicePause',paused:true},ws,13100);const before=JSON.stringify(s.bullets),hp=human.hp,deadline=s.pvpMatch.deadline;
 advancePvp(s,23100);assert.equal(JSON.stringify(s.bullets),before);assert.equal(human.hp,hp);assert.equal(s.pvpMatch.deadline,deadline+10000);assert.equal(human.skillUntil.instantShield,26000);assert.equal(human.skillReadyAt.instantShield,53000);assert.equal(human.last_missile,23000);
 await pvpMessage(world,s,human,{type:'practicePause',paused:false},ws,23100);assert.equal(JSON.stringify(s.bullets),before);assert.equal(human.hp,hp);assert.equal(s.pvpMatch.paused,false);
});
test('window pause cannot freeze a match against another player',async()=>{
 const {s,world,ws,human}=await fixture(false);advancePvp(s,13000);await pvpMessage(world,s,human,{type:'practicePause',paused:true},ws,13100);assert.equal(human.practicePaused,undefined);assert.equal(s.pvpMatch.paused,false);
});
