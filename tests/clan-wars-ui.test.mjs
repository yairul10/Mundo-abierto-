import test from 'node:test';
import assert from 'node:assert/strict';
import {renderClanWars,mountClanWarWatch,clanWarReturnURL} from '../js/clan-wars.js';
const flush=()=>new Promise(r=>setImmediate(r));
test('war menu shows admin controls only when authorized and submits the exact selected clan roster',async()=>{
 const nodes=[],sent=[];const element=(tag,text)=>{const n={tag,textContent:text,children:[],append(...x){this.children.push(...x)}};nodes.push(n);return n};const container=element('section'),event={id:'event',phase:'registration',mode:'2v2',teams:[],matches:[]},account={clan:{tag:'COS',name:'Cosmos',role:'leader',members:[{account_id:'one',pilot:'Jairo'},{account_id:'two',pilot:'Otro'}]}};
 renderClanWars({container,data:{admin:false,event},account,element,request:async b=>sent.push(b),refresh:async()=>{}});assert.equal(nodes.some(n=>n.textContent==='Sortear e iniciar · 5 minutos'),false);const inputs=nodes.filter(n=>n.tag==='input');inputs.forEach(n=>n.checked=true);await nodes.find(n=>n.tag==='form').onsubmit({preventDefault(){}});assert.deepEqual(sent[0],{action:'register',roster:['one','two']});
 renderClanWars({container,data:{admin:true,event},account:null,element,request:async b=>sent.push(b),refresh:async()=>{}});await nodes.find(n=>n.textContent==='Sortear e iniciar · 5 minutos').onclick();assert.equal(sent.at(-1).action,'start');
});
test('war watcher announces once, transports only an assigned active pilot and never re-enters a completed war',async()=>{
 const keys=['document','location','sessionStorage','addEventListener','removeEventListener','fetch','setTimeout','clearTimeout'],before=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));let now=1000000,scheduled,state={serverTime:now,enrolled:true,event:{id:'event',phase:'countdown',beginsAt:now+299000}},moves=0;const notices=[],storage=new Map();
 Object.assign(globalThis,{document:{hidden:false},location:{search:''},sessionStorage:{getItem:k=>storage.get(k)||null},addEventListener(){},removeEventListener(){},setTimeout:fn=>(scheduled=fn,1),clearTimeout(){},fetch:async()=>({ok:true,json:async()=>state})});
 let watch;try{watch=mountClanWarWatch({getToken:async()=> 'token',hasAccount:()=>true,transfer:async()=>moves++,notice:m=>notices.push(m),now:()=>now});await flush();assert.equal(watch.reserved,true);assert.equal(notices.length,1);await scheduled();await flush();assert.equal(notices.length,1);
 state={...state,event:{...state.event,phase:'active'},assignment:null};await scheduled();await flush();assert.equal(moves,0);
 state.assignment={eventId:'event',mode:'2v2',code:'ABCDEF'};await scheduled();await flush();assert.equal(moves,1);
 watch.stop();storage.set('cosmos.clanWar.done.event','1');watch=mountClanWarWatch({getToken:async()=> 'token',hasAccount:()=>true,transfer:async()=>moves++,notice(){},now:()=>now});await flush();assert.equal(moves,1);
 }finally{watch?.stop();for(const k of keys)if(before[k]===undefined)delete globalThis[k];else globalThis[k]=before[k]}
});
test('war return restores the prior world, avoids a stale ordinary arena and rejects foreign or recursive destinations',()=>{
 const here='https://example.test/game/index.html?pvp=1&arena=1&clanWar=id';assert.equal(clanWarReturnURL('https://elsewhere.test',here),'https://example.test/game/index.html');assert.equal(clanWarReturnURL(here,here),'https://example.test/game/index.html');assert.equal(clanWarReturnURL('./index.html?play=test&pvp=1',here),'https://example.test/game/index.html?play=test&pvp=1');assert.equal(clanWarReturnURL('./index.html?arena=1&pvp=1&play=normal',here),'https://example.test/game/index.html?play=normal');
});
