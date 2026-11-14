import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const flush=()=>new Promise(r=>setImmediate(r));
test('Global and Clan share one chat window, route separately and stop private reads on switch/close',async()=>{
 const nodes=[],events={},sent=[],requests=[],views=[];let member=true;
 class Element{constructor(tag){this.tag=tag;this.children=[];this.style={setProperty(){}};nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){} }
 const document={createElement:t=>new Element(t),createTextNode:t=>t,body:new Element('body')},window={addEventListener:(type,fn)=>events[type]=fn};
 const mountClanChat=options=>{const view={options,stopped:false,stop(){this.stopped=true}};views.push(view);return view};
 const source=readFileSync(new URL('../js/map-chat.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const create=new Function('document','window','navigator','innerWidth','innerHeight','chatLayout','mountClanChat','fetch','setInterval','clearInterval',source+';return mountMapChat');
 const fetch=async(url,o)=>{requests.push({url,o});return {ok:true,json:async()=>({pilotId:'verified',clan:member?{id:'one',tag:'COS',role:'member'}:null})}};
 const mount=create(document,window,{language:'es'},800,600,()=>({x:12,y:12,width:360,height:250,font:13}),mountClanChat,fetch,()=>0,()=>{});
 mount({send:m=>sent.push(m),getToken:async()=> 'token',realm:'test',storage:{getItem:()=>null}});
 nodes.find(n=>n.id==='mapChatToggle').onclick();assert.equal(sent.at(-1).type,'chatHistory');
 const global=nodes.find(n=>n.textContent==='Global'),clan=nodes.find(n=>n.textContent==='Clan');clan.onclick();await flush();assert.equal(views.length,1);assert.equal(views[0].options.clan.id,'one');assert.equal(views[0].options.pilotId,'verified');assert.equal(global['aria-pressed'],'false');assert.equal(clan['aria-pressed'],'true');assert.ok(requests[0].url.includes('realm=test'));assert.equal(requests[0].o.headers.Authorization,'Bearer token');
 global.onclick();assert.equal(views[0].stopped,true);assert.equal(sent.at(-1).type,'chatHistory');
 member=false;clan.onclick();await flush();assert.ok(nodes.some(n=>n.textContent?.includes('Todavía no perteneces')));assert.equal(views.length,1);
 member=true;events['cosmos:clans-changed']();await flush();assert.equal(views.length,2);
 nodes.find(n=>n['aria-label']==='Minimizar chat').onclick();assert.equal(views[1].stopped,true);
 assert.equal(nodes.filter(n=>n.id==='mapChat').length,1);
});
