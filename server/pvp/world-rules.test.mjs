import assert from 'node:assert/strict';
import {WORLD,equip,importRoster,advance,attack,canDamage,protectedAt,updateProtection,openHangar,applyHangarLoadout} from './world-rules.mjs';
const t=100000,raw={maxHp:490,maxEnergy:500,attack:100,defense:0,speed:220,level:100};
function player(id,x=4100){const p={id,name:id,pos:[x,120,0],connected:true,roster:importRoster({aurora:raw})};equip(p,'aurora');updateProtection(p,t);return p}
const world=(...players)=>({players,duels:[],invites:[],events:[],bullets:[],simTime:t});
const shot={offset:[0,0,0],direction:[1,0,0]};
assert.equal(WORLD.radius,5900);assert.equal(WORLD.safeRadius,650);assert.equal(WORLD.pveRadius,3275);
// Hostile shots hit the first physical collision and skip protected bystanders.
{
 const a=player('a'),b=player('b',4200),c=player('c',4300),base=player('safe',100),s=world(a,c,b,base);
 assert(attack(s,a,{weapon:'laser',shots:[shot]},t));advance(s,t+100);assert(b.hp<b.profile.maxHp);assert.equal(c.hp,c.profile.maxHp);assert.equal(base.hp,base.profile.maxHp);
 b.pos=[4200,120,200];assert(attack(s,a,{weapon:'laser',shots:[shot]},t+800));advance(s,t+1000);advance(s,t+1100);assert(c.hp<c.profile.maxHp);
 const missiles=attack(s,a,{weapon:'missile',targetId:c.id,shots:[{...shot,locked:true}]},t+2000);assert.equal(missiles[0].target,c.id);
}
// The base never accepts combat or hangar changes while a duel is active.
{
 const a=player('a',100),b=player('b',4100),s=world(a,b);assert.equal(canDamage(b,a,t),false);assert.equal(attack(s,a,{weapon:'laser',shots:[shot]},t),null);assert(protectedAt(a,t));assert.equal(openHangar(s,a,t),null);
 assert.equal(applyHangarLoadout(s,a,{aurora:{...raw,maxHp:500}},'aurora',t),null);assert.equal(a.hp,10000);a.duelId='duel';assert.equal(openHangar(s,a,t),'base_only');a.duelId=null;a.pos=[1200,120,0];assert.equal(openHangar(s,a,t),'base_only');
}
// Hostile death waits for the victim's choice; it does not heal the winner.
{
 const a=player('a'),b=player('b',4200),s=world(a,b);a.hp=400;b.hp=1;attack(s,a,{weapon:'laser',shots:[shot]},t);advance(s,t+100);assert.equal(b.hp,0);assert(b.death);assert.equal(a.hp,400);assert.equal(s.pendingKills.length,1);assert.equal(s.events.find(e=>e.type==='destroyed').winner,'a');
 assert.equal(attack(s,b,{weapon:'laser',shots:[shot]},t+200),null);
}
console.log('Zone rules: hostile collisions, protected base/hangar and paid-choice deaths.');
