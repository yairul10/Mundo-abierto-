import test from 'node:test';import assert from 'node:assert/strict';
import {makeCombatPlayer,defenseDamage,volley,stepCombat} from '../server/pvp/combat.mjs';
import {applyArenaHull} from '../server/pvp/arena-balance.mjs';
import {activateSkill} from '../server/pvp/skills.mjs';
import {advancePracticeBot} from '../server/pvp/practice-bot.mjs';
test('instant shield blocks all damage for exactly three seconds without consuming the hull shield',()=>{
 const a={id:'a',connected:true,pos:[0,120,0]},b={id:'b',connected:true,pos:[0,120,-100]};makeCombatPlayer(a,{attack:100});makeCombatPlayer(b,{maxHp:1000,upgrades:{shieldGenerator:1}});b.equippedSkills=['instantShield','interference'];
 assert.equal(activateSkill(b,'instantShield',10000),true);b.shield=b.profile.maxShield;const before=[b.hp,b.shield];
 assert.equal(defenseDamage(b,100000,12999),0);assert.ok(defenseDamage(b,100,13000)>0);
 const s={status:'active',simTime:10000,players:[a,b],bullets:[]};volley(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},10000);stepCombat(s,10050);assert.deepEqual([b.hp,b.shield],before);
});
test('arena hull doubles only once and bot projectiles deal 20 percent less without changing player damage',()=>{
 const p={id:'p',connected:true,pos:[0,0,0]},bot={id:'bot',isBot:true,connected:true,pos:[100,0,0]};for(const a of [p,bot]){makeCombatPlayer(a,{maxHp:1000,attack:100});applyArenaHull(a);applyArenaHull(a);assert.equal(a.profile.maxHp,2000);assert.equal(a.hp,2000)}
 const ordinary={};makeCombatPlayer(ordinary,{maxHp:1000});assert.equal(ordinary.profile.maxHp,1000);
 const s={players:[p,bot],bullets:[]},shot={offset:[0,0,0],direction:[0,0,-1]};assert.equal(volley(s,p,{weapon:'laser',shots:[shot]},10000)[0].damage,150);assert.equal(volley(s,bot,{weapon:'laser',shots:[shot]},10000)[0].damage,120);
});
test('practice bot delays its first shot and cannot track current position through interference',()=>{
 const bot={id:'bot',isBot:true,connected:true,pos:[0,120,0],aim:[0,0]},human={id:'human',connected:true,pos:[0,120,-500]};for(const p of [bot,human])makeCombatPlayer(p,{maxHp:1000,attack:100,speed:220});bot.equippedSkills=['instantShield','fury'];
 const s={players:[bot,human],bullets:[]},eligible=(a,b)=>a.hp>0&&(!b||b.id!==a.id&&b.hp>0);
 advancePracticeBot(s,10000,eligible,()=>.5);advancePracticeBot(s,10600,eligible,()=>.5);assert.equal(s.botVolleys,undefined);advancePracticeBot(s,10700,eligible,()=>.5);assert.ok(s.botVolleys.length);
 const known=[...bot.botBrain.lastAimPoint];human.skillUntil.interference=20000;human.pos=[300,120,-500];advancePracticeBot(s,11400,eligible,()=>.5);assert.deepEqual(bot.botBrain.lastAimPoint,known);
});
