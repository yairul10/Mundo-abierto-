import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/hall-of-fame.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');const flush=()=>new Promise(r=>setImmediate(r));
test('hall tabs safely render names, cancel stale reads, highlight own row and stop after closing',async()=>{
 const nodes=[],requests=[];let resolveOld;
 class Element{constructor(tag,text){this.tag=tag;this.children=[];this.style={};this.textContent=text;nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){this.removed=true}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')};
 const create=new Function('document','pvpRank','rankBadge',source+';return mountHallOfFame');const mount=create(document,()=>({name:'Emperador'}),()=>new Element('span','badge')),entry=new Element('button');
 const fetcher=async(url,o)=>{requests.push({url,o});if(url.includes('tab=clans'))return new Promise(r=>resolveOld=r);return {ok:true,json:async()=>({limit:100,available:true,updatedAt:1,ranking:[{position:1,name:'<img onerror=x>',points:50,wins:1,level:178,xp:10,own:true}],mine:{position:1,points:50,level:178}})}};
 mount({button:entry,getToken:async()=> 'token',fetcher});entry.onclick();await flush();nodes.find(n=>n.textContent==='Rangos PvP').onclick();await flush();assert.equal(requests[0].o.signal.aborted,true);assert.ok(nodes.some(n=>n.tag==='td'&&n.textContent==='<img onerror=x>'));assert.ok(nodes.some(n=>n.className==='hall-highlight'));assert.ok(nodes.some(n=>n.textContent==='Emperador'));
 resolveOld({ok:true,json:async()=>({ranking:[{name:'STALE'}]})});await flush();assert.equal(nodes.some(n=>n.textContent==='STALE'),false);
 nodes.find(n=>n.textContent==='Niveles').onclick();await flush();assert.ok(requests.at(-1).url.includes('tab=levels'));assert.ok(nodes.some(n=>n.textContent?.includes('Nivel 178')));
 nodes.find(n=>n.textContent==='Cerrar').onclick();assert.equal(requests.at(-1).o.signal.aborted,true);assert.equal(nodes.find(n=>n.tag==='dialog').removed,true);
});
