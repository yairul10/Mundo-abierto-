import test from 'node:test';
import assert from 'node:assert/strict';
import {COOP_RESUME_KEY,coopAutoConfig,coopStopReached,consumeCoopResume,prepareCoopRepeat} from '../js/coop-auto-run.js';
import {FARM_MAPS,farmConfig} from '../js/farm-pilot.js';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const ids=['pvp-coloso-1','pvp-coloso-2','pvp-coloso-3','coop-inferno-pro','pvp-gran-titan','pvp-super-boss'];
test('AUTO offers Inferno in the cemetery, preserves existing choices and can select it',()=>{
 assert.equal(FARM_MAPS.graveyard.enemies.inferno,'Inferno');const config=farmConfig({map:'graveyard',selections:{graveyard:['stalker','inferno']}});assert.deepEqual(config.selections.graveyard,['stalker','inferno']);assert.deepEqual(farmConfig({selections:{graveyard:['stalker']}}).selections.graveyard,['stalker']);
});
test('repeat checkpoints require actual dead bosses from the authoritative room, in corridor order',()=>{
 const s={room:{status:'active'},enemies:ids.map(id=>({id,hp:100}))};assert.equal(coopStopReached(s,'colossi'),false);for(let i=0;i<3;i++)s.enemies[i].hp=0;assert.equal(coopStopReached(s,'colossi'),true);assert.equal(coopStopReached(s,'inferno'),false);s.enemies[3].hp=0;assert.equal(coopStopReached(s,'inferno'),true);assert.equal(coopStopReached(s,'titan'),false);s.enemies[4].hp=0;assert.equal(coopStopReached(s,'titan'),true);assert.equal(coopStopReached(s,'all'),false);s.room.status='completed';assert.equal(coopStopReached(s,'all'),true);s.enemies=[];assert.equal(coopStopReached(s,'colossi'),false);assert.equal(coopStopReached({},'all'),false);assert.deepEqual(coopAutoConfig({repeat:'yes',stop:'bad'}),{repeat:false,stop:'all'});
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
