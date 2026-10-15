import assert from 'node:assert/strict';
import {WORLD,equip,advance,invite,reply,attack,useAbility,safe} from './world-rules.mjs';
const now=100000;
function player(id,pos=[800,0,0]){const p={id,pos,connected:true,seq:-1};equip(p,'aurora');return p}
function world(...players){return {players,duels:[],invites:[],events:[]}}
const a=player('a'),b=player('b',[1000,0,0]),neutral=player('c',[900,0,0]);const s=world(a,b,neutral);
assert.equal(attack(s,a,{weapon:'laser',shots:[]},now),null);assert.equal(useAbility(s,a,now),false);
assert.equal(invite(s,a,'b',now),null);assert.equal(reply(s,neutral,s.invites[0].id,true,now),'invite_expired');assert.equal(s.duels.length,0);
assert.equal(reply(s,b,s.invites[0].id,true,now),null);assert.equal(s.duels.length,1);
assert.equal(attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},now+1000),null);
assert.equal(invite(s,neutral,'a',now),'busy');
assert.equal(useAbility(s,a,now+3001),true);assert.equal(a.energy,255);
const bullet=attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}],damage:99999},now+3001);assert.equal(bullet.length,1);assert.equal(bullet[0].damage,44);
advance(s,now+3250);assert(b.hp<b.profile.maxHp);assert.equal(neutral.hp,490);assert.equal(neutral.pos[0],900);
b.hp=1;attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},now+4000);advance(s,now+4250);assert.equal(s.duels.length,0);assert.deepEqual(b.pos,WORLD.spawn);assert.equal(b.hp,b.profile.maxHp);assert.deepEqual(a.pos,[800,0,0]);assert.equal(a.hp,a.profile.maxHp);assert.equal(s.events[0].winner,'a');
const c=player('d'),d=player('e',[1100,0,0]);const s2=world(c,d);assert.equal(invite(s2,c,'e',now),null);reply(s2,d,s2.invites[0].id,true,now);d.pos=[0,120,0];advance(s2,now+3100);assert.equal(s2.events[0].reason,'safe_zone');assert.equal(s2.duels.length,0);
assert(safe(d));assert.equal(invite(s2,c,'e',now+6000),'safe_zone');
d.pos=[1000,0,0];invite(s2,c,'e',now+6000);reply(s2,d,s2.invites[0].id,true,now+6000);c.connected=false;advance(s2,now+10000);assert.equal(s2.events.at(-1).reason,'disconnect');assert.equal(d.hp,490);
const p=player('loadout');equip(p,'bastion');assert.equal(p.profile.maxHp,1225);assert.equal(p.profile.attack,88);assert.equal(p.profile.speed,187);assert.equal(equip(p,'hacked'),false);
console.log('Shared world: mutual consent, countdown, server loadouts, neutral immunity, kill/respawn, safe zone, disconnect and abilities passed.');
