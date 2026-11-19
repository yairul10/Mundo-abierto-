import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionBoard} from '../js/mission-board.js';
import {applyBossReceipts} from '../js/pvp-boss-rewards.js';
const kill=(b,types,sector='aurora')=>b.event(types,sector,120,{kill:true});
test('kills choose one incomplete eligible objective including missile, while loot stays parallel',()=>{
 const q={},b=createMissionBoard([
  {id:'first',level:1,objectives:[{event:'scout',goal:1}]},
  {id:'missile',level:2,objectives:[{event:'missileKill',goal:1}]},
  {id:'late',level:3,objectives:[{event:'scout',goal:2}]},
  {id:'loot1',level:1,objectives:[{event:'loot',goal:1}]},
  {id:'loot2',level:1,objectives:[{event:'loot',goal:1}]}
 ],q);
 assert.equal(kill(b,['scout','missileKill'])[0].id,'first');
 assert.equal(b.state.progress.missile[0],0);assert.equal(b.state.progress.late[0],0);
 assert.equal(kill(b,['scout','missileKill'])[0].id,'missile');
 kill(b,['scout']);assert.equal(b.state.progress.late[0],1);
 assert.equal(b.event('loot','aurora',120).length,2);
 const restored=createMissionBoard([{id:'late',level:3,objectives:[{event:'scout',goal:2}]}],JSON.parse(JSON.stringify(q)));
 assert.equal(restored.state.progress.late[0],1);
});
test('one cooperative titan advances first, then five, then drone; repeated boss IDs do not spill',()=>{
 let p={level:100,gold:0,xp:0,quests:{}};const receipt=i=>({id:'r'+i,bossId:'b'+i,enemyKind:'granTitanPro',damage:10,totalDamage:20,amount:100});
 for(let i=0;i<6;i++)p=applyBossReceipts(p,[receipt(i)]).pilot;
 assert(p.quests.pvpMissions.completed.includes('pvp-first-titan'));
 assert(p.quests.pvpMissions.completed.includes('pvp-five-titans'));
 assert.equal(p.quests.pvpMissions.droneProgress,undefined);
 p=applyBossReceipts(p,[{...receipt(5),id:'retry'}]).pilot;assert.equal(p.quests.pvpMissions.droneProgress,undefined);
 p=applyBossReceipts(p,[receipt(6)]).pilot;assert.deepEqual(p.quests.pvpMissions.droneProgress,[0,1]);
});
test('existing displayed and recorded progress is preserved when migrating',()=>{
 let p={level:100,gold:0,xp:0,quests:{pvpMissions:{completed:['pvp-first-titan'],progress:{'pvp-five-titans':3},droneProgress:[5,7],bosses:['old']}}};
 const receipt={id:'r',bossId:'new',enemyKind:'granTitanPro',damage:1,totalDamage:2,amount:100};
 p=applyBossReceipts(p,[receipt]).pilot;
 assert.equal(p.quests.pvpMissions.progress['pvp-five-titans'],4);
 assert.deepEqual(p.quests.pvpMissions.droneProgress,[5,7]);
});

test('drone objective skips completed titan counts and keeps earlier bosses exclusive',()=>{
 let p={level:100,gold:0,xp:0,quests:{pvpMissions:{completed:['pvp-first-titan','pvp-five-titans'],exclusiveKillsV1:true,droneProgress:[49,39]}}};
 const r=(id,kind)=>({id,bossId:id,enemyKind:kind,damage:1,totalDamage:2,amount:1});
 p=applyBossReceipts(p,[r('t','granTitanPro')]).pilot;
 assert.deepEqual(p.quests.pvpMissions.droneProgress,[49,40]);
 p=applyBossReceipts(p,[r('t2','granTitanPro')]).pilot;
 assert.deepEqual(p.quests.pvpMissions.droneProgress,[49,40]);
 p=applyBossReceipts(p,[r('i','infernoPro')]).pilot;
 assert(p.quests.pvpMissions.completed.includes('coop-drone-pearl'));
});
