import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBossReceipts,saveBossReceipts} from '../js/pvp-boss-rewards.js';
import {PVP_MISSIONS} from '../js/pvp-missions.js';
import {createMissionBoard,CEMETERY_MISSIONS} from '../js/mission-board.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
const source=()=>({level:60,xp:0,gold:100,maxHp:500,hp:500,maxEnergy:100,energy:100,quests:{board:{version:1,completed:['cemetery-arrival'],progress:{'cemetery-titans':[3]},flags:{}}}});
const receipt=(enemyKind,id=enemyKind)=>({id,enemyKind,bossId:'boss-'+id,damage:10,totalDamage:100,amount:1000,xp:50});
test('Both Pro missions award once, retain PvE progress, and survive repeated receipts',()=>{
 const a=source(),r=applyBossReceipts(a,[receipt('colossusPro'),receipt('granTitanPro')]);assert.equal(r.missions.length,2);assert.equal(r.pilot.gold,302100);assert.equal(r.addedXp,90100);assert.equal(r.pilot.quests.board.progress['cemetery-titans'][0],3);assert.equal(a.gold,100);
 const replay=applyBossReceipts(JSON.parse(JSON.stringify(r.pilot)),[receipt('colossusPro'),receipt('granTitanPro')]);assert.equal(replay.added,0);assert.equal(replay.missions.length,0);
 const another=applyBossReceipts(r.pilot,[receipt('colossusPro','new-spawn')]);assert.equal(another.added,1000);assert.equal(another.missions.length,0);
});
test('No credit for normal bosses, escorts, hostile super boss, missing participation or locked level',()=>{
 for(const enemyKind of ['carrier','granTitan','reinforcement','nexo',undefined])assert.equal(applyBossReceipts(source(),[receipt(enemyKind)]).missions.length,0);
 for(const damage of [0,-1,Infinity,NaN,200])assert.equal(applyBossReceipts(source(),[{...receipt('colossusPro'),damage}]).missions.length,0);
 for(const level of [1,59,undefined])assert.equal(applyBossReceipts({...source(),level},[receipt('colossusPro')]).missions.length,0);
});
test('Mission rewards and receipt IDs commit together, retry after failed storage remains valid',()=>{
 const a=source();assert.throws(()=>saveBossReceipts({setItem(){throw Error('quota')}},'save',a,[receipt('colossusPro')]));assert.equal(a.quests.pvpMissions,undefined);
 let saved;const result=saveBossReceipts({setItem(k,v){saved=JSON.parse(v)}},'save',a,[receipt('colossusPro')]);assert.equal(saved.gold,101100);assert.deepEqual(saved.pvpBossReceipts,['colossusPro']);assert.equal(applyBossReceipts(saved,[receipt('colossusPro')]).missions.length,0);assert.equal(result.missions.length,1);
});
test('Unified mission list reflects receipts but cannot grant PvP rewards from offline events',()=>{
 const a=source(),catalog=[...CEMETERY_MISSIONS,...PVP_MISSIONS];let board=createMissionBoard(catalog,a.quests);assert.equal(board.remaining(59).filter(m=>m.realm==='pvp').length,0);assert.equal(board.remaining(60).filter(m=>m.realm==='pvp').length,4);
 assert.equal(board.event('pvpColossus','pvp',60).length,0);assert.equal(board.state.progress['pvp-first-colossus'][0],0);
 const r=applyBossReceipts(a,[receipt('colossusPro')]);board=createMissionBoard(catalog,r.pilot.quests);assert.equal(board.remaining(60).filter(m=>m.realm==='pvp').length,3);assert.ok(board.state.completed.includes('pvp-first-colossus'));assert.equal(board.state.progress['cemetery-titans'][0],3);
});
test('Hangar receipt serialization preserves offline location, stats and new quest completion',()=>{
 const a={...source(),x:40000,y:100,sector:'graveyard'},editor=createHangarEditor(a);let saved;
 saveBossReceipts({setItem(k,v){saved=JSON.parse(v)}},'save',editor,[receipt('granTitanPro')],p=>serializeHangarEditor(p,a));
 assert.equal(saved.x,40000);assert.equal(saved.sector,'graveyard');assert.ok(saved.quests.pvpMissions.completed.includes('pvp-first-titan'));assert.equal(saved.gold,201100);
});

test('Single-boss missions give one Nexus core; fifth boss gives three more in parallel',()=>{
 let p=source();
 for(let i=1;i<=5;i++){
  const r=applyBossReceipts(p,[receipt('colossusPro','colossus-'+i),receipt('granTitanPro','titan-'+i)]);p=JSON.parse(JSON.stringify(r.pilot));
  assert.equal(r.missionCores,i===1?2:i===5?6:0);
  assert.equal(p.loot.nucleoNexo,i<5?2:8);
  const b=createMissionBoard([...CEMETERY_MISSIONS,...PVP_MISSIONS],p.quests);b.remaining(60);assert.equal(b.state.progress['pvp-five-colossi'][0],i);assert.equal(b.state.progress['pvp-five-titans'][0],i);
 }
 assert.equal(p.quests.pvpMissions.completed.length,4);
 const extra=applyBossReceipts(p,[receipt('colossusPro','colossus-6')]);assert.equal(extra.missionCores,0);assert.equal(extra.pilot.loot.nucleoNexo,8);
 assert.equal(p.gold,310100,'Five-boss missions add cores only; previous credit prizes are preserved');
});
test('One boss instance cannot advance five-kill counters twice under different delivery IDs',()=>{
 const first=receipt('colossusPro','one'),r=applyBossReceipts(source(),[first,{...first,id:'another-delivery'}]);
 assert.equal(r.pilot.quests.pvpMissions.progress['pvp-five-colossi'],1);assert.equal(r.missionCores,1);
});
test('Previously completed first mission receives its new core once and counts as one of five',()=>{
 const p=source();p.quests.pvpMissions={completed:['pvp-first-colossus']};p.pvpBossReceipts=['old'];
 const board=createMissionBoard([...CEMETERY_MISSIONS,...PVP_MISSIONS],p.quests);board.remaining(60);assert.equal(board.state.progress['pvp-five-colossi'][0],1);
 const r=applyBossReceipts(p,[receipt('colossusPro','old')]);assert.equal(r.missionCores,1);assert.equal(r.added,0);assert.equal(applyBossReceipts(r.pilot,[receipt('colossusPro','old')]).missionCores,0);
 const next=applyBossReceipts(r.pilot,[receipt('colossusPro','new')]);assert.equal(next.pilot.quests.pvpMissions.progress['pvp-five-colossi'],2);assert.equal(next.missionCores,0);
});
test('Failed fifth-boss write cannot consume the three-core prize',()=>{
 let p=source();for(let i=0;i<4;i++)p=applyBossReceipts(p,[receipt('colossusPro','c'+i)]).pilot;
 assert.throws(()=>saveBossReceipts({setItem(){throw Error('quota')}},'save',p,[receipt('colossusPro','c4')]));assert.equal(p.loot.nucleoNexo,1);assert.equal(p.quests.pvpMissions.progress['pvp-five-colossi'],4);
 const result=saveBossReceipts({setItem(){}},'save',p,[receipt('colossusPro','c4')]);assert.equal(result.missionCores,3);assert.equal(result.pilot.loot.nucleoNexo,4);
});
