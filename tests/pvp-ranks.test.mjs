import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {pvpRank,PVP_RANKS,rankedName} from '../js/pvp-ranks.js';
import {initResults,persistResults,pilotRanks,rankings} from '../server/pvp/pvp-results.mjs';
test('All rank boundaries, zero kills and invalid/unknown stats',()=>{
 for(const [position,id] of [[1,'emperor'],[2,'general'],[3,'general'],[4,'colonel'],[10,'colonel'],[11,'lieutenant'],[25,'lieutenant'],[26,'commander'],[50,'commander'],[51,'captain'],[100,'captain'],[101,'sublieutenant'],[999,'sublieutenant']])assert.equal(pvpRank({position,kills:1}).id,id);
 for(const stats of [null,undefined,{}, {kills:0,position:1},{kills:100,position:-1},{kills:1,position:1.5}])assert.equal(pvpRank(stats).id,'cadet');
 assert.equal(new Set(PVP_RANKS.map(r=>r.name)).size,8);
});
test('SQLite kills own the rank, including ties, new kills, top100 and restart',()=>{
 const db=new DatabaseSync(':memory:'),ctx={storage:{sql:{exec(q,...args){const rows=db.prepare(q).all(...args);return {toArray:()=>rows}}}}};
 try{initResults(ctx);for(let i=0;i<105;i++)db.prepare('INSERT INTO pvp_ranking VALUES(?,?,?,?)').run(String(i).padStart(3,'0'),'Pilot'+i,200-i,999999-i);
  assert.deepEqual(pilotRanks(ctx,['000','104','new']),{'000':{kills:200,position:1},'104':{kills:96,position:105},new:{kills:0,position:0}});
  db.prepare('UPDATE pvp_ranking SET kills=200 WHERE player_id=?').run('001');assert.equal(pilotRanks(ctx,['001'])['001'].position,2);
  persistResults(ctx,{pendingKills:[{id:'kill',winner:'001',victim:'other',name:'Winner',xp:1,time:123}]});
  const ranks=rankings(ctx,'001');assert.equal(ranks.kills.top.length,100);assert.equal(ranks.kills.mine.position,1);assert.equal(pilotRanks(ctx,['000'])['000'].position,2);
  // No offline XP or client rank field can promote a new pilot.
  assert.equal(pvpRank(pilotRanks(ctx,['new']).new).id,'cadet');
 }finally{db.close()}
});
test('Insignia precedes safe player text and updates when rank changes',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({style:{},setAttribute(k,v){this[k]=v}}),createTextNode:text=>({text})};
 try{const el={dataset:{},replaceChildren(...children){this.children=children;this.writes=(this.writes||0)+1}};
  rankedName(el,'<pilot>',{kills:3,position:1});assert.equal(el.children[0]['aria-label'],'Emperador');assert.equal(el.children[1].text,'<pilot>');
  rankedName(el,'<pilot>',{kills:3,position:1});assert.equal(el.writes,1);
  rankedName(el,'<pilot>',{kills:3,position:4});assert.equal(el.children[0]['aria-label'],'Coronel');assert.equal(el.writes,2);
 }finally{globalThis.document=previous}
});
