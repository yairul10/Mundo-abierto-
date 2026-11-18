import test from 'node:test';
import assert from 'node:assert/strict';
import {packTeams,matchPoints,matchAward,SEARCH_MS} from '../server/matchmaking/rules.mjs';
import {createMatchBot} from '../server/pvp/practice-bot.mjs';
import {makeCombatPlayer} from '../server/pvp/combat.mjs';
import {validSkills} from '../server/pvp/skills.mjs';
test('two minute search packs complete friend groups without splitting or exceeding teams',()=>{
 assert.equal(SEARCH_MS,120000);
 const group=(id,n)=>({id,members:Array.from({length:n},(_,i)=>({id:id+i,name:id+i}))});
 const plan=packTeams([group('a',3),group('b',2),group('c',3),group('d',2)],'5v5');
 assert.equal(plan.full,true);assert.equal(plan.roster.length,10);for(const prefix of ['a','b','c','d'])assert.equal(new Set(plan.roster.filter(p=>p.accountId.startsWith(prefix)).map(p=>p.slot%2)).size,1);
 assert.equal(new Set(plan.roster.map(p=>p.slot)).size,10);
 assert.equal(packTeams([group('a',2)],'2v2').full,false);assert.equal(packTeams([group('a',2),group('b',2)],'2v2').full,true);
 assert.equal(packTeams([group('x',1)],'arena20').roster[0].slot,0);
 assert.equal(matchPoints('1v1',null,true),50);assert.equal(matchPoints('5v5',null,false),0);assert.deepEqual(Array.from({length:20},(_,i)=>matchPoints('arena20',i+1,i===0)),[100,70,55,45,40,35,30,25,20,15,10,8,6,4,2,0,0,0,0,0]);assert.equal(matchPoints('arena20',0,false),0);assert.equal(matchPoints('arena20',21,false),0);assert.equal(matchPoints('arena20',1,true,false),0);assert.equal(matchPoints('1v1',null,true,false),0);
});
test('public bots randomize names, ships, bounded improvements and valid skills without labels',()=>{
 const human={id:'human',team:'a',realm:'normal',roster:{aurora:{maxHp:1000,attack:100,defense:20,speed:220,maxEnergy:100}}};makeCombatPlayer(human,{...human.roster.aurora,shipId:'aurora'});
 const bots=Array.from({length:30},(_,i)=>createMatchBot(human,{code:'ABCDEF',mode:'5v5'},10000,i%10));
 assert.ok(new Set(bots.map(p=>p.profile.shipId)).size>1);assert.ok(new Set(bots.map(p=>p.profile.attack)).size>1);
 for(const bot of bots){assert.equal(/BOT|práctica/i.test(bot.name),false);assert.ok(bot.profile.attack>=80&&bot.profile.attack<=120);assert.ok(validSkills(bot.equippedSkills,2));assert.ok(bot.profile.maxHp>=34000&&bot.profile.maxHp<=46000)}
});

test('ranked awards exclude abandoned players, while eliminated participants retain their result',()=>{
 const result={combatStartedAt:1000,winnerTeam:'a',reason:'destroyed'};
 assert.deepEqual(matchAward('2v2',{team:'a',participated:false},result),{points:0,wins:0});
 assert.deepEqual(matchAward('2v2',{team:'a',participated:true},result),{points:50,wins:1});
 assert.deepEqual(matchAward('arena20',{team:'b',place:3,participated:true},result),{points:55,wins:0});
 assert.deepEqual(matchAward('arena20',{team:'b',place:3,participated:false},result),{points:0,wins:0});
});
