import test from 'node:test';import assert from 'node:assert/strict';
import {cloudSafetyCopy,restoreCloudSafetyCopy} from '../js/cloud-safety-copy.js';import {ensureProfiles,playProfile,switchProfile,checkpointProfile,WORKING_SAVE,profileKey} from '../js/account-storage.js';
class Storage{map=new Map();getItem(k){return this.map.get(k)??null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const progress=(level,gold)=>({level,gold,xp:10,maxHp:100,maxEnergy:100,attack:10,defense:5,speed:220,quests:{},ownedShips:{aurora:true,titan:level===180},upgrades:{laserSpeed:level===180?4:1}});
function setup(){const s=new Storage();ensureProfiles(s);const owner=playProfile('account-a');switchProfile(s,owner);s.setItem(WORKING_SAVE,JSON.stringify(progress(178,821686)));checkpointProfile(s);return {s,owner}}
test('safety recovery preserves the replaced current copy and restores the exact newer purchase snapshot',()=>{
 const {s,owner}=setup(),raw=JSON.stringify(progress(180,1312726));s.setItem(profileKey(owner)+'.beforeCloudRestore',JSON.stringify({schema:2,owner,createdAt:'2026-11-15',raw}));const current=s.getItem(WORKING_SAVE);
 assert.equal(cloudSafetyCopy(s,owner).unassigned,false);restoreCloudSafetyCopy(s,owner,{expectedRaw:raw});assert.equal(s.getItem(WORKING_SAVE),raw);assert.equal(s.getItem(profileKey(owner)),raw);assert.equal(JSON.parse(s.getItem(profileKey(owner)+'.beforeSafetyRecovery')).raw,current);assert.equal(JSON.parse(s.getItem(WORKING_SAVE)).upgrades.laserSpeed,4);
});
test('legacy copies require explicit ownership confirmation, and known copies cannot cross Google accounts',()=>{
 const {s,owner}=setup(),raw=JSON.stringify(progress(180,1312726));s.setItem('cosmosLegacy.beforeCloudRestore.v1',JSON.stringify({schema:1,raw}));assert.equal(cloudSafetyCopy(s,owner).unassigned,true);assert.throws(()=>restoreCloudSafetyCopy(s,owner),/Confirma/);restoreCloudSafetyCopy(s,owner,{allowUnassigned:true,expectedRaw:raw});
 s.setItem('cosmosLegacy.beforeCloudRestore.v1',JSON.stringify({schema:2,owner:playProfile('account-b'),raw}));assert.equal(cloudSafetyCopy(s,owner),null);assert.throws(()=>restoreCloudSafetyCopy(s,playProfile('account-b')),/Cambió/);
});
test('quota failure or a changed backup never overwrites the active save',()=>{
 const {s,owner}=setup(),current=s.getItem(WORKING_SAVE),raw=JSON.stringify(progress(180,1312726));s.setItem(profileKey(owner)+'.beforeCloudRestore',JSON.stringify({schema:2,owner,raw}));assert.throws(()=>restoreCloudSafetyCopy(s,owner,{expectedRaw:'different'}),/cambió/);assert.equal(s.getItem(WORKING_SAVE),current);
 const write=s.setItem.bind(s);s.setItem=(key,value)=>{if(key.endsWith('.beforeSafetyRecovery'))throw Error('quota');write(key,value)};assert.throws(()=>restoreCloudSafetyCopy(s,owner,{expectedRaw:raw}),/quota/);assert.equal(s.getItem(WORKING_SAVE),current);
});
