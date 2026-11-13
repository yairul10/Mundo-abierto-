import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startPlayMode,setMode} from '../js/play-mode.js';
test('server selection appears once per tab, survives reloads and remains manually changeable',async()=>{
 const keys=['document','window','location','localStorage','sessionStorage','fetch','setInterval','dispatchEvent','history'];
 const before=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
 let prompts=0,choice='test';
 try{
  globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.window={};
  globalThis.location={search:'',href:'https://example.test/index.html'};globalThis.history={replaceState(){}};
  globalThis.fetch=async()=>({ok:true,json:async()=>({testServerEnabled:true})});globalThis.setInterval=()=>1;globalThis.dispatchEvent=()=>{};
  const button=mode=>({dataset:{mode},focus(){}});
  globalThis.document={head:{appendChild(){}},body:{classList:{toggle(){}},appendChild(node){if(node.id==='playModePicker'){prompts++;queueMicrotask(()=>node.buttons.find(b=>b.dataset.mode===choice).onclick())}}},createElement(){const node={buttons:[button('normal'),button('test')],setAttribute(){},addEventListener(){},remove(){},querySelectorAll(){return this.buttons},querySelector(){return {}}};return node}};
  assert.equal((await startPlayMode()).mode,'test');assert.equal(prompts,1);
  for(const search of ['', '?v=new-build','?threecdn=backup','?pvp=1']){
   location.search=search;assert.equal((await startPlayMode()).mode,'test');assert.equal(prompts,1,'reload keeps choice: '+search);
  }
  location.search='';choice='normal';await window.MUNDO_PLAY_MODE.choose();assert.equal(prompts,2);assert.equal(location.href,'index.html?play=normal');
  location.search='?play=normal';location.href='https://example.test/index.html?play=normal';assert.equal((await startPlayMode()).mode,'normal');assert.equal(prompts,2);
  sessionStorage=storage();setMode(localStorage,'normal');assert.equal((await startPlayMode()).mode,'normal');assert.equal(prompts,3,'a new tab still asks');
 }finally{for(const k of keys)if(before[k]===undefined)delete globalThis[k];else globalThis[k]=before[k]}
});
test('HTML build identity agrees with version manifest to prevent an immediate update reload',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),version=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8'));
 assert.equal(html.match(/COSMOS_GAME_BUILD='([^']+)'/)[1],version.build);
});
