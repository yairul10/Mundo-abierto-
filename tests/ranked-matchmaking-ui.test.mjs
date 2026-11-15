import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ranked-matchmaking.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
const flush=()=>new Promise(r=>setImmediate(r));
test('public search keeps the map open and transfers only after an authorized assignment countdown',async()=>{
 const nodes=[],timers=[],requests=[],travel=[],notices=[],stored=new Map();let response={serverTime:1000,pilotId:'me',party:{id:'ABCDEF',leader:'me',members:[{id:'me',name:'Me'}]},queue:{mode:'5v5',deadline:121000,players:1,capacity:10},rank:{points:0}};
 class Element{constructor(tag){this.tag=tag;this.children=[];this.style={};nodes.push(this)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}setAttribute(){}addEventListener(){}showModal(){}close(){}remove(){}}
 const document={hidden:false,createElement:t=>new Element(t),body:new Element('body')},storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
 const create=new Function('document','window','location','sessionStorage','pvpRank','fetch','setTimeout','clearTimeout',source+';return mountRankedMatchmaking');
 const mount=create(document,{addEventListener(){}},{search:''},storage,()=>({name:'Cadete'}),async(url,o)=>{requests.push(JSON.parse(o.body));return {ok:true,json:async()=>response}},fn=>{timers.push(fn);return timers.length},()=>{});
 const ui=mount({getToken:async()=> 'token',transfer:async a=>travel.push(a),notice:t=>notices.push(t),storage});await flush();assert.equal(requests.length,0);
 await ui.queue('5v5');assert.equal(requests[0].action,'queue');assert.equal(travel.length,0);assert.ok(nodes.some(n=>n.textContent?.includes('120 s')));assert.equal(ui.reserved,true);
 response={...response,queue:null,assignment:{id:'match',code:'BCDEFG',mode:'5v5',startsAt:11000}};await timers.shift()();await flush();assert.equal(travel.length,0);assert.ok(notices.some(t=>t.includes('10 segundos')));
 response={...response,serverTime:11000};await timers.shift()();await flush();assert.equal(travel.length,1);assert.equal(travel[0].id,'match');await timers.shift()();await flush();assert.equal(travel.length,1);
});
