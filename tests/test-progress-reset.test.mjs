import assert from 'node:assert/strict';
import {createTestProgressReset} from '../js/test-progress-reset.js';
const QA='mundoAbierto.qaPlayer',NORMAL='mundoAbierto.player';
const old=JSON.stringify({level:138,gold:726396,shipId:'segadora'}),normal=JSON.stringify({level:90,gold:500000});
function storage(){const data=new Map([[QA,old],[NORMAL,normal],['cosmosLegacy.activeProfile.v2','play:123']]);return {data,getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem:(k,v)=>data.set(k,v)}}
// Previous reset deletes the key, then beforeunload saves the old in-memory pilot.
const legacy=storage();legacy.removeItem(QA);legacy.setItem(QA,old);assert.equal(legacy.getItem(QA),old);
const db=storage();let reloads=0,guard;
const save=()=>{if(guard.pending)return false;db.setItem(QA,old);return true};
guard=createTestProgressReset({storage:db,isTest:()=>true,isPvp:()=>false,reload(){reloads++;assert.equal(guard.pending,true);assert.equal(save(),false)}});
assert.equal(guard.reset(),true);assert.equal(reloads,1);assert.equal(db.getItem(QA),null);assert.equal(db.getItem(NORMAL),normal);assert.equal(db.getItem('cosmosLegacy.activeProfile.v2'),'play:123');assert.equal(save(),false);assert.equal(guard.reset(),false);
// A new page starts without the old QA pilot; normal progress is unchanged.
const restarted=JSON.parse(db.getItem(QA)||'{}');assert.deepEqual(restarted,{});
for(const [test,pvp]of [[false,false],[true,true]]){const db=storage(),r=createTestProgressReset({storage:db,isTest:()=>test,isPvp:()=>pvp,reload(){throw Error('must not reload')}});assert.equal(r.reset(),false);assert.equal(r.pending,false);assert.equal(db.getItem(QA),old);assert.equal(db.getItem(NORMAL),normal)}
const broken=storage();broken.removeItem=()=>{throw Error('storage blocked')};const failure=createTestProgressReset({storage:broken,isTest:()=>true,isPvp:()=>false,reload(){}});assert.throws(()=>failure.reset(),/storage blocked/);assert.equal(failure.pending,false);assert.equal(broken.getItem(QA),old);
console.log('QA reset: old unload-save regression, saving frozen before reload, normal/profile isolation, repeat guards and storage failure recovery.');
