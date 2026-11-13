const CONFIG_URL='https://mundo-abierto-pvp.yairul17.workers.dev/game-config';
export const QA_FLAG='mundoAbierto.qaActive';
const SESSION='mundoAbierto.selectedRealm';
export const savedMode=storage=>storage.getItem(QA_FLAG)==='1'?'test':'normal';
export const saveKey=mode=>mode==='test'?'mundoAbierto.qaPlayer':'mundoAbierto.player';
export function setMode(storage,mode){if(mode==='test')storage.setItem(QA_FLAG,'1');else storage.removeItem(QA_FLAG)}
async function configuration(){try{const r=await fetch(CONFIG_URL,{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)return null;const c=await r.json();return typeof c.testServerEnabled==='boolean'?c:null}catch{return null}}
function picker(){return new Promise(resolve=>{
 const overlay=document.createElement('section');overlay.id='playModePicker';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Selecciona un servidor');
 overlay.innerHTML=`
  <div class="mode-card">
   <ul class="mode-options">
    <li><button type="button" data-mode="normal">
     Servidor 1
    </button></li>
    <li><button type="button" data-mode="test">
     Servidor de prueba
    </button></li>
   </ul>
   <small class="mode-error" role="alert"></small>
  </div>`;
 const buttons=[...overlay.querySelectorAll('button')];for(const b of buttons)b.onclick=()=>{try{setMode(localStorage,b.dataset.mode);try{sessionStorage.setItem(SESSION,b.dataset.mode)}catch{}overlay.remove();resolve(b.dataset.mode)}catch{overlay.querySelector('.mode-error').textContent='No se pudo guardar la elección. Habilita el almacenamiento del juego e inténtalo de nuevo.'}};
 overlay.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const choices=[...overlay.querySelectorAll('button,a')];choices[(choices.indexOf(document.activeElement)+(e.shiftKey?-1:1)+choices.length)%choices.length].focus()}});
 document.body.appendChild(overlay);buttons[0].focus();
 })}
export async function startPlayMode(){
 const style=document.createElement('link');style.rel='stylesheet';style.href='./css/play-mode.css?v=394';document.head.appendChild(style);
 const config=await configuration();let enabled=config?.testServerEnabled===true,mode='normal',previous='normal',session=null;
 try{previous=savedMode(localStorage);session=sessionStorage.getItem(SESSION)}catch{}
 const params=new URLSearchParams(location.search);
 // Reuse this tab's choice after update, account or CDN-fallback reloads.
 const returning=session===previous;
 if(params.has('play')){const url=new URL(location.href);url.searchParams.delete('play');history.replaceState(null,'',url)}
 if(enabled)mode=params.get('guesttest')==='1'?'test':returning?previous:await picker();
 try{setMode(localStorage,mode);sessionStorage.setItem(SESSION,mode)}catch{}
 document.body.classList.toggle('test-realm',mode==='test');
 const state=window.MUNDO_PLAY_MODE={mode,testEnabled:enabled,async choose(){if(!state.testEnabled)return;const next=await picker();if(next!==mode){dispatchEvent(new Event('mundo:save-before-switch'));location.href='index.html?play='+next}}};
 // The normal offline game remains available if the configuration service cannot be reached.
 if(!config){const note=document.createElement('p');note.id='modeOfflineNote';note.textContent='Servidor 1 · No se pudo comprobar la disponibilidad de pruebas.';document.body.appendChild(note);setTimeout(()=>note.remove(),6500)}
 setInterval(async()=>{const next=await configuration();if(!next)return;state.testEnabled=next.testServerEnabled;document.getElementById('qaPanel')?.classList.toggle('hidden',!state.testEnabled&&mode!=='test');if(mode==='test'&&!state.testEnabled){dispatchEvent(new Event('mundo:save-before-switch'));try{setMode(localStorage,'normal');sessionStorage.setItem(SESSION,'normal')}catch{}location.replace('index.html')}},60000);
 return state;
}
