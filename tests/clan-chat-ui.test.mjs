import test from 'node:test';
import assert from 'node:assert/strict';
import {mountClanChat} from '../js/clan-chat.js';
const flush=()=>new Promise(r=>setImmediate(r));
function dom(){const nodes=[];const element=(tag,text)=>{const n={tag,textContent:text,children:[],value:'',append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},setAttribute(){}};nodes.push(n);return n};return {element,nodes,container:element('section')}}
test('clan chat uses private endpoint, safely renders messages, retains failed send and closes without late rendering',async()=>{
 const oldDocument=globalThis.document,oldTimer=globalThis.setTimeout;globalThis.document={hidden:false};globalThis.setTimeout=()=>0;
 try{const {element,nodes,container}=dom(),sent=[];let fail=false,release;
 const fetcher=async(url,o)=>{sent.push({url,body:JSON.parse(o.body)});const raw=JSON.parse(o.body);if(raw.action==='send')return {ok:!fail,json:async()=>fail?{error:'chat_cooldown'}:{sent:true}};
 return {ok:true,json:async()=>({role:'member',messages:[{id:'one',author:'other',name:'<img>',text:'<script>',time:1}]})}};
 const view=mountClanChat({container,clan:{id:'private',tag:'COS',role:'member'},pilotId:'me',getToken:async()=> 'token',realm:'test',element,storage:{getItem:()=> '1'},fetcher});await flush();
 assert.ok(nodes.some(n=>n.textContent==='<img>: <script>'));assert.ok(sent[0].url.endsWith('realm=test'));assert.equal(sent[0].body.clanId,'private');assert.equal(nodes.some(n=>n.textContent==='Borrar'),false);
 const input=nodes.find(n=>n.placeholder==='Mensaje para tu clan'),form=nodes.find(n=>n.tag==='form');input.value='Hola';fail=true;await form.onsubmit({preventDefault(){}});assert.equal(input.value,'Hola');const id=sent.at(-1).body.id;fail=false;await form.onsubmit({preventDefault(){}});assert.equal(sent.findLast(r=>r.body.action==='send').body.id,id);assert.equal(input.value,'');
 view.stop();assert.equal(nodes.find(n=>n.className==='clan-chat-messages').children.length,0);
 const delayed=mountClanChat({container,clan:{id:'private',tag:'COS'},element,storage:{getItem:()=>null},getToken:()=>new Promise(r=>release=r),fetcher});delayed.stop();const before=sent.length;release('token');await flush();assert.equal(sent.length,before);
 }finally{globalThis.document=oldDocument;globalThis.setTimeout=oldTimer}
});
