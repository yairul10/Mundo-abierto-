import test from 'node:test';import assert from 'node:assert/strict';import {createClanBadges,clanPilotName,renderClanName} from '../js/clan-badges.js';
const id='12345678-1234-1234-1234-123456789abc',flush=()=>new Promise(r=>setImmediate(r));
test('badges refresh on clan change or departure, filter bots and throttle repeated snapshots',async()=>{
 let time=0,tag='COS',calls=0;const requests=[],client=createClanBadges({getToken:async()=> 'verified',realm:'test',now:()=>time,fetcher:async(url,o)=>{calls++;requests.push({url,o});return {ok:true,json:async()=>({badges:tag?{[id]:{tag,name:'Clan'}}:{}})}}});
 await client.update([id,'bot-ABC',id]);assert.equal(client.tag(id),'COS');assert.deepEqual(JSON.parse(requests[0].o.body).ids,[id]);assert.ok(requests[0].url.endsWith('realm=test'));assert.equal(requests[0].o.headers.Authorization,'Bearer verified');
 await client.update([id]);assert.equal(calls,1);tag='DOS';time=30001;await client.update([id]);assert.equal(client.tag(id),'DOS');tag=null;time=60002;await client.update([id]);assert.equal(client.tag(id),null);
});
test('invalidation discards stale responses and fetch failure never blocks gameplay',async()=>{
 let release,calls=0;const client=createClanBadges({getToken:async()=> 'verified',fetcher:async()=>{calls++;if(calls===1)await new Promise(r=>release=r);return {ok:true,json:async()=>({badges:{[id]:{tag:calls===1?'OLD':'NEW'}}})}}});
 const first=client.update([id]);await flush();client.invalidate();release();await first;await flush();assert.equal(client.tag(id),'NEW');assert.equal(calls,2);
 const offline=createClanBadges({getToken:async()=>{throw Error('offline')}});await offline.update([id]);assert.equal(offline.tag(id),null);
});
test('clan decorations never rewrite the saved pilot name and reject invalid tag markup',()=>{
 const name='Piloto';assert.equal(clanPilotName(name,'COS'),'[COS] Piloto');assert.equal(clanPilotName(name,'<img>'),name);
 const old=globalThis.document;globalThis.document={createElement:()=>({}),createTextNode:text=>({textContent:text})};try{let renders=0;const node={dataset:{},replaceChildren(...children){this.children=children;renders++}};renderClanName(node,name,'COS');assert.equal(node.children[0].textContent,'[COS] ');assert.equal(node.children[1].textContent,name);renderClanName(node,name,'COS');assert.equal(renders,1);renderClanName(node,name,null);assert.equal(node.children.length,1);assert.equal(node.children[0].textContent,name);}finally{globalThis.document=old}
});
