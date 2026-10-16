import assert from 'node:assert/strict';
import {PVP_SKILLS,activateSkill,skillActive,validSkills} from './skills.mjs';
import {equip,importRoster,invite,reply,attack,usePvpSkill,setSkills,reset,useAbility} from './world-rules.mjs';
import {stepCombat,defenseDamage} from './combat.mjs';
const t=100000;
function setup(shipId='aurora'){
 const raw={maxHp:200,maxEnergy:500,attack:100,defense:0,speed:220,level:40,shipId,explorerDrone:true,upgrades:{missiles:2}};
 const a={id:'a',pos:[0,120,0],connected:true,roster:importRoster({[shipId]:raw})},b={id:'b',pos:[100,120,0],connected:true,roster:importRoster({aurora:raw})};equip(a,shipId);equip(b,'aurora');
 const s={players:[a,b],duels:[],invites:[],events:[]};return {a,b,s};
}
function duel(s,a,b){assert.equal(invite(s,a,b.id,t),null);assert.equal(reply(s,b,s.invites[0].id,true,t),null)}
function hit(a,b,now,damage=100){const state={status:'active',players:[a,b],simTime:now,bullets:[{owner:a.id,pos:[50,120,0],vel:[1150,0,0],damage,life:1,age:0,range:1200,travelled:0}]};stepCombat(state,now+50);}
assert.equal(Object.keys(PVP_SKILLS).length,6);assert(!validSkills(['fury','fury']));assert(!validSkills(['fury','__proto__']));
{
 const {s,a,b}=setup();assert.equal(setSkills(s,a,['fury','transfer']),null);assert.equal(usePvpSkill(s,a,'fury',t),'no_duel');duel(s,a,b);assert.equal(usePvpSkill(s,a,'fury',t+2999),'no_duel');assert.equal(setSkills(s,a,['interference','luck']),'base_only');
 assert.equal(usePvpSkill(s,a,'fury',t+3000),null);assert.equal(a.skillUntil.fury,t+6000);assert.equal(a.skillReadyAt.fury,t+33000);assert.equal(usePvpSkill(s,a,'fury',t+3001),'skill_cooldown');assert.equal(usePvpSkill(s,a,'luck',t+3001),'invalid_skills');
 hit(a,b,t+3100);assert.equal(b.hp,3800,'Fury doubles actual projectile damage');b.hp=1000;hit(a,b,t+6000);assert.equal(b.hp,900,'Fury expires after exactly 3 seconds');assert.equal(usePvpSkill(s,a,'fury',t+33000),null);
 reset(a);assert.deepEqual(a.skillUntil,{});assert.deepEqual(a.skillReadyAt,{});assert.deepEqual(a.equippedSkills,['fury','transfer']);
}
{
 const {s,a,b}=setup();setSkills(s,a,['fury','transfer']);setSkills(s,b,['instantShield','interference']);duel(s,a,b);a.hp=400;usePvpSkill(s,a,'transfer',t+3000);usePvpSkill(s,b,'instantShield',t+3000);hit(a,b,t+3100);assert.equal(b.hp,3950);assert.equal(a.hp,425,'Transfer uses damage after shields');
 b.hp=10;hit(a,b,t+3200,5000);assert.equal(a.hp,430,'Overkill cannot heal more than actual hull lost');b.hp=1000;a.hp=a.profile.maxHp-1;hit(a,b,t+3300);assert.equal(a.hp,a.profile.maxHp,'No overheal');a.hp=400;hit(a,b,t+8000);assert.equal(a.hp,400,'Transfer expires after 5 seconds');assert.equal(defenseDamage(b,100,t+6000,()=>1),100,'Shield expires');
}
{
 const {s,a,b}=setup();setSkills(s,b,['interference','paralyze']);duel(s,a,b);const shot={offset:[0,0,0],direction:[1,0,0],locked:true,speed:650};const missiles=attack(s,a,{weapon:'missile',shots:[shot]},t+3000);assert.equal(missiles[0].target,'b');usePvpSkill(s,b,'interference',t+3001);assert.equal(missiles[0].target,null,'In-flight missiles lose their target');assert.equal(attack(s,a,{weapon:'explorer',shots:[shot]},t+3002),null,'Automatic pet cannot acquire a jammed target');
 a.last_missile=0;const next=attack(s,a,{weapon:'missile',shots:[shot]},t+3100);assert.equal(next[0].target,null);assert(skillActive(b,'interference',t+6000));assert(!skillActive(b,'interference',t+6001));b.hp=1000;hit(a,b,t+3200);assert.equal(b.hp,900,'Interference is not invulnerability');
}
{
 const {s,a,b}=setup('centella');setSkills(s,b,['paralyze','luck']);duel(s,a,b);a.pos=[2000,120,0];assert.equal(usePvpSkill(s,b,'paralyze',t+3000),'too_far');assert(!b.skillReadyAt?.paralyze);a.pos=[0,120,0];assert.equal(usePvpSkill(s,b,'paralyze',t+3001),null);assert.equal(a.paralyzedUntil,t+6001);assert(useAbility(s,a,t+3100));assert.equal(a.paralyzedUntil,0,'Centella cleanses paralysis with its native ability');
 const shot={offset:[0,0,0],direction:[-1,0,0],speed:650};assert(attack(s,b,{weapon:'missile',shots:[shot,shot,shot]},t+3100));assert.equal(attack(s,b,{weapon:'missile',shots:[shot]},t+3200),null);assert.equal(usePvpSkill(s,b,'luck',t+3200),null);assert.equal(attack(s,b,{weapon:'missile',shots:[shot,shot,shot]},t+3201).length,3);assert.equal(attack(s,b,{weapon:'missile',shots:[shot]},t+3202),null,'Luck grants one volley, not unlimited missiles');assert.equal(usePvpSkill(s,b,'luck',t+3202),'skill_cooldown');
}
console.log('Six PvP skills: durations, cooldowns, equipment, shields, damage, actual-damage healing, no overkill, jamming, paralysis/cleanse and one bonus missile volley passed.');
