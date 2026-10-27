import {chatLayout} from './chat-layout.js?v=1';
export function mountMapChat({send,storage=localStorage,realm='normal'}){
 const LANGUAGES={es:'Español',en:'English',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano',tr:'Türkçe'};
 const preferred=(navigator.language||'es').split('-')[0];let language=Object.hasOwn(LANGUAGES,preferred)?preferred:'es',auto=true,translationAvailable=false,queue=[],requested=new Set(),translations=new Map(),originals=new Set();
 try{language=storage.getItem('cosmos.chatLanguage')||language;auto=storage.getItem('cosmos.chatTranslate')!=='off'}catch{}if(!Object.hasOwn(LANGUAGES,language))language='es';
 const key='cosmos.chatRules.'+realm;let messages=[],blocks=new Set(),myId='',admin=false;
 const root=document.createElement('section');root.id='mapChat';
 const toggle=document.createElement('button');toggle.textContent='💬 Chat';toggle.setAttribute('aria-expanded','false');
 const box=document.createElement('div');box.hidden=true;box.className='map-chat-box';
 const title=document.createElement('strong');title.textContent='Chat del mapa · '+(realm==='test'?'Pruebas':'Normal');
 const identityText=document.createElement('small');identityText.style.cssText='display:block;user-select:text;margin:8px 0';
 const close=document.createElement('button');close.textContent='−';close.setAttribute('aria-label','Minimizar chat');
 const header=document.createElement('header');header.className='map-chat-header';
 const move=document.createElement('button');move.textContent='⠿';move.className='map-chat-move';move.title='Arrastra para mover el chat. También puedes usar las flechas.';move.setAttribute('aria-label','Mover chat');
 const settingsButton=document.createElement('button');settingsButton.textContent='⚙';settingsButton.setAttribute('aria-label','Ajustes y administración del chat');settingsButton.setAttribute('aria-expanded','false');
 const settings=document.createElement('section');settings.className='map-chat-settings';settings.hidden=true;
 header.append(move,title,settingsButton,close);
 const resize=document.createElement('button');resize.className='map-chat-resize';resize.textContent='◢';resize.setAttribute('aria-label','Cambiar tamaño del chat');resize.title='Arrastra para cambiar el tamaño';
 const layoutKey='cosmos.chatLayout.v1';let layout;
 try{layout=chatLayout(JSON.parse(storage.getItem(layoutKey)||'{}'))}catch{layout=chatLayout()}
 function applyLayout(save=false){layout=chatLayout(layout);root.style.left=layout.x+'px';root.style.top=layout.y+'px';box.style.width=layout.width+'px';box.style.height=layout.height+'px';root.style.setProperty('--chat-font',layout.font+'px');if(save)try{storage.setItem(layoutKey,JSON.stringify(layout))}catch{}}
 applyLayout();window.addEventListener('resize',()=>applyLayout());
 function drag(handle,sizing){let start=null;handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();start={x:e.clientX,y:e.clientY,layout:{...layout}};handle.setPointerCapture(e.pointerId)});handle.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;layout=sizing?{...start.layout,width:start.layout.width+dx,height:start.layout.height+dy}:{...start.layout,x:start.layout.x+dx,y:start.layout.y+dy};applyLayout()});for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,()=>{if(start){start=null;applyLayout(true)}});handle.addEventListener('keydown',e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!delta)return;e.preventDefault();if(sizing){layout.width+=delta[0];layout.height+=delta[1]}else{layout.x+=delta[0];layout.y+=delta[1]}applyLayout(true)})}
 drag(move,false);drag(resize,true);
 settingsButton.onclick=()=>{settings.hidden=!settings.hidden;settingsButton.setAttribute('aria-expanded',String(!settings.hidden))};
 const fontLabel=document.createElement('label'),font=document.createElement('input');font.type='range';font.min='11';font.max='20';font.value=String(layout.font);fontLabel.append('Tamaño del texto ',font);font.oninput=()=>{layout.font=Number(font.value);applyLayout(true)};
 const layoutHelp=document.createElement('small');layoutHelp.textContent='Mueve el chat desde ⠿ y cambia su tamaño desde la esquina ◢. Se guarda en este dispositivo.';
 const resetLayout=document.createElement('button');resetLayout.textContent='Restablecer tamaño y posición';resetLayout.onclick=()=>{layout=chatLayout();font.value=String(layout.font);applyLayout(true)};
 const rulesButton=document.createElement('button');rulesButton.textContent='Ver condiciones del chat';rulesButton.onclick=()=>{rules.hidden=false;settings.hidden=true;settingsButton.setAttribute('aria-expanded','false')};

 const rules=document.createElement('label'),accept=document.createElement('input');accept.type='checkbox';try{accept.checked=storage.getItem(key)==='1'}catch{}
 rules.append(accept,document.createTextNode(' Acepto: respeto a otros; sin acoso, amenazas, contenido sexual, odio, spam ni datos personales. Los mensajes reportados pueden ser revisados y sancionados.'));
 const languageLabel=document.createElement('label'),select=document.createElement('select');languageLabel.append('Idioma que escribo y leo: ',select);
 for(const [value,label] of Object.entries(LANGUAGES)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value=language;
 const translateLabel=document.createElement('label'),translateCheck=document.createElement('input');translateCheck.type='checkbox';translateCheck.checked=auto;translateLabel.append(translateCheck,' Traducir automáticamente (puede contener errores)');
 const translationStatus=document.createElement('small');translationStatus.textContent='La traducción requiere activación del servidor.';
 const list=document.createElement('div');list.className='map-chat-messages';list.setAttribute('aria-live','polite');
 const notice=document.createElement('p');notice.setAttribute('role','status');
 const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.maxLength=240;input.placeholder='Mensaje (máx. 240)';input.setAttribute('aria-label','Mensaje del chat');submit.textContent='Enviar';submit.type='submit';form.append(input,submit);
 const blocked=document.createElement('details'),blockedTitle=document.createElement('summary'),blockedList=document.createElement('div');blockedTitle.textContent='Jugadores bloqueados';blocked.append(blockedTitle,blockedList);
 const mod=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Administración';
 const password=document.createElement('input');password.type='password';password.autocomplete='off';password.placeholder='Clave de moderación';password.setAttribute('aria-label','Clave de moderación');
 const login=document.createElement('button');login.textContent='Acceder';const refresh=document.createElement('button');refresh.textContent='Ver reportes';refresh.hidden=true;const reports=document.createElement('div');
 login.onclick=()=>{send({type:'chatAdminAuth',key:password.value});password.value=''};refresh.onclick=()=>send({type:'chatAdminList'});mod.append(summary,password,login,refresh,reports);
 settings.append(identityText,languageLabel,translateLabel,translationStatus,fontLabel,layoutHelp,resetLayout,rulesButton,blocked,mod);box.append(header,rules,list,notice,form,settings,resize);root.append(toggle,box);document.body.append(root);
 function schedule(){if(!auto||!translationAvailable)return;for(const m of messages){const k=m.id+':'+language;if(m.language&&m.language!==language&&!blocks.has(m.author)&&!translations.has(k)&&!requested.has(k)){queue.push({id:m.id,language});requested.add(k)}}}
 select.onchange=()=>{language=select.value;queue=[];requested.clear();try{storage.setItem('cosmos.chatLanguage',language)}catch{}schedule();render()};
 translateCheck.onchange=()=>{auto=translateCheck.checked;queue=[];requested.clear();try{storage.setItem('cosmos.chatTranslate',auto?'on':'off')}catch{}schedule();render()};
 const timer=setInterval(()=>{if(box.hidden||!auto||!translationAvailable)return;const next=queue.shift();if(next&&messages.some(m=>m.id===next.id&&!blocks.has(m.author)))send({type:'chatTranslate',...next})},1100);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 const open=value=>{box.hidden=!value;toggle.hidden=value;toggle.textContent='💬 Chat';toggle.setAttribute('aria-expanded',String(value));if(value){applyLayout();send({type:'chatHistory'})}};toggle.onclick=()=>open(box.hidden);close.onclick=()=>open(false);
 // Avoid game gestures/keys while typing, without suppressing normal form controls.
 for(const type of ['pointerdown','touchstart','keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation());
 accept.onchange=()=>{try{storage.setItem(key,accept.checked?'1':'0')}catch{}submit.disabled=!accept.checked;rules.hidden=accept.checked};submit.disabled=!accept.checked;rules.hidden=accept.checked;
 form.onsubmit=e=>{e.preventDefault();if(!accept.checked){notice.textContent='Acepta las reglas para escribir.';return}if(!input.value.trim())return;send({type:'chatSend',text:input.value,language,rulesVersion:1});input.value=''};
 function render(){
  list.replaceChildren();for(const m of messages.filter(m=>!blocks.has(m.author))){const row=document.createElement('div'),text=document.createElement('span');const translated=translations.get(m.id+':'+language);text.textContent=m.name+': '+(auto&&translated&&!originals.has(m.id)?translated:m.text);row.append(text);
   if(auto&&translated){const original=document.createElement('button');original.textContent=originals.has(m.id)?'Ver traducción':'Ver original';original.onclick=()=>{originals.has(m.id)?originals.delete(m.id):originals.add(m.id);render()};row.append(original)}
   if(m.author!==myId){const actions=document.createElement('details'),more=document.createElement('summary');more.textContent='⋯';more.setAttribute('aria-label','Opciones del mensaje de '+m.name);actions.append(more);const report=document.createElement('button');report.textContent='Reportar';report.onclick=()=>{const reason=window.prompt('Motivo del reporte (acoso, spam, amenazas u otro):');if(reason?.trim())send({type:'chatReport',id:m.id,reason})};const block=document.createElement('button');block.textContent='Bloquear';block.onclick=()=>send({type:'chatBlock',target:m.author,block:true});actions.append(report,block);row.append(actions)}list.append(row)}list.scrollTop=list.scrollHeight;
  blockedList.replaceChildren();for(const id of blocks){const button=document.createElement('button');button.textContent='Desbloquear #'+id.slice(-6);button.onclick=()=>send({type:'chatBlock',target:id,block:false});blockedList.append(button)}
 }
 return {ready(){if(!box.hidden)send({type:'chatHistory'})},identify(id){myId=id;identityText.textContent='Tu ID: '+id},reset(){admin=false;refresh.hidden=true;password.hidden=login.hidden=false;reports.replaceChildren();messages=[];queue=[];requested.clear();translations.clear();originals.clear();translationAvailable=false;render()},receive(m){
  if(!m.type?.startsWith('chat'))return false;
  if(m.type==='chatHistory'){messages=m.messages;blocks=new Set(m.blocks);translationAvailable=!!m.translationAvailable;translationStatus.textContent=translationAvailable?'Traducción automática disponible.':'Traducción no disponible; se muestran los mensajes originales.';schedule();render()}
  if(m.type==='chatMessage'){messages=[...messages,m.message].slice(-100);schedule();render();if(box.hidden)toggle.textContent='💬 Chat · nuevo'}
  if(m.type==='chatTranslation'&&messages.some(x=>x.id===m.id&&!blocks.has(x.author))){translations.set(m.id+':'+m.language,m.text);render()}
  if(m.type==='chatTranslationUnavailable')translationStatus.textContent='Algunas traducciones no están disponibles; se conserva el original.';
  if(m.type==='chatDeleted'){messages=messages.filter(x=>x.id!==m.id);render()}
  if(m.type==='chatBlocked'){m.block?blocks.add(m.target):blocks.delete(m.target);render()}
  if(m.type==='chatError')notice.textContent=m.error;
  if(m.type==='chatNotice')notice.textContent=m.text;
  if(m.type==='chatAdminReady'){admin=true;refresh.hidden=false;password.hidden=login.hidden=true;send({type:'chatAdminList'})}
  if(m.type==='chatReports'&&admin){reports.replaceChildren();if(!m.reports.length)reports.textContent='No hay reportes pendientes.';for(const r of m.reports){const row=document.createElement('div'),text=document.createElement('p');text.textContent=r.name+' #'+r.author.slice(-6)+' · '+r.text+' · Motivo: '+r.reason+' · '+r.status;row.append(text);for(const [action,label]of [['dismiss','Descartar'],['delete','Borrar mensaje'],['muteHour','Silenciar 1 h'],['muteDay','Silenciar 24 h'],['banChat','Banear del chat'],['unmute','Quitar silencio']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(window.confirm(label+' a '+r.name+'?'))send({type:'chatModerate',reportId:r.id,action})};row.append(b)}reports.append(row)}}return true;
 }};
}
