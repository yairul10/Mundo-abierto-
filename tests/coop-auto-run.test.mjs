import test from 'node:test';
import assert from 'node:assert/strict';
import {COOP_RESUME_KEY,coopAutoConfig,coopStopReached,consumeCoopResume,prepareCoopRepeat,coopAutoShouldRepeat,canRepeatCoopRoom} from '../js/coop-auto-run.js';
import {FARM_MAPS,farmConfig} from '../js/farm-pilot.js';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const ids=['pvp-coloso-1','pvp-coloso-2','pvp-coloso-3','coop-inferno-pro','pvp-gran-titan','pvp-super-boss'];
test('AUTO offers Inferno in the cemetery, preserves existing choices and can select it',()=>{
 assert.equal(FARM_MAPS.graveyard.enemies.inferno,'Inferno');const config=farmConfig({map:'graveyard',selections:{graveyard:['stalker','inferno']}});assert.deepEqual(config.selections.graveyard,['stalker','inferno']);assert.deepEqual(farmConfig({selections:{graveyard:['stalker']}}).selections.graveyard,['stalker']);
});
test('repeat checkpoints require actual dead bosses from the authoritative room, in corridor order',()=>{
 const s={room:{status:'active'},enemies:ids.map(id=>({id,hp:100}))};assert.equal(coopStopReached(s,'colossi'),false);for(let i=0;i<3;i++)s.enemies[i].hp=0;assert.equal(coopStopReached(s,'colossi'),true);assert.equal(coopStopReached(s,'inferno'),false);s.enemies[3].hp=0;assert.equal(coopStopReached(s,'inferno'),true);assert.equal(coopStopReached(s,'titan'),false);s.enemies[4].hp=0;assert.equal(coopStopReached(s,'titan'),true);assert.equal(coopStopReached(s,'all'),false);s.room.status='completed';assert.equal(coopStopReached(s,'all'),true);s.enemies=[];assert.equal(coopStopReached(s,'colossi'),false);assert.equal(coopStopReached({},'all'),false);assert.deepEqual(coopAutoConfig({repeat:'yes',stop:'bad'}),{repeat:false,repeatOnDefeat:false,stop:'all'});
});
test('repeat flushes progress before leaving, requests a NEW private and consumes an account-bound one-shot resume',async()=>{
 const session=store(),events=[];let choice;const now=10000;
 const ok=await prepareCoopRepeat({session,owner:'play:p',realm:'normal',now,shouldContinue:()=>true,flush:async()=>{events.push('flush');return {status:'stored'}},saveChoice:value=>{choice=value;events.push('choice')},leave:()=>events.push('leave'),navigate:()=>events.push('navigate')});assert.equal(ok,true);assert.deepEqual(events,['flush','choice','leave','navigate']);assert.deepEqual(choice,{action:'create'});assert.equal(consumeCoopResume(session,{owner:'play:p',realm:'normal',choice,now:10001}),true);assert.equal(consumeCoopResume(session,{owner:'play:p',realm:'normal',choice,now:10001}),false);
});
test('manual control, account changes, common rooms, expiration and storage failures never trigger a restart',async()=>{
 const session=store();let allowed=true,left=0;const base={session,owner:'play:p',realm:'normal',now:10000,shouldContinue:()=>allowed,saveChoice(){},leave(){left++},navigate(){}};
 assert.equal(await prepareCoopRepeat({...base,flush:async()=>{allowed=false}}),false);assert.equal(left,0);
 for(const overrides of [{owner:'play:other'},{realm:'test'},{choice:{action:'common'}},{now:200000}]){session.setItem(COOP_RESUME_KEY,JSON.stringify({owner:'play:p',realm:'normal',expiresAt:100000}));assert.equal(consumeCoopResume(session,{owner:'play:p',realm:'normal',now:10000,choice:{action:'create'},...overrides}),false)}
 for(const options of [{owner:'play:other',realm:'normal',choice:{action:'create'},now:10001},{owner:'play:p',realm:'test',choice:{action:'create'},now:10001},{owner:'play:p',realm:'normal',choice:{action:'common'},now:10001},{owner:'play:p',realm:'normal',choice:{action:'create'},now:100000}]){session.setItem(COOP_RESUME_KEY,JSON.stringify({owner:'play:p',realm:'normal',expiresAt:90000}));assert.equal(consumeCoopResume(session,options),false);assert.equal(session.getItem(COOP_RESUME_KEY),null)}
 allowed=true;await assert.rejects(prepareCoopRepeat({...base,session:{...session,setItem(){throw Error('quota')}}}),/quota/);assert.equal(left,0);assert.equal(await prepareCoopRepeat({...base,owner:'guest:p'}),false);
});

