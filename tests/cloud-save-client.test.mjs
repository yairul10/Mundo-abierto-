import assert from 'node:assert/strict';
import {createCloudSave} from '../js/cloud-save-client.js';
const KEY='mundoAbierto.player';
const progress={name:'Prueba',classId:null,level:18,xp:24,gold:900,loot:{scrap:4},ownedShips:['aurora','titan'],shipId:'titan',formations:['fan'],boosters:{},quests:{mission1:true},maxHp:300,maxEnergy:180,attack:22,defense:12,speed:220};
class Storage{constructor(){this.map=new Map()}getItem(k){return this.map.get(k)??null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
globalThis.localStorage=new Storage();
globalThis.Capacitor={Plugins:{CosmosPlayGames:{status:async()=>({authenticated:true}),serverAuthCode:async()=>({code:'test-one-use-code'})}}};
let remote=null,calls=[];
globalThis.fetch=async(url,options={})=>{calls.push({url,options});const result=url.endsWith('/session')?{authenticated:true,sessionToken:'test-session'}:options.method==='PUT'?{revision:8}:{save:remote};return new Response(JSON.stringify(result),{status:200})};
const create=()=>createCloudSave({apiUrl:'https://example.test',serverClientId:'correct.apps.googleusercontent.com',manageProfiles:false});
const original=JSON.stringify({...progress,gold:1000,sector:'graveyard',granTitanState:{hp:5},activityJournal:[{text:'local'}]});
localStorage.setItem(KEY,original);remote={progress,revision:7};
let client=create(),result=await client.connect();assert.equal(result.status,'conflict');assert.equal(localStorage.getItem(KEY),original);assert.equal((await client.sync()).status,'paused');assert.equal(calls.filter(x=>x.options.method==='PUT').length,0);
client.resolveConflict('cloud');let restored=JSON.parse(localStorage.getItem(KEY));assert.equal(restored.gold,900);assert.equal(restored.sector,'aurora');assert.equal(restored.hp,300);assert.deepEqual(restored.ownedShips,progress.ownedShips);assert.equal(restored.granTitanState,undefined);assert.equal(JSON.parse(localStorage.getItem('cosmosLegacy.beforeCloudRestore.v1')).raw,original);assert.equal((await client.sync()).status,'unchanged');
localStorage.setItem(KEY,original);client=create();await client.connect();client.resolveConflict('local');assert.equal(localStorage.getItem(KEY),original);assert.equal((await client.sync()).status,'stored');let sent=JSON.parse(calls.at(-1).options.body);assert.equal(sent.revision,7);assert.equal(sent.progress.gold,1000);assert.equal(sent.progress.granTitanState,undefined);
localStorage.removeItem(KEY);client=create();assert.equal((await client.connect()).status,'restore_required');client.resolveConflict('cloud');assert.equal(JSON.parse(localStorage.getItem(KEY)).gold,900);
localStorage.setItem(KEY,original);const nativeSet=localStorage.setItem.bind(localStorage);localStorage.setItem=(k,v)=>{if(k.includes('beforeCloudRestore'))throw Error('quota');nativeSet(k,v)};client=create();await client.connect();assert.throws(()=>client.resolveConflict('cloud'),/quota/);assert.equal(localStorage.getItem(KEY),original);assert.equal(client.active,false);localStorage.setItem=nativeSet;
remote={revision:7,progress:{gold:4}};client=create();await assert.rejects(client.connect(),/incompleta/);assert.equal(localStorage.getItem(KEY),original);
console.log('Cloud: conflict pauses writes, explicit local/cloud choice, verified backup, safe Aurora restore, revisions, no-save recovery, invalid cloud and quota failure preserve local progress.');
