import {KEY_ACTIONS,MOVE_ACTIONS,readKeybindings,bindingAction,keyLabel} from './keybindings.js?v=488';
export const PC_MOVEMENT=Object.freeze({KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',KeyR:'r',KeyF:'f'});
const ui='button,a,input,textarea,select,label,[role="button"],[contenteditable],dialog,.panel,#hud,#radarWidget,#worldPanel,#worldTarget,#worldInvite,#pvpSkills,.world-nameplate,#combatControls,#zoomControls,#hangarPanel,#shopPanel,#systemMapOverlay,#pvpControlEditor,#farmAutoMenu,#mapChat,#questTracker,#targetInfo,#worldLoading,#orientationGate';
export function mountDesktopControls({enabled,canPlay,keys,onFire,onAim,onZoom,onAction,onHelp,onEscape,getBindings=()=>readKeybindings(),doc=document,win=window}){
 let mouseFire=false,spaceFire=false,pointer=null,capture=null,last=null;const held=new Map();
 const syncHeld=()=>{for(const [action,key] of Object.entries(MOVE_ACTIONS))keys[key]=[...held.values()].includes(action)?1:0;spaceFire=[...held.values()].includes('fire');signal()};
 const typing=e=>e.isComposing||e.ctrlKey||e.altKey||e.metaKey||!!e.target?.closest?.('input,textarea,select,[contenteditable]');
 const signal=()=>onFire(mouseFire||spaceFire);
 const consume=e=>{if(e.cancelable)e.preventDefault();e.stopPropagation()};
 function reset(){held.clear();mouseFire=spaceFire=false;signal();for(const key of Object.values(PC_MOVEMENT))keys[key]=0;const id=pointer;pointer=null;last=null;try{if(capture?.hasPointerCapture?.(id))capture.releasePointerCapture(id)}catch{}capture=null}
 function down(e){
  if(!enabled()||e.pointerType!=='mouse'||!canPlay()||e.target.closest?.(ui)||![0,2].includes(e.button))return;
  pointer=e.pointerId;last={x:e.clientX,y:e.clientY};capture=e.target;try{capture.setPointerCapture?.(pointer)}catch{}mouseFire=!!(e.buttons&1);signal();consume(e);
 }
 function move(e){
  if(e.pointerId!==pointer||e.pointerType!=='mouse')return;if(!enabled()||!canPlay()){reset();return}
  consume(e);mouseFire=!!(e.buttons&1);signal();if(e.buttons&3){onAim(e.clientX-last.x,e.clientY-last.y);last={x:e.clientX,y:e.clientY}}else reset();
 }
 function up(e){if(e.pointerId!==pointer)return;consume(e);mouseFire=false;signal();pointer=null;last=null;try{if(capture?.hasPointerCapture?.(e.pointerId))capture.releasePointerCapture(e.pointerId)}catch{}capture=null}
 function keydown(e){
  if(!enabled()||typing(e)||doc.getElementById?.('pvpControlEditor')?.hidden===false)return;
  if(e.code==='Escape'){reset();if(onEscape?.())consume(e);return}
  const action=bindingAction(e.code,getBindings());if(!action)return;
  if(action==='help'&&!e.repeat){consume(e);reset();onHelp?.();return}
  if(!canPlay())return;
  consume(e);
  if(MOVE_ACTIONS[action]||action==='fire'){held.set(e.code,action);syncHeld();return}
  if(!e.repeat)onAction(action);
 }
 function keyup(e){if(held.delete(e.code))syncHeld()}
 function wheel(e){if(!enabled()||!canPlay()||e.target.closest?.(ui)||!e.deltaY)return;consume(e);onZoom(Math.sign(e.deltaY))}
 function context(e){if(enabled()&&canPlay()&&!e.target.closest?.(ui))e.preventDefault()}
 const events=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['keydown',keydown],['keyup',keyup],['wheel',wheel],['contextmenu',context]],options={capture:true,passive:false};
 for(const [name,handler] of events)doc.addEventListener(name,handler,options);
 for(const name of ['blur','pagehide','cosmos:app-paused','cosmos:keybindings-changed'])win.addEventListener(name,reset);
 const visibility=()=>{if(doc.hidden)reset()};const focus=event=>{if(event.target?.closest?.('input,textarea,select,[contenteditable]'))reset()};doc.addEventListener('visibilitychange',visibility);doc.addEventListener('focusin',focus);
 const observer=win.MutationObserver?new win.MutationObserver(()=>{if((pointer!==null||spaceFire||Object.values(PC_MOVEMENT).some(k=>keys[k]))&&!canPlay())reset()}):null;observer?.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['class','hidden','open']});
 return {reset,dispose(){reset();observer?.disconnect();for(const [name,handler] of events)doc.removeEventListener(name,handler,options);for(const name of ['blur','pagehide','cosmos:app-paused','cosmos:keybindings-changed'])win.removeEventListener(name,reset);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('focusin',focus)}};
}
export function mountDesktopHelp(parent){
 const button=document.createElement('button');button.type='button';button.textContent='Controles de PC';parent.appendChild(button);
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Controles de PC');dialog.style.cssText='max-width:540px;max-height:85vh;overflow:auto;background:#101b29;color:#f7edcd;border:1px solid #9d8550;border-radius:16px;padding:24px;font:16px system-ui';
 const title=document.createElement('h2');title.textContent='Controles de PC';const fixed=document.createElement('p');fixed.textContent='Clic izquierdo mantenido: disparar. Arrastrar con clic derecho o izquierdo: apuntar. Rueda: zoom. Esc: cerrar ayuda o menú. Cambia las teclas en Acomodar botones → Teclas (PC).';const list=document.createElement('div'),close=document.createElement('button');close.type='button';close.textContent='Cerrar';dialog.append(title,fixed,list,close);
 document.body.appendChild(dialog);const show=()=>{const bindings=readKeybindings();list.replaceChildren();for(const [action,label] of Object.entries(KEY_ACTIONS)){const row=document.createElement('p');row.textContent=label+': '+(bindings[action].map(keyLabel).join(' / ')||'Sin tecla');list.appendChild(row)}if(!dialog.open)dialog.showModal()};button.onclick=show;close.onclick=()=>dialog.close();return {show,close(){if(dialog.open){dialog.close();return true}return false}};
}