test('defeat repetition is an independent opt-in and survives saved settings',()=>{
 assert.equal(coopAutoShouldRepeat({},'defeat'),false);
 assert.equal(coopAutoShouldRepeat({repeat:true},'defeat'),false);
 assert.equal(coopAutoShouldRepeat({repeatOnDefeat:true},'defeat'),true);
 assert.equal(coopAutoShouldRepeat({repeatOnDefeat:true},'completed'),false);
 assert.equal(coopAutoShouldRepeat({repeat:true,repeatOnDefeat:false},'completed'),true);
 assert.equal(coopAutoShouldRepeat({repeat:true,repeatOnDefeat:true},'other'),false);
 const value=coopAutoConfig(JSON.parse(JSON.stringify({repeat:false,repeatOnDefeat:true,stop:'inferno'})));
 assert.deepEqual(value,{repeat:false,repeatOnDefeat:true,stop:'inferno'});
 assert.equal(coopAutoShouldRepeat({repeatOnDefeat:'yes'},'defeat'),false);
});
test('only a server-confirmed second cooperative death permits defeat repetition',()=>{
 const snapshot={room:{status:'active'},rules:{autoFarmPro:true}};
 const dead={hp:0,coopEliminated:true,coopDeaths:2,livesRemaining:0,adminShipAllowed:true};
 assert.equal(canRepeatCoopRoom(snapshot,dead,'defeat'),true);
 for(const patch of [{hp:100},{coopEliminated:false},{coopDeaths:1},{livesRemaining:1},{adminShipAllowed:false},{coopDeaths:undefined}]){
  assert.equal(canRepeatCoopRoom(snapshot,{...dead,...patch},'defeat'),false);
 }
 assert.equal(canRepeatCoopRoom({...snapshot,match:{mode:'1v1'}},dead,'defeat'),false);
 assert.equal(canRepeatCoopRoom({rules:snapshot.rules},dead,'defeat'),false);
 assert.equal(canRepeatCoopRoom({...snapshot,rules:{autoFarmPro:false}},dead,'defeat'),false);
 assert.equal(canRepeatCoopRoom(snapshot,dead,'completed'),false);
 assert.equal(canRepeatCoopRoom(snapshot,{...dead,hp:100,coopEliminated:false},'completed'),true);
 assert.equal(canRepeatCoopRoom(snapshot,dead,'unknown'),false);
});
test('second-death repeat waits for the backup, creates a fresh private and resumes only once',async()=>{
 const session=store(),events=[],snapshot={room:{status:'active'},rules:{autoFarmPro:true}};
 const dead={hp:0,coopEliminated:true,coopDeaths:2,livesRemaining:0,adminShipAllowed:true};
 const config={repeat:false,repeatOnDefeat:true};let running=true,release,choice;
 const allowed=()=>running&&coopAutoShouldRepeat(config,'defeat')&&canRepeatCoopRoom(snapshot,dead,'defeat');
 const task=prepareCoopRepeat({session,owner:'play:p',realm:'normal',now:10000,shouldContinue:allowed,
  flush:()=>new Promise(resolve=>{events.push('flush');release=resolve}),saveChoice:value=>{choice=value;events.push('choice')},
  leave(){events.push('leave')},navigate(){events.push('navigate')}});
 await Promise.resolve();assert.deepEqual(events,['flush']);assert.equal(session.getItem(COOP_RESUME_KEY),null);
 release({status:'stored'});assert.equal(await task,true);assert.deepEqual(choice,{action:'create'});
 assert.deepEqual(events,['flush','choice','leave','navigate']);
 assert.equal(consumeCoopResume(session,{owner:'play:p',realm:'normal',choice,now:10001}),true);
 assert.equal(consumeCoopResume(session,{owner:'play:p',realm:'normal',choice,now:10001}),false);
 assert.equal(dead.coopDeaths,2,'the eliminated pilot and old room are never reset to grant extra lives');
});
test('failed backups and manual cancellation prevent second-death restarts',async()=>{
 for(const outcome of ['paused','offline','throw','cancel']){
  const session=store();let running=true,effects=0;
  const base={session,owner:'play:p',realm:'normal',shouldContinue:()=>running,saveChoice(){effects++},leave(){effects++},navigate(){effects++}};
  const ok=await prepareCoopRepeat({...base,flush:async()=>{
   if(outcome==='throw')throw Error('network');
   if(outcome==='cancel'){running=false;return {status:'stored'}}
   return {status:outcome};
  }});
  assert.equal(ok,false);assert.equal(effects,0);assert.equal(session.getItem(COOP_RESUME_KEY),null);
 }
});
