import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function ui(){class Element{constructor(tag){this.tag=tag;this.children=[];this.style={}}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}addEventListener(){}showModal(){}close(){}remove(){}focus(){}reportValidity(){return true}}
 const document={createElement:tag=>new Element(tag),body:new Element('body')},source=readFileSync(new URL('../js/pvp-match-ui.js',import.meta.url),'utf8').replaceAll('export function','function').replaceAll('export const','const');
 return {document,api:new Function('document',source+';return {choosePvpMatch,showPvpResult}')(document)};
}
test('the mode picker carries 2v2 into practice and private-room code requests',async()=>{
 for(const action of ['bot','join']){const {document,api}=ui(),pending=api.choosePvpMatch(),dialog=document.body.children.at(-1),actions=dialog.children[2];actions.children.find(b=>b.textContent==='2v2').onclick();assert.match(dialog.children[0].textContent,/2v2/);
  if(action==='bot')actions.children.find(b=>b.textContent==='Practicar con bots').onclick();else{actions.children.find(b=>b.textContent==='Unirme con código').onclick();const form=actions.children[0];form.children[0].value='abcdef';form.onsubmit({preventDefault(){}})}
  assert.deepEqual(await pending,action==='bot'?{action:'bot',mode:'2v2'}:{action:'join',mode:'2v2',code:'ABCDEF'});
 }
});
test('the result belongs to the whole team, including an eliminated teammate',()=>{
 const {document,api}=ui();api.showPvpResult({mode:'2v2',winner:'ally',winnerTeam:'a'},'human',()=>{},'a');assert.equal(document.body.children.at(-1).children[0].textContent,'¡Victoria de tu equipo!');
 api.showPvpResult({mode:'2v2',winner:'ally',winnerTeam:'a'},'enemy',()=>{},'b');assert.equal(document.body.children.at(-1).children[0].textContent,'Derrota');
});
test('the actual client target gate refuses allied pilots',()=>{
 const shared=readFileSync(new URL('../js/shared-session.js',import.meta.url),'utf8'),start=shared.indexOf(' const active=()=>'),end=shared.indexOf(' const skillUI=',start),code=shared.slice(start,end);
 const me={id:'me',team:'a',hp:100,protected:false,zone:'arena',duelId:'room',duelStartsAt:0},other={id:'other',team:'a',hp:100,protected:false,zone:'arena',duelId:'room'},state={match:{mode:'2v2'},players:[me,other],rules:{cooperative:false}},ws={readyState:1};
 const gate=new Function('me','state','ws','WebSocket','performance','lastReceived','selected','bridge','clockOffset','const roomEnding=false;'+code+';return canTarget')(me,state,ws,{OPEN:1},{now:()=>100},100,'other',{},0);
 assert.equal(gate('other'),false);other.team='b';assert.equal(gate('other'),true);
});
