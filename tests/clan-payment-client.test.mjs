import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),start=source.indexOf('async function createPlayerClan('),end=source.indexOf('const clansEntry=',start),body=source.slice(start,end);
function fixture(){const player={gold:500000},data=new Map(),options=[],requests=[];const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},owner='play:pilot',key='cosmos.clanCreation.pending.'+owner;let lost=true,revision=2;
 const payment={prepare:async option=>{options.push(option);return {revision:1}},release(){},finish(){}};
 const fetch=async(url,o)=>{const req=JSON.parse(o.body);requests.push(req);if(lost){lost=false;throw Error('connection lost')}return {ok:true,json:async()=>({created:true,operationId:req.operationId,cost:200000,revision:2,currentRevision:revision})}};
 const create=new Function('player','localStorage','activeProfile','pvpAccountToken','window','PVP_MODE','save','fetch','hud','dispatchEvent','Event','AbortSignal','crypto',body+';return createPlayerClan')(player,storage,()=>owner,async()=> 'session',{MUNDO_PLAY_MODE:{mode:'normal'},cosmosClanPayment:payment},false,()=>true,fetch,()=>{},()=>{},Event,AbortSignal,crypto);
 return {player,storage,key,create,options,requests,setRevision:n=>revision=n};}
test('lost creation response keeps the same operation ID and deducts locally only after confirmation',async()=>{
 const f=fixture();await assert.rejects(f.create({name:'Cosmos',tag:'COS'}),/connection lost/);assert.equal(f.player.gold,500000);assert.ok(f.storage.getItem(f.key));
 await f.create({name:'Different',tag:'NEW'});assert.equal(f.requests[0].operationId,f.requests[1].operationId);assert.equal(f.requests[1].name,'Cosmos');assert.equal(f.options[1].resume,true);assert.equal(f.player.gold,300000);assert.equal(f.storage.getItem(f.key),null);
});
test('restored cloud receipt clears a pending operation without charging again',async()=>{
 const f=fixture();await assert.rejects(f.create({name:'Cosmos',tag:'COS'}));const pending=JSON.parse(f.storage.getItem(f.key));f.player.gold=300000;f.player.clanPurchases={[pending.operationId]:1};f.setRevision(4);await f.create({});assert.equal(f.player.gold,300000);assert.equal(f.storage.getItem(f.key),null);
});
