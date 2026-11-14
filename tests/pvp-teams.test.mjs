import test from 'node:test';
import assert from 'node:assert/strict';
import {enterPvp,advancePvp,pvpMessage,pvpSnapshot,changeTeam,swapTeams} from '../server/pvp/pvp-match.mjs';
import {pvpRoomName} from '../server/pvp/pvp-teams.mjs';
const body=(id,bot=false)=>({accountId:id,name:id,clientVersion:5,realm:'normal',shipId:'aurora',skills:['fury','paralyze'],pvpRoom:{mode:'2v2',code:'ABCDEF',visibility:bot?'practice':'private',bot},roster:{aurora:{maxHp:1000,attack:100,defense:0,speed:220,maxEnergy:100}}});
async function fixture(bot=false,mode='2v2'){const s={players:[],events:[],duels:[],invites:[]},sent=[],ws={send:m=>sent.push(JSON.parse(m)),close(){}},world={ctx:{storage:{setAlarm:async()=>{}},getWebSockets:()=>[]},worldSave(){},worldBroadcast(){},startSimulation(){},worldDisconnect:async()=>{}};
 for(let i=0;i<(bot?1:mode==='arena20'?20:mode==='5v5'?10:4);i++){await enterPvp(world,s,{...body('p'+i,bot),pvpRoom:{...body('p'+i,bot).pvpRoom,mode}},'p'+i,10000);s.players.find(p=>p.id==='p'+i).connected=true}return {s,world,ws,sent};}
async function start(f){for(const p of f.s.players.filter(p=>!p.isBot))await pvpMessage(f.world,f.s,p,{type:'ready',ready:true},f.ws,10000);assert.equal(f.s.pvpMatch.status,'countdown');advancePvp(f.s,13000);assert.equal(f.s.pvpMatch.status,'active')}
test('2v2 has isolated room identities, four reserved slots, balanced teams and four ready checks',async()=>{
 assert.notEqual(pvpRoomName('normal','ABCDEF','1v1'),pvpRoomName('normal','ABCDEF','2v2'));
 const f=await fixture();assert.deepEqual(f.s.players.map(p=>p.team),['a','b','a','b']);assert.equal(new Set(f.s.players.map(p=>JSON.stringify(p.spawn))).size,4);
 assert.equal((await enterPvp(f.world,f.s,body('fifth'),'fifth',10000)).error,'world_full');
 for(const p of f.s.players.slice(0,3))await pvpMessage(f.world,f.s,p,{type:'ready',ready:true},f.ws,10000);assert.equal(f.s.pvpMatch.status,'waiting');
 await pvpMessage(f.world,f.s,f.s.players[3],{type:'ready',ready:true},f.ws,10000);assert.equal(f.s.pvpMatch.status,'countdown');assert.equal(pvpSnapshot(f.s,10000).rules.capacity,4);
});
test('private hosts can swap full teams, other players cannot, and active teams are locked',async()=>{
 const f=await fixture(),p=f.s.players;assert.equal(changeTeam(f.s,p[1],'a'),'team_full');
 assert.equal(swapTeams(f.s,p[3],[p[1].id,p[2].id]),'host_only');p[1].ready=p[2].ready=true;
 assert.equal(swapTeams(f.s,p[0],[p[1].id,p[2].id]),null);assert.deepEqual(p.map(p=>p.team),['a','a','b','b']);assert.equal(p[1].ready,false);assert.equal(p[2].ready,false);
 await start(f);assert.equal(changeTeam(f.s,p[0],'b'),'match_started');assert.equal(swapTeams(f.s,p[0],[p[1].id,p[2].id]),'host_only');
});
test('lasers and paralysis cannot affect allies; the first elimination does not finish the match',async()=>{
 const f=await fixture();await start(f);const {s,world,ws,sent}=f,[a,b,ally,lastEnemy]=s.players;a.pos=[0,120,100];ally.pos=[0,120,0];b.pos=[1000,120,0];lastEnemy.pos=[1000,120,500];a.profile.attack=100000;
 await pvpMessage(world,s,a,{type:'pvpSkill',skill:'paralyze',targetId:ally.id},ws,13100);assert.equal(ally.paralyzedUntil,0);assert.equal(a.skillReadyAt.paralyze,undefined);assert.equal(sent.at(-1).error,'too_far');
 const hp=ally.hp;await pvpMessage(world,s,a,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},ws,13100);advancePvp(s,13200);assert.equal(ally.hp,hp);await pvpMessage(world,s,a,{type:'volley',weapon:'missile',targetId:ally.id,shots:[{offset:[0,0,0],direction:[0,0,-1],locked:true}]},ws,13200);advancePvp(s,13300);assert.equal(ally.hp,hp);
 b.hp=0;advancePvp(s,13300);assert.equal(s.pvpMatch.status,'active');assert.equal(b.eliminated,true);assert.equal(pvpSnapshot(s,13300).players.find(p=>p.id===b.id).death,null);
 const position=[...b.pos],shots=s.bullets.length;await pvpMessage(world,s,b,{type:'input',seq:1,move:[1,0,0],aim:[0,0]},ws,13400);assert.deepEqual(b.pos,position);
 await pvpMessage(world,s,b,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,1]}]},ws,13400);assert.ok(s.bullets.length<=shots);
 lastEnemy.hp=0;advancePvp(s,13500);assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.winnerTeam,'a');assert.equal(s.bossRewards,undefined);assert.equal(s.pendingKills,undefined);
});
test('an expired disconnect removes one ship, preserves its team and never grants a free revival',async()=>{
 const f=await fixture();await start(f);const {s,world}=f,missing=s.players[2];missing.connected=false;missing.lastSeen=13000;advancePvp(s,14000);assert.equal(s.pvpMatch.paused,true);
 advancePvp(s,33000);assert.equal(missing.hp,0);assert.equal(missing.eliminated,true);assert.equal(s.pvpMatch.status,'active');assert.equal(s.pvpMatch.paused,false);
 const resumed=await enterPvp(world,s,body(missing.id),missing.id,34000);assert.ok(resumed.token);assert.equal(missing.hp,0);assert.equal(missing.team,'a');
});
test('2v2 practice provides one allied bot and two rivals that only select opponents',async()=>{
 const f=await fixture(true);assert.equal(f.s.players.length,4);assert.equal(f.s.players.filter(p=>p.isBot&&p.team==='a').length,1);assert.equal(f.s.players.filter(p=>p.isBot&&p.team==='b').length,2);await start(f);
 for(let now=13100;now<=16000;now+=100)advancePvp(f.s,now);
 for(const bot of f.s.players.filter(p=>p.isBot)){assert.ok(bot.botBrain?.targetId);assert.notEqual(f.s.players.find(p=>p.id===bot.botBrain.targetId).team,bot.team)}
 const positions=f.s.players.map(p=>[...p.pos]);await pvpMessage(f.world,f.s,f.s.players[0],{type:'practicePause',paused:true},f.ws,16100);advancePvp(f.s,17000);assert.deepEqual(f.s.players.map(p=>p.pos),positions);
});

