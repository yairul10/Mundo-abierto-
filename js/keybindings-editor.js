import {KEY_ACTIONS,DEFAULT_BINDINGS,readKeybindings,assignBinding,saveKeybindings,keyLabel} from './keybindings.js?v=488';
export function mountKeybindingEditor(overlay,canvas,{doc=document,storage=localStorage,win=window}={}){
 const toolbar=overlay.querySelector('.pvp-editor-toolbar'),tab=doc.createElement('button');tab.type='button';tab.textContent='Teclas (PC)';tab.setAttribute('aria-pressed','false');toolbar.append(tab);
 const panel=doc.createElement('section');panel.className='keybinding-editor';panel.hidden=true;panel.setAttribute('aria-label','Asignar teclas de PC');
 const title=doc.createElement('h2');title.textContent='Teclas de PC';const description=doc.createElement('p');description.textContent='Elige una acción y pulsa su nueva tecla. Esc cancela la elección. Los cambios se aplican al guardar y se comparten entre modos en este dispositivo.';
 const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const list=doc.createElement('div');list.className='keybinding-list';panel.append(title,description,status,list);overlay.append(panel);
 let draft=readKeybindings(storage),waiting=null,keyboard=false;
 const buttons=new Map();
 function refresh(){for(const [action,button] of buttons){const names=draft[action].map(keyLabel).join(' / ')||'Sin tecla';button.textContent=waiting===action?'Pulsa una tecla…':names;button.setAttribute('aria-label',KEY_ACTIONS[action]+': '+names+' · cambiar tecla');button.setAttribute('aria-pressed',String(waiting===action))}}
 for(const [action,label] of Object.entries(KEY_ACTIONS)){const row=doc.createElement('div'),name=doc.createElement('span'),button=doc.createElement('button'),clear=doc.createElement('button');row.className='keybinding-row';name.textContent=label;button.type=clear.type='button';clear.textContent='Quitar';clear.setAttribute('aria-label','Quitar tecla de '+label);button.onclick=()=>{waiting=action;status.textContent='Pulsa una tecla para «'+label+'». Esc cancela.';refresh()};clear.onclick=()=>{draft=assignBinding(draft,action,null);waiting=null;status.textContent='Cambio pendiente de guardar.';refresh()};buttons.set(action,button);row.append(name,button,clear);list.append(row)}
 function view(value){keyboard=value;waiting=null;canvas.hidden=value;panel.hidden=!value;tab.textContent=value?'Posición de botones':'Teclas (PC)';tab.setAttribute('aria-pressed',String(value));refresh()}
 tab.onclick=()=>view(!keyboard);
 function keydown(event){if(overlay.hidden||!keyboard||!waiting)return;event.preventDefault();event.stopImmediatePropagation();if(event.code==='Escape'){waiting=null;status.textContent='Elección cancelada.';refresh();return}if(event.repeat||event.isComposing)return;
  try{if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)throw Error('Elige una tecla sin Ctrl, Alt, Shift ni Windows/Comando.');draft=assignBinding(draft,waiting,event.code);waiting=null;status.textContent='Cambio pendiente de guardar.'}catch(error){status.textContent=error.message}refresh();
 }
 doc.addEventListener('keydown',keydown,true);
 return {open(){draft=readKeybindings(storage);waiting=null;status.textContent='';view(false)},close(){waiting=null;view(false)},reset(){draft=structuredClone(DEFAULT_BINDINGS);waiting=null;status.textContent='Teclas predeterminadas · pendiente de guardar.';refresh()},save(){try{saveKeybindings(draft,storage,win);return true}catch(error){status.textContent='No se pudieron guardar las teclas. '+error.message;view(true);return false}},get draft(){return structuredClone(draft)}};
}
