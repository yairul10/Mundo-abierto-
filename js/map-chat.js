export function mountMapChat({send,storage=localStorage,realm='normal'}){
 const key='cosmos.chatRules.'+realm;let messages=[],blocks=new Set(),myId='',admin=false;
 const root=document.createElement('section');root.id='mapChat';
 const toggle=document.createElement('button');toggle.textContent='💬 Chat';toggle.setAttribute('aria-expanded','false');
 const box=document.createElement('div');box.hidden=true;box.className='map-chat-box';
 const title=document.createElement('strong');title.textContent='Chat del mapa · '+(realm==='test'?'Pruebas':'Normal');
 const close=document.createElement('button');close.textContent='Cerrar';
 const rules=document.createElement('label'),accept=document.createElement('input');accept.type='checkbox';try{accept.checked=storage.getItem(key)==='1'}catch{}
 rules.append(accept,document.createTextNode(' Acepto: respeto a otros; sin acoso, amenazas, contenido sexual, odio, spam ni datos personales. Los mensajes reportados pueden ser revisados y sancionados.'));
 const list=document.createElement('div');list.className='map-chat-messages';list.setAttribute('aria-live','polite');
 const notice=document.createElement('p');notice.setAttribute('role','status');
 const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.maxLength=240;input.placeholder='Mensaje (máx. 240)';input.setAttribute('aria-label','Mensaje del chat');submit.textContent='Enviar';submit.type='submit';form.append(input,submit);
 const blocked=document.createElement('details'),blockedTitle=document.createElement('summary'),blockedList=document.createElement('div');blockedTitle.textContent='Jugadores bloqueados';blocked.append(blockedTitle,blockedList);
 const mod=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Administración';
 const password=document.createElement('input');password.type='password';password.autocomplete='off';password.placeholder='Clave de moderación';password.setAttribute('aria-label','Clave de moderación');
 const login=document.createElement('button');login.textContent='Acceder';const refresh=document.createElement('button');refresh.textContent='Ver reportes';refresh.hidden=true;const reports=document.createElement('div');
 login.onclick=()=>{send({type:'chatAdminAuth',key:password.value});password.value=''};refresh.onclick=()=>send({type:'chatAdminList'});mod.append(summary,password,login,refresh,reports);
 box.append(title,close,rules,list,notice,form,blocked,mod);root.append(toggle,box);document.body.append(root);
 const open=value=>{box.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value)send({type:'chatHistory'})};toggle.onclick=()=>open(box.hidden);close.onclick=()=>open(false);
 // Avoid game gestures/keys while typing, without suppressing normal form controls.
 for(const type of ['pointerdown','touchstart','keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation());
 accept.onchange=()=>{try{storage.setItem(key,accept.checked?'1':'0')}catch{}submit.disabled=!accept.checked};submit.disabled=!accept.checked;
 form.onsubmit=e=>{e.preventDefault();if(!accept.checked){notice.textContent='Acepta las reglas para escribir.';return}if(!input.value.trim())return;send({type:'chatSend',text:input.value,rulesVersion:1});input.value=''};
 function render(){
  list.replaceChildren();for(const m of messages.filter(m=>!blocks.has(m.author))){const row=document.createElement('div'),text=document.createElement('span');text.textContent=m.name+': '+m.text;row.append(text);
   if(m.author!==myId){const report=document.createElement('button');report.textContent='Reportar';report.onclick=()=>{const reason=window.prompt('Motivo del reporte (acoso, spam, amenazas u otro):');if(reason?.trim())send({type:'chatReport',id:m.id,reason})};const block=document.createElement('button');block.textContent='Bloquear';block.onclick=()=>send({type:'chatBlock',target:m.author,block:true});row.append(report,block)}list.append(row)}list.scrollTop=list.scrollHeight;
  blockedList.replaceChildren();for(const id of blocks){const button=document.createElement('button');button.textContent='Desbloquear #'+id.slice(-6);button.onclick=()=>send({type:'chatBlock',target:id,block:false});blockedList.append(button)}
 }
 return {identify(id){myId=id},reset(){admin=false;refresh.hidden=true;password.hidden=login.hidden=false;reports.replaceChildren();messages=[];render()},receive(m){
  if(!m.type?.startsWith('chat'))return false;
  if(m.type==='chatHistory'){messages=m.messages;blocks=new Set(m.blocks);render()}
  if(m.type==='chatMessage'){messages=[...messages,m.message].slice(-100);render();if(box.hidden)toggle.textContent='💬 Chat · nuevo'}
  if(m.type==='chatDeleted'){messages=messages.filter(x=>x.id!==m.id);render()}
  if(m.type==='chatBlocked'){m.block?blocks.add(m.target):blocks.delete(m.target);render()}
  if(m.type==='chatError')notice.textContent=m.error;
  if(m.type==='chatNotice')notice.textContent=m.text;
  if(m.type==='chatAdminReady'){admin=true;refresh.hidden=false;password.hidden=login.hidden=true;send({type:'chatAdminList'})}
  if(m.type==='chatReports'&&admin){reports.replaceChildren();for(const r of m.reports){const row=document.createElement('div'),text=document.createElement('p');text.textContent=r.name+' #'+r.author.slice(-6)+' · '+r.text+' · Motivo: '+r.reason+' · '+r.status;row.append(text);for(const [action,label]of [['dismiss','Descartar'],['delete','Borrar mensaje'],['muteHour','Silenciar 1 h'],['muteDay','Silenciar 24 h'],['banChat','Banear del chat'],['unmute','Quitar silencio']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(window.confirm(label+' a '+r.name+'?'))send({type:'chatModerate',reportId:r.id,action})};row.append(b)}reports.append(row)}}return true;
 }};
}
