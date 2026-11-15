import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {renderLevelAudit} from '../js/level-audit-ui.js';
const source=readFileSync(new URL('../js/hall-of-fame.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),flush=()=>new Promise(r=>setImmediate(r));
test('only admin responses add the history tab; drilldown filters by stable account and reopening remains safe',async()=>{
 const nodes=[],requests=[],pilot='12345678-1234-1234-1234-123456789abc';let admin=false;
 class Element{constructor(tag){this.tag=tag;this.children=[];this.style={};nodes.push(this)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')};
 const create=new Function('document','pvpRank','rankBadge','renderLevelAudit',source+';return mountHallOfFame'),mount=create(document,()=>({name:'Cadete'}),()=>new Element('span'),renderLevelAudit),entry=new Element('button');
 const fetcher=async url=>{requests.push(String(url));return {ok:true,json:async()=>String(url).includes('tab=audit')?{admin:true,rows:[{id:8,pilot,name:'<img>',oldLevel:100,newLevel:110,delta:10,time:1,elapsedMs:1000,source:'change',flags:['large_jump']}],nextCursor:null}:{admin,limit:100,available:true,ranking:[],mine:null}}};
 mount({button:entry,getToken:async()=> 'token',fetcher});entry.onclick();await flush();assert.equal(nodes.some(n=>n.textContent==='Historial (admin)'),false);
 admin=true;nodes.find(n=>n.textContent==='Actualizar').onclick();await flush();nodes.find(n=>n.textContent==='Historial (admin)').onclick();await flush();assert.ok(nodes.some(n=>n.tag==='td'&&n.textContent==='<img>'));
 nodes.find(n=>n.textContent==='Ver historial').onclick();await flush();assert.ok(requests.at(-1).includes('pilot='+pilot));assert.ok(requests.at(-1).includes('flagged=0'));
 nodes.find(n=>n.textContent==='Cerrar').onclick();entry.onclick();await flush();assert.ok(requests.at(-1).includes('tab=levels'));
});
