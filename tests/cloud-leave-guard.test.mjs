import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmCloudBeforeLeave} from '../js/cloud-leave-guard.js';
import {prepareCoopRepeat,COOP_RESUME_KEY} from '../js/coop-auto-run.js';
test('leaving waits for an actual cloud confirmation instead of accepting an elapsed grace period',async()=>{
 let release,settled=false,prompts=0;const pending=confirmCloudBeforeLeave(()=>new Promise(resolve=>release=resolve),()=>{prompts++;return 'stay'}).then(value=>{settled=true;return value});await Promise.resolve();assert.equal(settled,false);assert.equal(prompts,0);release({status:'stored'});assert.equal(await pending,true);
});
test('paused or failed backups require retry, staying or an explicit local-only exit',async()=>{
 for(const status of ['paused','offline','no_save',undefined])assert.equal(await confirmCloudBeforeLeave(async()=>({status})),false);
 let attempts=0;assert.equal(await confirmCloudBeforeLeave(async()=>++attempts===1?{status:'offline'}:{status:'unchanged'},async()=>'retry'),true);assert.equal(attempts,2);
 assert.equal(await confirmCloudBeforeLeave(async()=>{throw Error('network')},async()=>'stay'),false);assert.equal(await confirmCloudBeforeLeave(async()=>({status:'offline'}),async()=>'local'),true);
});
test('automatic repetition cannot leave or set a resume marker while its cloud save is unconfirmed',async()=>{
 let effects=0;const result=await prepareCoopRepeat({session:{getItem(){return null},setItem(){effects++},removeItem(){}},owner:'play:p',realm:'normal',shouldContinue:()=>true,flush:async()=>({status:'paused'}),saveChoice(){effects++},leave(){effects++},navigate(){effects++}});assert.equal(result,false);assert.equal(effects,0);
});
