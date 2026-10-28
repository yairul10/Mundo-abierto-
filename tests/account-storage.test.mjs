import test from 'node:test';import assert from 'node:assert/strict';
import {WORKING_SAVE,ACTIVE_PROFILE,ensureProfiles,activeProfile,checkpointProfile,profileKey,switchProfile,playProfile,guestProfile,newGuestProfile,bindGuestProfile,profileMeta} from '../js/account-storage.js';
class Storage{map=new Map();getItem(k){return this.map.get(k)??null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const save=(level,ship='aurora')=>JSON.stringify({level,ownedShips:{[ship]:true},gold:level*100});
test('Legacy level 171 is backed up unchanged, assigned an offline guest ID, and never implicitly attached to Play',()=>{
 const s=new Storage(),raw=save(171,'azote');s.setItem(WORKING_SAVE,raw);const guest=ensureProfiles(s);assert(guest.startsWith('guest:'));assert.equal(s.getItem(profileKey(guest)),raw);assert.equal(JSON.parse(s.getItem('cosmosLegacy.unassignedProgress.v2')).raw,raw);assert.equal(profileMeta(s,guest).unassignedLegacy,true);assert.equal(ensureProfiles(s),guest);
});
test('Verified account slots, guest slots and new accounts never inherit each other; a new guest preserves linked accounts',()=>{
 const s=new Storage(),guest=ensureProfiles(s);s.setItem(WORKING_SAVE,save(171,'azote'));checkpointProfile(s);bindGuestProfile(s,{playerId:'a',displayName:'Cuenta A'});const a=activeProfile(s);switchProfile(s,playProfile('b'));assert.equal(s.getItem(WORKING_SAVE),null);s.setItem(WORKING_SAVE,save(1));checkpointProfile(s);switchProfile(s,a);assert.equal(s.getItem(WORKING_SAVE),save(171,'azote'));assert.notEqual(guestProfile(s),guest);switchProfile(s,guestProfile(s));assert.equal(s.getItem(WORKING_SAVE),null);assert.equal(s.getItem(profileKey(guest)),save(171,'azote'),'Consumed guest retained only as a backup');const fresh=newGuestProfile(s);assert.notEqual(fresh,guest);assert.equal(s.getItem(WORKING_SAVE),null);switchProfile(s,playProfile('b'));assert.equal(s.getItem(WORKING_SAVE),save(1));switchProfile(s,a);assert.equal(s.getItem(WORKING_SAVE),save(171,'azote'));
});
test('Explicit guest import backs up an existing target and checkpoint refuses a changed owner',()=>{
 const s=new Storage(),guest=ensureProfiles(s);s.setItem(WORKING_SAVE,save(171));checkpointProfile(s);switchProfile(s,playProfile('a'));s.setItem(WORKING_SAVE,save(71));checkpointProfile(s);switchProfile(s,guest);bindGuestProfile(s,{playerId:'a'});assert.equal(s.getItem(WORKING_SAVE),save(171));assert([...s.map].some(([k,v])=>k.includes('beforeGuestImport')&&v===save(71)));assert.throws(()=>checkpointProfile(s,guest),/cuenta cambió/);
});
test('Quota failures abort account switching before losing the active progress; interrupted switches recover from the journal',()=>{
 const s=new Storage(),guest=ensureProfiles(s),raw=save(171);s.setItem(WORKING_SAVE,raw);const set=s.setItem.bind(s);s.setItem=(k,v)=>{if(k.endsWith('.meta'))throw Error('quota');set(k,v)};assert.throws(()=>switchProfile(s,playProfile('a')),/quota/);assert.equal(s.getItem(WORKING_SAVE),raw);assert.equal(activeProfile(s),guest);s.setItem=set;
 s.setItem('cosmosLegacy.profileSwitch.v2',JSON.stringify({owner:guest,raw,target:playProfile('a')}));s.setItem(ACTIVE_PROFILE,playProfile('a'));s.setItem(WORKING_SAVE,save(1));ensureProfiles(s);assert.equal(activeProfile(s),guest);assert.equal(s.getItem(WORKING_SAVE),raw);
});
