import assert from 'node:assert/strict';
import {WORLD,equip,importRoster,reset,advance,attack,protectedAt,updateProtection,openHangar,applyHangarLoadout,usePvpSkill,setSkills,invite,reply} from './world-rules.mjs';
const t=100000;
const raw={maxHp:490,maxEnergy:500,attack:100,defense:0,speed:220,level:40,explorerDrone:true,upgrades:{missiles:2}};
function player(id,x=800){const p={id,pos:[x,120,0],connected:true,seq:0,roster:importRoster({aurora:raw,bastion:{...raw,maxHp:1225}})};equip(p,'aurora');updateProtection(p,t);return p}
const world=(...players)=>({players,duels:[],invites:[],events:[],bullets:[],simTime:t});
const shot={offset:[0,0,0],direction:[1,0,0]};
assert.equal(WORLD.radius,3000);assert.equal(WORLD.safeRadius,650);assert.equal(WORLD.protectionDelay,5000);
// All opponents can be hit. Ignore protected bystanders and choose the first physical collision.
{
 const a=player('a',800),b=player('b',900),c=player('c',1000),base=player('safe',100),s=world(a,c,b,base);
 assert.equal(invite(), 'open_pvp');assert.equal(reply(),'open_pvp');assert.ok(attack(s,a,{weapon:'laser',shots:[shot]},t));advance(s,t+100);assert.ok(b.hp<b.profile.maxHp);assert.equal(c.hp,c.profile.maxHp);assert.equal(base.hp,base.profile.maxHp);
 b.pos=[900,120,200];assert.ok(attack(s,a,{weapon:'laser',shots:[shot]},t+800));advance(s,t+1000);advance(s,t+1100);assert.ok(c.hp<c.profile.maxHp,'Third player can be hit without invitations');
 const missiles=attack(s,a,{weapon:'missile',targetId:c.id,shots:[{...shot,locked:true}]},t+2000);assert.equal(missiles[0].target,c.id,'Missiles track selected player rather than first array entry');
}
// Exact fixed deadline; incoming and outgoing shots do not restart or skip it.
{
 const a=player('a',800),b=player('b',900),s=world(a,b);a.pos=[600,120,0];updateProtection(a,t+1000);const deadline=a.baseEnteredAt;
 assert.equal(protectedAt(a,t+5999),false);a.lastHit=t+4500;assert.ok(attack(s,a,{weapon:'laser',shots:[shot]},t+5000));assert.equal(a.baseEnteredAt,deadline);
 assert.equal(protectedAt(a,t+6000),true);assert.equal(attack(s,a,{weapon:'laser',shots:[shot]},t+6000),null);assert.equal(a.baseEnteredAt,deadline);
 advance(s,t+6000);assert.equal(s.bullets.length,0,'Protection cancels own in-flight damage');assert.equal(openHangar(s,a,t+5999),'base_only');assert.equal(openHangar(s,a,t+6000),null);
 a.hangar=false;a.pos=[800,120,0];updateProtection(a,t+7000);a.pos=[600,120,0];updateProtection(a,t+7200);assert.equal(protectedAt(a,t+12199),false);assert.equal(protectedAt(a,t+12200),true,'Each reentry starts a new fixed wait');
 const saved=JSON.parse(JSON.stringify(a));assert.equal(saved.baseEnteredAt,t+7200);assert.equal(protectedAt(saved,t+12200),true,'Protection survives eviction/storage reload');
}
// Incoming damage is allowed during entry grace and denied at the deadline.
{
 const a=player('a',500),b=player('b',800),s=world(a,b);a.pos=[800,120,0];updateProtection(a,t);a.pos=[600,120,0];updateProtection(a,t+1000);
 const towardsBase={offset:[0,0,0],direction:[-1,0,0]};attack(s,b,{weapon:'laser',shots:[towardsBase]},t+2000);advance(s,t+2200);assert.ok(a.hp<a.profile.maxHp);const health=a.hp;
 attack(s,b,{weapon:'laser',shots:[towardsBase]},t+6000);advance(s,t+6200);assert.equal(a.hp,health,'Base protection denies incoming projectiles even if shooter remains outside');
 assert.equal(usePvpSkill(s,a,'paralyze',t+6200,b.id),'protected');
 assert.equal(openHangar(s,a,t+6200),null);assert.equal(applyHangarLoadout(s,a,{aurora:raw},'aurora',t+6300),null);assert.equal(a.hp,9800);
}
// Death affects only the victim; winner stays wounded and other fights continue.
{
 const a=player('a'),b=player('b',900),c=player('c',1200),s=world(a,b,c);a.hp=400;b.hp=1;attack(s,a,{weapon:'laser',shots:[shot]},t);advance(s,t+100);
 assert.equal(b.hp,9800);assert.deepEqual(b.pos,WORLD.spawn);assert.ok(protectedAt(b,t+100));assert.equal(a.hp,400);assert.deepEqual(a.pos,[800,120,0]);assert.equal(c.hp,9800);assert.equal(s.events[0].victim,'b');assert.equal(s.events[0].winner,'a');
 assert.equal(attack(s,b,{weapon:'laser',shots:[shot]},t+200),null,'Respawn is protected, not an opportunity to fire from base');
}
// Hangar/ship changes cannot bypass the grace interval. Protected targets cannot be paralyzed.
{
 const a=player('a',100),b=player('b',900),s=world(a,b);assert.equal(setSkills(s,b,['paralyze','luck'],t),'base_only');setSkills(s,a,['paralyze','luck'],t);a.pos=[800,120,0];updateProtection(a,t+1);b.pos=[100,120,0];updateProtection(b,t+1);advance(s,t+6000);assert.equal(usePvpSkill(s,a,'paralyze',t+6000,b.id),'too_far');
 a.pos=[600,120,0];updateProtection(a,t+7000);assert.equal(openHangar(s,a,t+8000),'base_only');assert.equal(applyHangarLoadout(s,a,{aurora:raw},'aurora',t+8000),'base_only');
}
console.log('Open PvP: all-player combat, earliest hit, missile selection, exact non-resetting 5s protection, persistence, safe spawn/hangar and isolated death passed.');