test('leaving removes only that player until the last living teammate leaves',async()=>{
 const f=await fixture();await start(f);const [a,,ally]=f.s.players;
 await pvpMessage(f.world,f.s,a,{type:'leave'},f.ws,13100);assert.equal(f.s.pvpMatch.status,'active');assert.equal(a.hp,0);assert.equal(ally.hp,ally.profile.maxHp);
 await pvpMessage(f.world,f.s,ally,{type:'leave'},f.ws,13200);assert.equal(f.s.pvpMatch.status,'finished');assert.equal(f.s.pvpMatch.winnerTeam,'b');assert.equal(f.s.pvpMatch.reason,'surrender');
});

test('5v5 reserves ten distinct spawns, balances five per team and waits for all ten pilots',async()=>{
 const f=await fixture(false,'5v5'),{s,world,ws}=f;
 assert.equal(s.players.length,10);assert.equal(s.players.filter(p=>p.team==='a').length,5);
 assert.equal(new Set(s.players.map(p=>JSON.stringify(p.spawn))).size,10);
 assert.notEqual(pvpRoomName('normal','ABCDEF','5v5'),pvpRoomName('normal','ABCDEF','2v2'));
 assert.equal((await enterPvp(world,s,{...body('extra'),pvpRoom:{mode:'5v5'}},'extra',10000)).error,'world_full');
 for(const p of s.players.slice(0,9))await pvpMessage(world,s,p,{type:'ready',ready:true},ws,10000);
 assert.equal(s.pvpMatch.status,'waiting');
 await pvpMessage(world,s,s.players[9],{type:'ready',ready:true},ws,10000);
 assert.equal(s.pvpMatch.status,'countdown');advancePvp(s,13000);
 assert.equal(pvpSnapshot(s,13000).match.teamSize,5);
 for(const p of s.players.filter(p=>p.team==='b').slice(0,4))p.hp=0;
 advancePvp(s,13100);assert.equal(s.pvpMatch.status,'active');
 s.players.find(p=>p.team==='b'&&p.hp>0).hp=0;advancePvp(s,13200);
 assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.winnerTeam,'a');
});
test('5v5 practice creates four allies and five rivals and ends when the human leaves',async()=>{
 const f=await fixture(true,'5v5');await start(f);
 assert.equal(f.s.players.filter(p=>p.isBot&&p.team==='a').length,4);
 assert.equal(f.s.players.filter(p=>p.isBot&&p.team==='b').length,5);
 for(let now=13100;now<=15000;now+=100)advancePvp(f.s,now);
 for(const bot of f.s.players.filter(p=>p.isBot)){
  assert.ok(bot.botBrain?.targetId);assert.notEqual(f.s.players.find(p=>p.id===bot.botBrain.targetId).team,bot.team);
 }
 await pvpMessage(f.world,f.s,f.s.players[0],{type:'leave'},f.ws,15100);
 assert.equal(f.s.pvpMatch.status,'finished');assert.equal(f.s.pvpMatch.reason,'abandoned');
});

