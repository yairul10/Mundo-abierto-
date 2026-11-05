import assert from 'node:assert/strict';
import {WORLD,equip,importRoster,advance,attack,canDamage,protectedAt,updateProtection,openHangar,applyHangarLoadout} from './world-rules.mjs';
import {groupAction,groupFor,splitGroupRewards} from './groups.mjs';
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

// The opening hit owns the valid kill even when another pilot lands the last hit.
{
 const first=player('first'),last=player('last',4200),victim=player('victim',4300),s=world(first,last,victim);
 last.pos[2]=200;
 attack(s,first,{weapon:'laser',shots:[shot]},t);
 advance(s,t+100);
 assert.equal(victim.firstHostileHit.id,first.id);
 last.pos[2]=0;victim.hp=1;
 attack(s,last,{weapon:'laser',shots:[shot]},t+101);
 advance(s,t+200);
 assert.equal(victim.lastDamagedBy,last.id);
 assert.equal(s.pendingKills[0].winner,first.id);
 assert.equal(s.bossRewards.find(r=>r.id.startsWith('pvp:')).playerId,first.id);
}

// Invitations are consensual, capacity is server-owned, and shares conserve currency.
{
 const pilots=['a','b','c','d','e'].map(id=>player(id));
 const [a,b,c,d,e]=pilots,s=world(...pilots);
 for(const pilot of [b,c,d]){
  assert.equal(groupAction(s,a,{type:'groupInvite',target:pilot.id},t),null);
  const id=s.groupInvites[0].id;
  assert.equal(groupAction(s,e,{type:'groupReply',id,accept:true},t),'group_unavailable');
  assert.equal(groupAction(s,pilot,{type:'groupReply',id,accept:true},t),null);
 }
 assert.equal(groupAction(s,a,{type:'groupInvite',target:e.id},t),'group_full');
 assert.equal(groupFor(s,a.id).members.length,4);
 d.pos[0]=5800;
 const receipts=[{playerId:a.id,amount:100,xp:27,materials:{nucleoNexo:3}},{playerId:b.id,amount:1,xp:2},{playerId:d.id,amount:9,xp:4}];
 s.bossRewards=[...receipts];
 splitGroupRewards(s,{pos:a.pos,instanceId:'boss',contributions:{a:100,b:1,d:9}},receipts,()=>true);
 assert.deepEqual(receipts.map(r=>[r.amount,r.xp]),[[51,15],[50,14],[9,4]]);
 assert.equal(receipts[0].materials.nucleoNexo,3);
 assert.equal(groupAction(s,a,{type:'groupLeave'},t),null);
 assert.deepEqual(groupFor(s,b.id).members,['b','c','d']);
}

// AUTO Pro uses ordinary PvE-zone volleys and never accepts pilots as targets.
{
 const admin=player('farm-admin',1000),other=player('nearby',1100),s=world(admin,other);
 const farm={autoFarm:true,weapon:'laser',targetId:'pvp-gran-titan',shots:[shot]};
 assert.equal(attack(s,admin,farm,t),null,'ordinary account cannot use AUTO Pro');
 admin.adminShipAllowed=true;
 assert.equal(attack(s,admin,{...farm,targetId:other.id},t),null,'players are invalid targets');
 assert(attack(s,admin,farm,t),'admin can fire at a PvE-zone NPC');
 admin.pos=[4100,120,0];
 assert.equal(attack(s,admin,farm,t+1000),null,'AUTO Pro is blocked in the hostile zone');
 admin.pos=[1000,120,0];admin.duelId='active-duel';
 assert.equal(attack(s,admin,farm,t+2000),null,'AUTO Pro is blocked in duels');
}
