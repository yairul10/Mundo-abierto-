import test from 'node:test';
import assert from 'node:assert/strict';
import {enterPvp,advancePvp,pvpSnapshot,pvpMessage} from '../server/pvp/pvp-match.mjs';
const body=id=>({accountId:id,clientVersion:5,realm:'normal',name:id,shipId:'aurora',pvpRoom:{code:'ABCDEF',visibility:'private'},roster:{aurora:{maxHp:1000,attack:100,defense:0,speed:220,maxEnergy:100}}});
async function fixture(){const s={players:[],events:[],duels:[],invites:[]},ws={send(){},close(){}},world={ctx:{storage:{setAlarm:async()=>{}},getWebSockets:()=>[]},worldSave(){},worldBroadcast(){},startSimulation(){}};await enterPvp(world,s,body('a'),'a',10000);await enterPvp(world,s,body('b'),'b',10000);for(const p of s.players)p.connected=true;return {s,world,ws}}
async function start(f){for(const p of f.s.players)await pvpMessage(f.world,f.s,p,{type:'ready',ready:true},f.ws,10000);assert.equal(f.s.pvpMatch.status,'countdown');advancePvp(f.s,13000);assert.equal(f.s.pvpMatch.status,'active')}
test('two-player capacity, preparation and countdown reject premature shots and freeze equipment',async()=>{
 const f=await fixture(),{s,world,ws}=f;assert.equal((await enterPvp(world,s,body('c'),'c',10000)).error,'world_full');
 await pvpMessage(world,s,s.players[0],{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},ws,10000);assert.equal(s.bullets.length,0);
 await pvpMessage(world,s,s.players[0],{type:'skills',skills:['fury','paralyze']},ws,10000);assert.deepEqual(s.players[0].equippedSkills,['fury','paralyze']);
 await start(f);await pvpMessage(world,s,s.players[0],{type:'skills',skills:['luck','transfer']},ws,13000);assert.deepEqual(s.players[0].equippedSkills,['fury','paralyze']);
 assert.equal((await enterPvp(world,s,body('c'),'c',13000)).error,'match_started');assert.equal(pvpSnapshot(s,13000).rules.pvpSkills,true);assert.equal(s.cooperative,false);assert.deepEqual(s.arenaEnemies,[]);
});
test('authoritative projectiles finish a 1v1 without NPC rewards or paid recovery',async()=>{
 const f=await fixture();await start(f);const {s,world,ws}=f,a=s.players[0],b=s.players[1];a.pos=[0,120,100];b.pos=[0,120,0];a.profile.attack=100000;
 await pvpMessage(world,s,a,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},ws,13100);advancePvp(s,13200);
 assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.winner,'a');assert.equal(b.hp,0);assert.equal(b.death,undefined);assert.equal(s.bossRewards,undefined);assert.equal(s.pendingKills,undefined);
 const result=JSON.stringify(s.pvpMatch);advancePvp(s,14000);assert.equal(JSON.stringify(s.pvpMatch).replace(/"tickAt":\d+/,''),result.replace(/"tickAt":\d+/,''));
});
test('reconnection preserves hull, cooldowns and match state; disconnect expires with a single result',async()=>{
 const f=await fixture();await start(f);const {s,world}=f,a=s.players[0],b=s.players[1];a.hp=900;a.skillReadyAt={fury:40000};a.connected=false;a.lastSeen=13000;
 advancePvp(s,14000);assert.equal(s.pvpMatch.paused,true);assert.equal(a.hp,900);
 const ticket=await enterPvp(world,s,body('a'),'a',15000);assert.ok(ticket.token);assert.equal(a.hp,900);assert.equal(a.skillReadyAt.fury,40000);a.connected=true;advancePvp(s,15000);assert.equal(s.pvpMatch.paused,false);
 a.connected=false;a.lastSeen=15000;advancePvp(s,35000);assert.equal(s.pvpMatch.winner,b.id);assert.equal(s.pvpMatch.reason,'disconnect');
});
test('paralysis, skills cooldowns and arena boundaries are controlled by the server',async()=>{
 const f=await fixture();await start(f);const {s,world,ws}=f,a=s.players[0],b=s.players[1];a.equippedSkills=['paralyze','fury'];a.pos=[0,120,0];b.pos=[0,120,-100];
 await pvpMessage(world,s,a,{type:'pvpSkill',skill:'paralyze',targetId:b.id},ws,13100);assert.equal(b.paralyzedUntil,16100);
 const before=[...b.pos];await pvpMessage(world,s,b,{type:'input',seq:1,move:[1,0,0],aim:[0,0]},ws,13200);assert.deepEqual(b.pos,before);
 await pvpMessage(world,s,a,{type:'pvpSkill',skill:'paralyze',targetId:b.id},ws,13200);assert.equal(b.paralyzedUntil,16100);
 b.pos=[2200,900,0];await pvpMessage(world,s,b,{type:'input',seq:2,move:[.7,.7,0],aim:[0,0]},ws,17000);assert.ok(Math.hypot(b.pos[0],b.pos[2])<=2200);assert.equal(b.pos[1],900);
});