test('Arena 20 has twenty opponents and circular spawns inside a larger boundary',async()=>{
 const f=await fixture(false,'arena20'),{s,world,ws}=f;
 assert.equal(s.players.length,20);assert.equal(new Set(s.players.map(p=>p.team)).size,20);
 assert.equal(new Set(s.players.map(p=>JSON.stringify(p.spawn))).size,20);
 for(const p of s.players){assert.ok(Math.abs(Math.hypot(p.pos[0],p.pos[2])-6000)<.01);for(const q of s.players)if(q!==p)assert.ok(Math.hypot(...p.pos.map((v,i)=>v-q.pos[i]))>1800,'spawn outside immediate laser range');}
 assert.equal(changeTeam(s,s.players[0],'a'),'invalid_team');
 assert.equal(swapTeams(s,s.players[0],[s.players[1].id,s.players[2].id]),'invalid_team');
 await start(f);const snap=pvpSnapshot(s,13000);
 assert.equal(snap.match.freeForAll,true);assert.equal(snap.rules.radius,8000);
 const a=s.players[0],b=s.players[2];a.pos=[0,120,100];b.pos=[0,120,0];
 await pvpMessage(world,s,a,{type:'pvpSkill',skill:'paralyze',targetId:b.id},ws,13100);
 assert.equal(b.paralyzedUntil,16100);
 for(const p of s.players.slice(2))p.hp=0;advancePvp(s,13200);assert.equal(s.pvpMatch.status,'active');
 s.players[1].hp=0;advancePvp(s,13300);assert.equal(s.pvpMatch.winner,a.id);
 assert.notEqual(pvpRoomName('normal','ABCDEF','arena20'),pvpRoomName('normal','ABCDEF','5v5'));
});
test('Arena 20 practice creates nineteen rival bots and enforces the expanded movement limit',async()=>{
 const f=await fixture(true,'arena20');await start(f);
 assert.equal(f.s.players.filter(p=>p.isBot).length,19);
 for(let now=13100;now<=14000;now+=100)advancePvp(f.s,now);
 for(const bot of f.s.players.filter(p=>p.isBot)){
  assert.ok(bot.botBrain?.targetId);assert.notEqual(bot.botBrain.targetId,bot.id);
  assert.ok(Math.hypot(bot.pos[0],bot.pos[2])>2200);
 }
 const p=f.s.players[0];p.pos=[9000,120,0];p.lastInput=14000;
 await pvpMessage(f.world,f.s,p,{type:'input',seq:1,move:[1,0,0],aim:[0,0]},f.ws,14100);
 assert.ok(Math.abs(Math.hypot(p.pos[0],p.pos[2])-8000)<.01);
});

test('every practice mode resolves immediately when its human dies, including a paused practice',async()=>{
 for(const mode of ['1v1','2v2','5v5','arena20']){
  const f=await fixture(true,mode);await start(f);const human=f.s.players[0];human.hp=0;human.practicePaused=true;
  advancePvp(f.s,13100);assert.equal(f.s.pvpMatch.status,'finished');assert.equal(f.s.pvpMatch.simulated,true);assert.equal(f.s.pvpMatch.paused,false);
  assert.ok(f.s.pvpMatch.simulatedSeconds<=300);assert.equal(f.s.bullets.length,0);
  assert.equal(pvpSnapshot(f.s,13100).match.simulated,true);
  const {winner,finishedAt,simulatedSeconds}=f.s.pvpMatch;advancePvp(f.s,15000);assert.equal(f.s.pvpMatch.winner,winner);assert.equal(f.s.pvpMatch.finishedAt,finishedAt);assert.equal(f.s.pvpMatch.simulatedSeconds,simulatedSeconds);
 }
});
test('practice simulation can award victory to surviving allies and never runs in human PvP',async()=>{
 const f=await fixture(true,'5v5');await start(f);
 for(const bot of f.s.players.filter(p=>p.isBot)){if(bot.team==='a'){bot.hp=100000;bot.profile.attack=10000}else{bot.hp=1;bot.shield=0;bot.profile.attack=1}}
 f.s.players[0].hp=0;advancePvp(f.s,13100);assert.equal(f.s.pvpMatch.winnerTeam,'a');assert.equal(f.s.bossRewards,undefined);
 const human=await fixture(false,'5v5');await start(human);human.s.players[0].hp=0;advancePvp(human.s,13100);
 assert.equal(human.s.pvpMatch.status,'active');assert.notEqual(human.s.pvpMatch.simulated,true);
});
