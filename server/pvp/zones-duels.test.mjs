import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD,equip,reset,advance,attack,canDamage,combatEligible,protectedAt,openHangar,invite,reply,zoneOf,finishDuel} from './world-rules.mjs';
import {awardKill,qualifies,KILL_WINDOW,xpForLevel,initResults,persistResults,rankings} from './pvp-results.mjs';
import {requestRespawn,confirmRespawn} from './respawn.mjs';
import {DatabaseSync} from 'node:sqlite';
const t=100000;
function player(id,x=1200,level=100){const p={id,name:id,pos:[x,120,0],connected:true,roster:{aurora:{maxHp:500,maxEnergy:500,attack:100,defense:0,speed:220,level}},spawn:[0,120,0]};equip(p,'aurora');return p}
const world=(...players)=>({players,duels:[],invites:[],events:[],bullets:[],simTime:t,realm:'normal'});
test('zones isolate PvE pilots, hostile combat, base and NPC attacks; ships cannot shoot across the border',()=>{
 const a=player('a'),b=player('b',1300),c=player('c',2100),d=player('d',2200),base=player('base',0),s=world(a,b,c,d,base);advance(s,t);
 assert.equal(zoneOf(a),'pve');assert.equal(zoneOf(c),'hostile');assert.equal(canDamage(a,b,t),false);assert.equal(canDamage(c,d,t),true);assert.equal(canDamage(c,a,t),false);assert.equal(canDamage(d,base,t),false);
 const gran=s.arenaEnemies.find(e=>e.kind==='granTitanPro'),nexo=s.arenaEnemies.find(e=>e.kind==='nexo');assert.equal(canDamage(a,gran,t),true);assert.equal(canDamage(gran,a,t),true);assert.equal(canDamage(a,nexo,t),false);assert.equal(canDamage(c,nexo,t),true);assert.equal(canDamage(nexo,a,t),false);
 const edge=player('edge',1790);s.players.push(edge);const shots=attack(s,edge,{weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]},t);assert(shots);advance(s,t+100);assert.equal(s.bullets.some(b=>b.owner==='edge'),false,'Crossing the boundary consumes the projectile');
});
test('duels require acceptance, count down, ignore outside pilots/NPCs and continue inside base',()=>{
 const a=player('a'),b=player('b',1300),c=player('c',1400),s=world(a,b,c);advance(s,t);
 assert.equal(invite(s,a,b.id,t),null);assert(!a.duelId);assert.equal(reply(s,b,s.invites[0].id,true,t),null);assert(a.duelId);assert.equal(canDamage(a,b,t+2999),false);assert.equal(canDamage(a,b,t+3000),true);assert.equal(canDamage(a,c,t+3000),false);
 const npc=s.arenaEnemies.find(e=>e.kind==='granTitanPro');assert.equal(canDamage(npc,a,t+3000),false);assert.equal(canDamage(a,npc,t+3000),false);
 advance(s,t+3100);assert(a.duelId,'The simulation must preserve an accepted duel');a.pos=[0,120,0];assert.equal(protectedAt(a,t+6000),false);assert.equal(canDamage(a,b,t+6000),true);assert.equal(openHangar(s,a,t+6000),'base_only');
 b.hp=0;advance(s,t+6001);assert.equal(s.duels.length,0);assert.equal(b.hp,b.profile.maxHp);assert.equal(b.death,undefined);assert.equal(s.pendingKills?.length||0,0);assert.equal(protectedAt(a,t+6001),true);
});
test('duel requests respect block/spam/combat guard and reject hostile or docked pilots',()=>{
 const a=player('a'),b=player('b',1300),s=world(a,b);advance(s,t);b.duelRequestsOff=true;assert.equal(invite(s,a,b.id,t),'duel_blocked');b.duelRequestsOff=false;b.lastIncoming=t-100;assert.equal(invite(s,a,b.id,t),'duel_busy');b.lastIncoming=0;assert.equal(invite(s,a,b.id,t),null);reply(s,b,s.invites[0].id,false,t);assert.equal(invite(s,a,b.id,t+1),'duel_wait');b.pos=[2100,120,0];assert.equal(invite(s,a,b.id,t+31000),'duel_zone');
});
test('level thresholds and three eligible kills per pair use a rolling five-hour window without global cap',()=>{
 const winner=player('winner',2100,199),victim=player('victim',2200,119),s=world(winner,victim);assert.equal(qualifies(winner,victim),false);victim.profile.level=120;assert.equal(qualifies(winner,victim),true);winner.profile.level=200;assert.equal(qualifies(winner,victim),false);victim.profile.level=150;assert.equal(qualifies(winner,victim),true);winner.profile.level=9999;assert(qualifies(winner,victim));
 for(let i=0;i<3;i++)assert(awardKill(s,winner,victim,t+i,'kill-'+i));assert.equal(awardKill(s,winner,victim,t+4,'blocked'),null);
 const restored=structuredClone(s);assert.equal(awardKill(restored,winner,victim,t+KILL_WINDOW-1,'still-blocked'),null);assert(awardKill(restored,winner,victim,t+KILL_WINDOW,'expired'));
 for(let i=0;i<20;i++)assert(awardKill(s,winner,player('other-'+i,2200,150),t+i,'other-'+i));assert.equal(s.pendingKills.length,23);assert.equal(s.pendingKills[0].xp,Math.round(xpForLevel(9999)*.01));
});
test('hostile destruction waits for a paid choice, including after world reconstruction',()=>{
 const a=player('a',2100,100),b=player('b',2200,60),s=world(a,b);b.hp=0;b.lastDamagedBy=a.id;advance(s,t);assert(b.death);assert.equal(b.hp,0);assert.equal(s.pendingKills.length,1);assert.equal(requestRespawn(s,b,{deathId:b.death.id,destination:'pvp',balance:4999}),'insufficient_credits');
 const restored=structuredClone(s),dead=restored.players.find(p=>p.id==='b');assert.equal(requestRespawn(restored,dead,{deathId:dead.death.id,destination:'pvp',balance:5000}),null);const bill=dead.death.bill;assert.equal(bill.cost,5000);assert.equal(requestRespawn(restored,dead,{deathId:dead.death.id,destination:'aurora',balance:10000}),null);assert.equal(dead.death.bill.id,bill.id);assert.equal(dead.death.bill.destination,'pvp','A pending debit cannot change destination');
 assert.equal(confirmRespawn(restored,dead,'wrong-id',reset),null);assert.equal(dead.hp,0);assert.equal(confirmRespawn(restored,dead,bill.id,reset).id,bill.id);assert.equal(dead.hp,dead.profile.maxHp);assert.equal(dead.death,null);assert.equal(confirmRespawn(restored,dead,bill.id,reset),null);
 for(const balance of [0,500,1000,10000]){const p=player('emergency');p.death={id:'death'};const state=world(p);state.recoveries={};assert.equal(requestRespawn(state,p,{deathId:'death',destination:'aurora',balance}),null);assert.equal(p.death.bill.cost,Math.min(balance,1000));}
});
test('rankings and reward ledger persist exactly once in the same SQLite transaction',()=>{
 const db=new DatabaseSync(':memory:'),ctx={storage:{sql:{exec(q,...args){const rows=db.prepare(q).all(...args);return {toArray:()=>rows}}}}};initResults(ctx);const s=world(),a=player('a',2100,100),b=player('b',2200,100);awardKill(s,a,b,t,'once');db.exec('BEGIN');persistResults(ctx,s);db.exec('COMMIT');persistResults(ctx,s);const ranks=rankings(ctx,'a');assert.equal(ranks.kills.top[0].kills,1);assert.equal(ranks.xp.mine.xp,Math.round(xpForLevel(100)*.01));assert.equal(ranks.kills.mine.position,1);db.close();
});
