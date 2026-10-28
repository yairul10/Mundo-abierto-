import test from 'node:test';import assert from 'node:assert/strict';
import {createCloudSave} from '../js/cloud-save-client.js';
import {startCloudSync} from '../js/account-start.js';
import {WORKING_SAVE,ensureProfiles,activeProfile,playProfile,switchProfile,checkpointProfile,bindGuestProfile,profileKey} from '../js/account-storage.js';
class Storage{map=new Map();getItem(k){return this.map.get(k)??null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const progress=(level=1)=>({name:'Pilot',classId:'aurora',level,xp:level*10,gold:level*100,loot:{},ownedShips:{aurora:true},shipId:'aurora',quests:{},maxHp:100,maxEnergy:100,attack:10,defense:5,speed:220});
let native='a',offline=false,rejectPut=false,puts=0,sessions=0,remotes;
function setup(){
 const storage=new Storage();globalThis.localStorage=storage;const events=new EventTarget();globalThis.window=events;window.MUNDO_PLAY_MODE={mode:'normal'};globalThis.addEventListener=events.addEventListener.bind(events);globalThis.dispatchEvent=events.dispatchEvent.bind(events);Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});globalThis.document={hidden:false,getElementById:()=>null,createElement:()=>({})};
 native='a';offline=false;rejectPut=false;puts=sessions=0;remotes=new Map([['a',{revision:1,progress:progress(71)}],['b',{revision:1,progress:progress(1)}]]);
 globalThis.Capacitor={Plugins:{CosmosPlayGames:{status:async()=>({authenticated:true,playerId:native,displayName:native}),serverAuthCode:async()=>({code:'code-'+native})}}};
 globalThis.fetch=async(url,o={})=>{
  if(offline)throw Error('offline');if(url.endsWith('/session')){sessions++;const id=JSON.parse(o.body).code.slice(5);return Response.json({authenticated:true,playerId:id,displayName:'Account '+id,sessionToken:'token-'+id,expiresIn:86400})}
  const id=o.headers.authorization.slice('Bearer token-'.length);if(o.method==='PUT'){puts++;if(rejectPut){rejectPut=false;return Response.json({error:'unauthorized'},{status:401})}const input=JSON.parse(o.body),old=remotes.get(id);if((old?.revision||0)!==input.revision)return Response.json({error:'revision_conflict'},{status:409});const revision=input.revision+1;remotes.set(id,{revision,progress:input.progress});return Response.json({revision})}return Response.json({save:remotes.get(id)||null});
 };ensureProfiles(storage);return storage;
}
const managed=onIdentity=>createCloudSave({apiUrl:'https://fixture.invalid',serverClientId:'fixture.apps.googleusercontent.com',manageProfiles:true,onIdentity:onIdentity||(async(identity)=>{if(activeProfile(localStorage)!==playProfile(identity.playerId))throw Object.assign(Error('account changed'),{accountChanged:true})})});
const select=(id,level)=>{switchProfile(localStorage,playProfile(id));localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(level)));checkpointProfile(localStorage);window.COSMOS_ACTIVE_PROFILE=activeProfile(localStorage)};
test('Guest level 171 requires explicit binding and conflict choice; the other Play account stays at level 1',async()=>{
 setup();localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(171)));const before=localStorage.getItem(WORKING_SAVE);checkpointProfile(localStorage);
 const refused=managed(async()=>{throw Error('explicit binding required')});await assert.rejects(refused.connect(),/binding/);assert.equal(puts,0);assert.equal(localStorage.getItem(WORKING_SAVE),before);
 const c=managed(id=>bindGuestProfile(localStorage,id));const result=await c.connect();assert.equal(result.status,'conflict');assert.equal(puts,0);c.resolveConflict('local');assert.equal((await c.sync()).status,'stored');assert.equal(remotes.get('a').progress.level,171);assert.equal(remotes.get('b').progress.level,1);
 native='b';switchProfile(localStorage,playProfile('b'));const other=managed();assert.equal((await other.connect()).status,'restore_required');other.resolveConflict('cloud');assert.equal(JSON.parse(localStorage.getItem(WORKING_SAVE)).level,1);switchProfile(localStorage,playProfile('a'));assert.equal(JSON.parse(localStorage.getItem(WORKING_SAVE)).level,171);
});
test('Known account progresses offline then reconnects and uploads pending changes without a false conflict',async()=>{
 setup();select('a',71);let c=managed();assert.equal((await c.connect()).status,'ready');assert.equal((await c.sync()).status,'unchanged');offline=true;localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(171)));checkpointProfile(localStorage);await assert.rejects(c.sync(),/offline/);offline=false;c=managed();const result=await c.connect({interactive:false});assert.equal(result.status,'ready');assert.equal(result.offlineChanges,true);assert.equal((await c.sync()).status,'stored');assert.equal(remotes.get('a').progress.level,171);
});
test('Remote changes from another device require explicit selection and retain a verified local backup',async()=>{
 setup();select('a',71);let c=managed();await c.connect();localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(171)));remotes.set('a',{revision:2,progress:progress(100)});c=managed();assert.equal((await c.connect()).status,'conflict');assert.equal((await c.sync()).status,'paused');assert.equal(puts,0);c.resolveConflict('cloud');assert.equal(JSON.parse(localStorage.getItem(WORKING_SAVE)).level,100);assert.equal(JSON.parse(JSON.parse(localStorage.getItem('cosmosLegacy.beforeCloudRestore.v1')).raw).level,171);
});
test('Expired session reconnects automatically; account change blocks upload and freezes PvP identity',async()=>{
 setup();select('a',71);const c=managed();await c.connect();localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(171)));rejectPut=true;const controller=await startCloudSync(c);try{assert(!c.active);assert.equal(remotes.get('a').progress.level,71);window.dispatchEvent(new Event('online'));for(let i=0;i<30&&remotes.get('a').progress.level!==171;i++)await new Promise(r=>setTimeout(r,1));assert.equal(remotes.get('a').progress.level,171);assert(sessions>=2);let changed=false;window.addEventListener('cosmos:account-changed',()=>changed=true);native='b';localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(172)));await controller.sync();assert(changed);assert.equal(remotes.get('b').progress.level,1);assert.equal(remotes.get('a').progress.level,171)}finally{controller.stop()}
});
test('Concurrent sync calls cannot upload the same revision twice, and switching owner during auth prevents writes',async()=>{
 setup();select('a',71);const c=managed();await c.connect();localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(72)));const results=await Promise.all([c.sync(),c.sync()]);assert.equal(puts,1);assert(results.some(r=>r.status==='paused'));switchProfile(localStorage,playProfile('b'));await assert.rejects(c.sync(),/cuenta cambió/);assert.equal(puts,1);
});
test('An in-flight upload remains bound to the old account and cannot alter the new local slot after switching',async()=>{
 setup();select('a',71);const c=managed();await c.connect();localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(72)));const fetch=globalThis.fetch;let release,started=false;globalThis.fetch=async(url,o)=>{if(o?.method==='PUT'){started=true;await new Promise(r=>release=r)}return fetch(url,o)};
 const pending=c.sync();for(let i=0;i<30&&!started;i++)await new Promise(r=>setTimeout(r,1));assert(started);switchProfile(localStorage,playProfile('b'));localStorage.setItem(WORKING_SAVE,JSON.stringify(progress(1)));checkpointProfile(localStorage);release();await assert.rejects(pending,/cuenta cambió/);assert.equal(remotes.get('a').progress.level,72);assert.equal(remotes.get('b').progress.level,1);assert.equal(JSON.parse(localStorage.getItem(WORKING_SAVE)).level,1);
});
