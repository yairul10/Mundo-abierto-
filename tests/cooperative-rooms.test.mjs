import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceExpedition,shareExpeditionRewards,roomMembers} from '../server/pvp/expedition.mjs';

const pilot=id=>({id,connected:true,hp:100,lastSeen:Date.now(),profile:{shipId:'aurora'}});
test('two deaths consume two lives; reconstructed state cannot consume or restore a life twice',()=>{
 let s={room:{code:'ABCDEF',status:'active'},players:[pilot('a'),pilot('b')],arenaEnemies:[{hp:10}],recoveries:{a:{}}};
 const reset=p=>{p.hp=100;p.pos=[0,0,0]};
 s.players[0].hp=0;s.players[0].death={id:'first'};advanceExpedition(s,Date.now(),reset);
 assert.equal(s.players[0].coopDeaths,1);assert.equal(s.players[0].hp,100);assert.equal(s.recoveries.a,undefined);
 s=JSON.parse(JSON.stringify(s));advanceExpedition(s,Date.now(),reset);assert.equal(s.players[0].coopDeaths,1);
 s.players[0].death={id:'second'};advanceExpedition(s,Date.now(),reset);
 assert.equal(s.players[0].coopDeaths,2);assert.equal(s.players[0].coopEliminated,true);assert.equal(s.players[0].hp,0);
 advanceExpedition(s,Date.now(),reset);assert.equal(s.players[0].coopDeaths,2);assert.deepEqual(s.groups[0].members,['b']);
});
test('shared awards conserve odd credits, XP and materials for 1–5 members, including non-shooters',()=>{
 for(let n=1;n<=5;n++){
  const players=Array.from({length:n},(_,i)=>pilot(String(i))),boss={instanceId:'boss',kind:'colossusPro',contributions:{0:100}};
  const s={room:{code:'ABCDEF'},players,bossRewards:[{bossId:'boss',amount:101,xp:53,materials:{nucleoNexo:3,chatarra:7},totalDamage:100}]};
  shareExpeditionRewards(s,boss,0);assert.equal(s.bossRewards.length,n);
  for(const [key,total]of [['amount',101],['xp',53]]){const values=s.bossRewards.map(r=>r[key]);assert.equal(values.reduce((a,b)=>a+b),total);assert.ok(Math.max(...values)-Math.min(...values)<=1)}
  for(const [key,total]of [['nucleoNexo',3],['chatarra',7]])assert.equal(s.bossRewards.reduce((a,r)=>a+(r.materials[key]||0),0),total);
  assert.equal(s.bossRewards.filter(r=>r.damage>0).length,1);
 }
});
test('completion includes surviving escorts and disconnected reservations expire without losing history',()=>{
 const now=Date.now(),p=pilot('a');p.connected=false;p.lastSeen=now-120001;
 const s={room:{code:'ABCDEF',status:'active'},players:[p,pilot('b')],arenaEnemies:[{hp:0},{hp:20}]};
 assert.equal(roomMembers(s,now).length,1);advanceExpedition(s,now,()=>{});assert.equal(s.room.status,'active');
 s.arenaEnemies[1].hp=0;advanceExpedition(s,now,()=>{});assert.equal(s.room.status,'completed');assert.ok(s.players.every(p=>p.exiting));assert.equal(s.players.length,2);
});
