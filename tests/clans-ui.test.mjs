import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/clans-ui.js',import.meta.url),'utf8').replace('export function','function');
const flush=()=>new Promise(r=>setImmediate(r));
test('clan menu reads own clan, searches and opens details with safe text and no mutation requests',async()=>{
 const nodes=[];class Element{constructor(tag){this.tag=tag;this.value='';this.children=[];nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:tag=>new Element(tag),head:new Element('head'),body:new Element('body')},button=new Element('button'),requests=[];
 const fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.includes('/clans/me')?{clan:null}:url.includes('/search')?{clans:[{id:'one',name:'<img onerror=bad>',tag:'COS',memberCount:1,admission:'request'}],limit:20}:{clan:{id:'one',name:'Clan Cosmos',tag:'COS',description:'Hola',admission:'request',members:[{pilot:'Piloto #123456',role:'leader'}]}}}};
 const mount=new Function('document','fetch','AbortController','setTimeout','clearTimeout',source+';return mountClans')(document,fetch,AbortController,setTimeout,clearTimeout);
 mount({button,getToken:async()=> 'verified-session',realm:'test'});button.onclick();await flush();
 assert.ok(nodes.some(n=>n.textContent==='Todavía no perteneces a un clan'));
 nodes.find(n=>n.textContent==='Buscar clanes').onclick();await flush();
 const card=nodes.find(n=>n.className==='clan-card');assert.ok(card);assert.equal(card.children[0].textContent,'[COS] <img onerror=bad>');card.onclick();await flush();
 assert.ok(nodes.some(n=>n.textContent==='Líder'));assert.ok(nodes.some(n=>n.textContent==='Piloto #123456'));
 for(const r of requests){assert.equal(r.options.headers.Authorization,'Bearer verified-session');assert.ok(r.url.includes('realm=test'));assert.equal(r.options.body,undefined)}
 assert.equal(source.includes('innerHTML'),false);
 nodes.find(n=>n.textContent==='Cerrar').onclick();
});
