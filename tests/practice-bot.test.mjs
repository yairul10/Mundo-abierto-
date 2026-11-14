import test from 'node:test';
import assert from 'node:assert/strict';
import {enterPvp,advancePvp,pvpMessage} from '../server/pvp/pvp-match.mjs';
import {advancePracticeBot} from '../server/pvp/practice-bot.mjs';
async function fixture(){
 const s={players:[],events:[],duels:[],invites:[]},world={ctx:{storage:{setAlarm:async()=>{}},getWebSockets:()=>[]},worldSave(){},worldBroadcast(){},startSimulation(){}};
 await enterPvp(world,s,{accountId:'human',name:'Human',clientVersion:5,realm:'test',pvpRoom:{code:'ABCDEF',visibility:'practice',bot:true},shipId:'aurora',roster:{aurora:{maxHp:1000,attack:100,defense:20,speed:220,maxEnergy:100,droneCount:2}}},'human',10000);
 const human=s.players[0],bot=s.players[1];human.connected=true;await pvpMessage(world,s,human,{type:'ready',ready:true},{send(){}},10000);advancePvp(s,13000);
 return {s,world,human,bot};
}
test('practice mirrors the player and starts after only the human is ready',async()=>{
 const {s,human,bot}=await fixture();assert.equal(s.pvpMatch.status,'active');assert.equal(bot.isBot,true);assert.match(bot.name,/BOT/);assert.equal(bot.accountId,undefined);
 for(const key of ['maxHp','attack','defense','speed','droneCount','missiles'])assert.equal(bot.profile[key],human.profile[key]);
 assert.equal(bot.hp,human.hp);assert.deepEqual(bot.equippedSkills,['instantShield','fury','interference']);assert.notEqual(bot.roster,human.roster);
});
test('normal aim targets the current ship position exactly and uses player projectile speeds and cadence',async()=>{
 const {s,human,bot}=await fixture();human.pos=[100,40,-400];bot.pos=[0,40,-700];bot.botBrain={tickAt:14000,engageAt:13000,nextThinkAt:Number.MAX_SAFE_INTEGER,side:1,move:[0,0,0],phase:0};
 const canDamage=(a,b)=>a.connected&&a.hp>0&&(!b||b.connected&&b.hp>0&&b!==a);
 advancePracticeBot(s,14000,canDamage,()=>.5);const first=s.botVolleys.filter(v=>v.shots[0].missile===false)[0];assert.ok(first);assert.equal(first.shots.length,4);
 for(const b of first.shots){const delta=human.pos.map((v,i)=>v-b.pos[i]),len=Math.hypot(...delta),speed=Math.hypot(...b.vel);for(let i=0;i<3;i++)assert.ok(Math.abs(b.vel[i]/speed-delta[i]/len)<1e-10);assert.ok(Math.abs(speed-4000)<1e-6||Math.abs(speed-1150)<1e-6)}
 assert.equal(first.shots[0].damage,150);const count=s.botVolleys.length;advancePracticeBot(s,14100,canDamage,()=>.5);assert.equal(s.botVolleys.length,count);
 human.pos=[-100,80,-300];advancePracticeBot(s,14700,canDamage,()=>.5);assert.equal(s.botVolleys.length,count+1);
 const next=s.botVolleys.at(-1).shots[0],delta=human.pos.map((v,i)=>v-next.pos[i]),len=Math.hypot(...delta),speed=Math.hypot(...next.vel);for(let i=0;i<3;i++)assert.ok(Math.abs(next.vel[i]/speed-delta[i]/len)<1e-10);
});
test('movement respects ship speed and paralysis; disconnected players pause the bot',async()=>{
 const {s,human,bot}=await fixture();let before=[...bot.pos];advancePvp(s,13100);advancePvp(s,13200);assert.ok(Math.hypot(...bot.pos.map((v,i)=>v-before[i]))<=bot.profile.speed*.2+.001);
 bot.paralyzedUntil=30000;before=[...bot.pos];advancePvp(s,13300);assert.deepEqual(bot.pos,before);
 human.connected=false;human.lastSeen=13300;before=[...bot.pos];advancePvp(s,14000);assert.equal(s.pvpMatch.paused,true);assert.deepEqual(bot.pos,before);
 advancePvp(s,34000);assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.reason,'abandoned');
});
test('defeating a bot finishes without currency, NPC awards or respawn',async()=>{
 const {s,human,bot}=await fixture();bot.hp=0;advancePvp(s,14000);assert.equal(s.pvpMatch.score.a,1);advancePvp(s,18000);bot.hp=0;advancePvp(s,18100);assert.equal(s.pvpMatch.winner,human.id);assert.equal(s.pvpMatch.status,'finished');assert.equal(s.bossRewards,undefined);assert.equal(bot.hp,0);advancePvp(s,20000);assert.equal(bot.hp,0);
});

test('the bot damages and can defeat a stationary opponent through ordinary combat',async()=>{
 const {s,human,bot}=await fixture();const initial=human.hp;
 for(let now=13100;now<103000&&s.pvpMatch.status!=='finished';now+=100)advancePvp(s,now);
 assert.ok(human.hp<initial);assert.equal(s.pvpMatch.status,'finished');assert.equal(s.pvpMatch.simulated,true);assert.ok(Object.values(s.pvpMatch.score).includes(2));assert.equal(s.bossRewards,undefined);
});
