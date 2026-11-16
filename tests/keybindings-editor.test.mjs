import test from 'node:test';
import assert from 'node:assert/strict';
import {mountKeybindingEditor} from '../js/keybindings-editor.js';
import {KEY_ACTIONS,KEYBINDING_KEY,DEFAULT_BINDINGS,readKeybindings} from '../js/keybindings.js';
function harness(){
 class El extends EventTarget{constructor(){super();this.children=[];this.attributes={};this.hidden=false}append(...v){this.children.push(...v)}setAttribute(k,v){this.attributes[k]=v}}
 const doc=new El(),win=new El(),overlay=new El(),toolbar=new El(),canvas=new El(),data=new Map();doc.createElement=()=>new El();overlay.querySelector=()=>toolbar;
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},editor=mountKeybindingEditor(overlay,canvas,{doc,win,storage});
 const panel=overlay.children[0],status=panel.children[2],list=panel.children[3],row=action=>list.children[Object.keys(KEY_ACTIONS).indexOf(action)];
 const key=code=>{const e=new Event('keydown',{cancelable:true});Object.defineProperty(e,'code',{value:code});doc.dispatchEvent(e);return e};
 editor.open();overlay.hidden=false;toolbar.children[0].onclick();return {doc,win,overlay,toolbar,canvas,storage,editor,panel,status,row,key};
}
test('keyboard editor stages changes, rejects conflicts, cancels capture and restores defaults before saving',()=>{
 const h=harness();assert.equal(h.canvas.hidden,true);h.row('missile').children[1].onclick();let leaked=0;h.doc.addEventListener('keydown',()=>leaked++);assert.ok(h.key('KeyZ').defaultPrevented);assert.equal(leaked,0);assert.deepEqual(h.editor.draft.missile,['KeyZ']);assert.equal(h.storage.getItem(KEYBINDING_KEY),null);
 h.row('missile').children[1].onclick();h.key('KeyW');assert.match(h.status.textContent,/Avanzar/);assert.deepEqual(h.editor.draft.missile,['KeyZ']);h.key('Escape');assert.deepEqual(h.editor.draft.missile,['KeyZ']);
 h.editor.close();h.editor.open();assert.deepEqual(h.editor.draft,DEFAULT_BINDINGS);h.toolbar.children[0].onclick();h.row('pitchDown').children[2].onclick();h.row('missile').children[1].onclick();h.key('KeyF');assert.deepEqual(h.editor.draft.missile,['KeyF']);assert.equal(h.editor.save(),true);assert.deepEqual(readKeybindings(h.storage).missile,['KeyF']);
 h.editor.reset();assert.deepEqual(h.editor.draft,DEFAULT_BINDINGS);assert.deepEqual(readKeybindings(h.storage).missile,['KeyF']);assert.equal(h.editor.save(),true);assert.deepEqual(readKeybindings(h.storage),DEFAULT_BINDINGS);
});
test('a failed settings write stays in the editor with an actionable error',()=>{
 const h=harness();h.row('missile').children[1].onclick();h.key('KeyZ');h.storage.setItem=()=>{throw Error('quota')};assert.equal(h.editor.save(),false);assert.equal(h.panel.hidden,false);assert.match(h.status.textContent,/No se pudieron guardar/);assert.equal(h.storage.getItem(KEYBINDING_KEY),null);
});
