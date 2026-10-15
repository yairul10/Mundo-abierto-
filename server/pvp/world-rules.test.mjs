import assert from 'node:assert/strict';
import {WORLD,equip,advance,invite,reply,attack,useAbility,safe} from './world-rules.mjs';
const now=100000;
function player(id,pos=[800,0,0]){const p={id,pos,connected:true,seq:-1};equip(p,'aurora');return p}
function world(...players){return {players,duels:[],invites:[],events:[]}}
const a=player('a',[100,120,0]),b=player('b',[300,120,0]),neutral=player('c',[200,120,0]);const s=world(a,b,neutral);
assert.equal(attack(s,a,{weapon:'laser',shots:[]},now),null);assert.equal(useAbility(s,a,now),false);
assert.equal(invite(s,a,'b',now),null);assert.equal(reply(s,neutral,s.invites[0].id,true,now),'invite_expired');assert.equal(s.duels.length,0);
assert.equal(reply(s,b,s.invites[0].id,true,now),null);assert.equal(s.duels.length,1);
assert.equal(attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},now+1000),null);
assert.equal(invite(s,neutral,'a',now),'busy');
assert.equal(useAbility(s,a,now+3001),true);assert.equal(a.energy,255);
const bullet=attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}],damage:99999},now+3001);assert.equal(bullet.length,1);assert.equal(bullet[0].damage,44);
advance(s,now+3250);assert(b.hp<b.profile.maxHp);assert.equal(neutral.hp,490);assert.equal(neutral.pos[0],200);
b.hp=1;attack(s,a,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},now+4000);advance(s,now+4250);assert.equal(s.duels.length,0);assert.deepEqual(b.pos,WORLD.spawn);assert.equal(b.hp,b.profile.maxHp);assert.deepEqual(a.pos,[100,120,0]);assert.equal(a.hp,a.profile.maxHp);assert.equal(s.events[0].winner,'a');
// The base does not cancel an accepted duel or block its abilities/projectiles.
const c=player('d'),d=player('e',[1100,0,0]);const s2=world(c,d);assert.equal(invite(s2,c,'e',now),null);reply(s2,d,s2.invites[0].id,true,now);
c.pos=[100,120,0];d.pos=[300,120,0];advance(s2,now+3100);assert.equal(s2.duels.length,1);assert(safe(c)&&safe(d));assert.equal(useAbility(s2,d,now+3100),true);
assert.equal(attack(s2,c,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},now+3100).length,1);advance(s2,now+3350);assert(d.hp<490);
advance(s2,now+300000);assert.equal(s2.duels.length,1,'No arbitrary timeout: fight until defeat');
c.connected=false;advance(s2,now+300100);assert.equal(s2.events.at(-1).reason,'disconnect');assert.equal(d.hp,490);
// Refusing a challenge never creates a duel.
const e=player('f',[0,120,0]),f=player('g',[200,120,0]),s3=world(e,f);invite(s3,e,f.id,now);reply(s3,f,s3.invites[0].id,false,now);assert.equal(s3.duels.length,0);assert.equal(attack(s3,e,{weapon:'laser',shots:[]},now+4000),null);
const p=player('loadout');equip(p,'bastion');assert.equal(p.profile.maxHp,1225);assert.equal(p.profile.attack,88);assert.equal(p.profile.speed,187);assert.equal(equip(p,'hacked'),false);
console.log('Shared world: mutual consent, countdown, server loadouts, neutral immunity, base duels, kill/respawn, no refuge or timeout, refusal, disconnect and abilities passed.');
