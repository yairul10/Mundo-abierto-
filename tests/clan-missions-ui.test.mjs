import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/clans-ui.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),flush=()=>new Promise(r=>setImmediate(r));
test('clan missions and ranking render verified names and progress through authenticated read-only tabs',async()=>{
 const nodes=[],requests=[];class Element{constructor(tag){this.tag=tag;this.children=[];nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')},button=new Element('button');let member=true;
 const fetch=async(url,o)=>{requests.push({url,o});return {ok:true,json:async()=>url.includes('/missions')?{endsAt:1800000000000,clan:member?{tag:'COS',name:'Cosmos'}:null,missions:member?[{title:'Colosos Pro',progress:3,goal:10,points:200,completed:false}]:[],contributors:member?[{pilot:'Jairo',kills:3}]:[]}:url.includes('/ranking')?{endsAt:1800000000000,limit:50,ranking:[{tag:'COS',name:'<script>',points:200,kills:20}]}:{clan:null}}};
 const mount=new Function('document','fetch','AbortController','setTimeout','clearTimeout',source+';return mountClans')(document,fetch,AbortController,setTimeout,clearTimeout);mount({button,getToken:async()=> 'token',realm:'test'});button.onclick();await flush();
 nodes.find(n=>n.textContent==='Misiones').onclick();await flush();assert.ok(nodes.some(n=>n.textContent==='Jairo · 3 participaciones'));const bar=nodes.find(n=>n.tag==='progress');assert.equal(bar.value,3);assert.equal(bar.max,10);
 nodes.find(n=>n.textContent==='Ranking').onclick();await flush();assert.ok(nodes.some(n=>n.textContent==='[COS] <script>'));assert.ok(nodes.some(n=>n.textContent==='200 puntos · 20 bajas'));
 member=false;nodes.find(n=>n.textContent==='Misiones').onclick();await flush();assert.ok(nodes.some(n=>n.textContent==='Únete a un clan para participar en sus misiones.'));
 for(const {url,o}of requests){assert.ok(url.includes('realm=test'));assert.equal(o.headers.Authorization,'Bearer token');assert.equal(o.body,undefined)}nodes.find(n=>n.textContent==='Cerrar').onclick();
});
