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

test('create form submits one operation, displays the leader and offers settings editing',async()=>{
 const nodes=[];class Element{constructor(tag){this.tag=tag;this.value='';this.children=[];nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')},button=new Element('button'),calls=[];let created=false,release;
 const fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('/edit')?{updated:true}:{clan:created?{id:'one',name:'Cosmos',tag:'COS',role:'leader',description:'Texto',admission:'request',revision:1,members:[]}:null}}};
 const mount=new Function('document','fetch','AbortController','setTimeout','clearTimeout',source+';return mountClans')(document,fetch,AbortController,setTimeout,clearTimeout);let count=0,submitted;
 mount({button,getToken:async()=> 'verified-session',createClan:async fields=>{count++;submitted=fields;await new Promise(r=>release=r);created=true;return {created:true}}});button.onclick();await flush();nodes.find(n=>n.textContent==='Crear clan · 200.000 créditos').onclick();
 nodes.find(n=>n.name==='name').value='Cosmos';nodes.find(n=>n.name==='tag').value='COS';nodes.find(n=>n.name==='description').value='Texto';
 const form=nodes.find(n=>n.className==='clan-form');const saving=form.onsubmit({preventDefault(){}});await form.onsubmit({preventDefault(){}});assert.equal(count,1);assert.equal(submitted.name,'Cosmos');assert.equal(submitted.admission,'request');release();await saving;await flush();assert.ok(nodes.some(n=>n.textContent==='Administrar clan'));
 nodes.find(n=>n.textContent==='Administrar clan').onclick();const edit=nodes.filter(n=>n.className==='clan-form').at(-1);await edit.onsubmit({preventDefault(){}});await flush();const request=calls.find(c=>c.url.includes('/edit'));assert.equal(request.options.method,'POST');assert.equal(JSON.parse(request.options.body).revision,1);
 nodes.find(n=>n.textContent==='Cerrar').onclick();
});

test('membership controls send the selected clan and action with the verified session',async()=>{
 const nodes=[];class Element{constructor(tag){this.tag=tag;this.value='';this.children=[];nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')},button=new Element('button'),sent=[];
 const fetch=async(url,o)=>{if(o.method==='POST')sent.push(JSON.parse(o.body));return {ok:true,json:async()=>url.includes('/membership')?{joined:true}:url.includes('/search')?{clans:[{id:'open',name:'Abierto',tag:'AB',memberCount:1,admission:'open'}],limit:20}:url.includes('/detail')?{clan:{id:'open',name:'Abierto',tag:'AB',admission:'open',members:[]}}:{clan:null,pilotId:'pilot',invitations:[{clan_id:'private',name:'Privado',tag:'PR'}],requests:[{clan_id:'request',name:'Solicitud',tag:'SO'}]}}};
 const mount=new Function('document','fetch','AbortController','setTimeout','clearTimeout',source+';return mountClans')(document,fetch,AbortController,setTimeout,clearTimeout);mount({button,getToken:async()=> 'session'});button.onclick();await flush();
 await nodes.find(n=>n.textContent==='Aceptar invitación').onclick();await flush();assert.equal(sent[0].action,'acceptInvite');assert.equal(sent[0].clanId,'private');
 await nodes.filter(n=>n.textContent==='Cancelar solicitud').at(-1).onclick();await flush();assert.equal(sent[1].action,'cancelRequest');
 nodes.find(n=>n.textContent==='Buscar clanes').onclick();await flush();nodes.filter(n=>n.className==='clan-card').at(-1).onclick();await flush();await nodes.find(n=>n.textContent==='Unirme al clan').onclick();await flush();assert.equal(sent.at(-1).action,'join');assert.equal(sent.at(-1).clanId,'open');nodes.find(n=>n.textContent==='Cerrar').onclick();
});

test('leader administration asks confirmation and requires the clan tag before dissolution',async()=>{
 const nodes=[];class Element{constructor(tag){this.tag=tag;this.value='';this.children=[];nodes.push(this)}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}}
 const document={createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')},button=new Element('button'),sent=[];
 const fetch=async(url,o)=>{if(o.method==='POST')sent.push(JSON.parse(o.body));return {ok:true,json:async()=>url.includes('/admin')?{completed:true}:{pilotId:'owner',clan:{id:'one',tag:'UNO',name:'Clan Uno',role:'leader',admission:'request',members:[{account_id:'owner',role:'leader'},{account_id:'member',role:'member'}]}}}};
 const mount=new Function('document','fetch','AbortController','setTimeout','clearTimeout',source+';return mountClans')(document,fetch,AbortController,setTimeout,clearTimeout);mount({button,getToken:async()=> 'session'});button.onclick();await flush();
 nodes.find(n=>n.textContent==='Transferir liderazgo').onclick();assert.equal(sent.length,0);await nodes.find(n=>n.textContent==='Confirmar transferencia').onclick();await flush();assert.equal(sent[0].action,'transfer');assert.equal(sent[0].targetId,'member');
 nodes.filter(n=>n.textContent==='Disolver clan').at(-1).onclick();const input=nodes.find(n=>n.placeholder==='Escribe UNO para confirmar'),confirm=nodes.find(n=>n.textContent==='Confirmar disolución');input.value='wrong';await confirm.onclick();assert.equal(sent.length,1);input.value='UNO';await confirm.onclick();await flush();assert.equal(sent[1].action,'disband');assert.match(sent[1].operationId,/^[a-f0-9-]{36}$/);nodes.find(n=>n.textContent==='Cerrar').onclick();
});
