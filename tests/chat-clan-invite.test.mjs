import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(role='leader'){
 const nodes=[],requests=[];
 class Element{constructor(tag){this.tag=tag;this.children=[];this.style={setProperty(){}};nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}}
 const document={createElement:t=>new Element(t),createTextNode:t=>t,body:new Element('body')},window={addEventListener(){}};
 const fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.includes('/clans/me')?{clan:{id:'clan-1',role}}:{invited:true}}};
 const source=readFileSync(new URL('../js/map-chat.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const mount=new Function('document','window','navigator','innerWidth','innerHeight','chatLayout','mountClanChat','fetch','setInterval','clearInterval',source+';return mountMapChat')(document,window,{language:'es'},800,600,()=>({x:0,y:0,width:360,height:250,font:13}),()=>{},fetch,()=>0,()=>{});
 const chat=mount({send(){},getToken:async()=> 'verified-token',storage:{getItem:()=>null},realm:'normal'});chat.identify('my-id');
 chat.receive({type:'chatHistory',messages:[{id:'m1',author:'other-id',name:'Piloto',text:'Hola'}],blocks:[]});
 return {nodes,requests};
}
test('tapping a chat name offers an invitation for the verified message author',async()=>{
 const {nodes,requests}=setup();assert(nodes.some(n=>n.tag==='summary'&&n.textContent==='Piloto'));
 nodes.find(n=>n.textContent==='Invitar al clan').onclick();await flush();await flush();
 assert.equal(requests.length,2);assert.equal(requests[1].options.headers.Authorization,'Bearer verified-token');
 assert.deepEqual(JSON.parse(requests[1].options.body),{action:'invite',clanId:'clan-1',targetId:'other-id'});
 assert(nodes.some(n=>n.textContent?.includes('Invitación enviada a Piloto')));
});
test('ordinary members cannot send an invitation',async()=>{
 const {nodes,requests}=setup('member');nodes.find(n=>n.textContent==='Invitar al clan').onclick();await flush();await flush();
 assert.equal(requests.length,1);assert(nodes.some(n=>n.textContent?.includes('Solo el líder o un oficial')));
});
