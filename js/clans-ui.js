const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const roles={leader:'Líder',officer:'Oficial',member:'Miembro'};
const admissions={open:'Ingreso libre',request:'Por solicitud',invite:'Solo invitación'};
export function mountClans({button,getToken,createClan,hasPendingCreation=()=>false,realm='normal'}){
 let dialog=null,controller=null,epoch=0,busy=false;
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const style=element('link');style.rel='stylesheet';style.href='./css/clans.css?v=467';document.head.append(style);
 button.onclick=()=>{
  if(dialog)return;
  dialog=element('dialog');dialog.className='clan-dialog';dialog.setAttribute('aria-label','Clanes');
  const header=element('header'),title=element('h2','Clanes'),close=element('button','Cerrar'),tabs=element('nav'),mine=element('button','Mi clan'),searchTab=element('button','Buscar clanes'),content=element('section'),status=element('p');status.setAttribute('role','status');content.setAttribute('aria-live','polite');header.append(title,close);tabs.append(mine,searchTab);dialog.append(header,tabs,status,content);
  function finish(){if(busy)return;epoch++;controller?.abort();dialog?.close();dialog?.remove();dialog=null;button.focus()}
  close.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});dialog.addEventListener('click',e=>{if(e.target===dialog)finish()});
  for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());
  async function load(path,render){
   const ticket=++epoch;controller?.abort();controller=new AbortController();const currentController=controller,signal=controller.signal;status.textContent='Cargando…';content.replaceChildren();
   let timer;try{const token=await getToken();if(ticket!==epoch||!dialog)return;timer=setTimeout(()=>currentController.abort(),12000);
    const response=await fetch(API+path+(path.includes('?')?'&':'?')+'realm='+encodeURIComponent(realm),{headers:{Authorization:'Bearer '+token},signal,cache:'no-store'});const data=await response.json();
    if(ticket!==epoch||!dialog)return;
    if(!response.ok)throw Error(({google_required:'Inicia sesión con Google Play para ver los clanes.',clan_not_found:'Este clan ya no está disponible.',test_closed:'El servidor de prueba está cerrado.'})[data.error]||'No se pudieron cargar los clanes. Vuelve a intentarlo.');
    status.textContent='';render(data);
   }catch(error){if(ticket!==epoch||!dialog)return;status.textContent=signal.aborted?'La conexión tardó demasiado. Vuelve a intentarlo.':error.message;const retry=element('button','Reintentar');retry.onclick=()=>load(path,render);content.replaceChildren(retry)}finally{clearTimeout(timer)}
  }
  function fieldsForm(clan=null){
   epoch++;controller?.abort();status.textContent='';content.replaceChildren();title.textContent=clan?'Administrar clan':'Crear clan';
   const form=element('form');form.className='clan-form';const fields={};
   for(const [id,label,max]of (clan?[['description','Descripción',240]]:[['name','Nombre del clan',24],['tag','Etiqueta',5],['description','Descripción',240]])){
    const wrapper=element('label',label),input=element(id==='description'?'textarea':'input');input.name=id;input.maxLength=max;input.value=clan?.[id]||'';input.required=id!=='description';if(id==='name')input.minLength=3;if(id==='tag'){input.minLength=2;input.pattern='[A-Za-z0-9]{2,5}';input.autocapitalize='characters';}wrapper.append(input);form.append(wrapper);fields[id]=input;
   }
   const label=element('label','Tipo de ingreso'),select=element('select');for(const [value,text]of Object.entries(admissions)){const option=element('option',text);option.value=value;select.append(option)}select.value=clan?.admission||'request';label.append(select);form.append(label);fields.admission=select;
   if(!clan)form.append(element('p','Crear el clan cuesta 200.000 créditos. Serás su líder y tendrá espacio para 20 miembros.'));
   const submit=element('button',clan?'Guardar cambios':'Crear clan · 200.000 créditos');submit.type='submit';form.append(submit);
   form.onsubmit=async e=>{e.preventDefault();if(busy)return;const values=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()]));await write(async()=>{
    if(!clan){if(!createClan)throw Error('La creación requiere la aplicación actualizada.');await createClan(values)}
    else{const token=await getToken(),response=await fetch(API+'/clans/edit?realm='+encodeURIComponent(realm),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...values,id:clan.id,revision:clan.revision}),signal:AbortSignal.timeout(12000)}),result=await response.json();if(!response.ok)throw Error(result.error==='clan_edit_conflict'?'El clan cambió o no tienes permisos. Vuelve a abrir Mi clan.':'No se pudieron guardar los cambios.')}
   },form)};content.append(form);
  }
  async function write(action,form){busy=true;close.disabled=mine.disabled=searchTab.disabled=true;for(const node of form?.querySelectorAll?.('input,textarea,select,button')||[])node.disabled=true;status.textContent='Guardando…';try{await action();busy=false;mine.onclick()}catch(error){status.textContent=error.message}finally{busy=false;close.disabled=mine.disabled=searchTab.disabled=false;for(const node of form?.querySelectorAll?.('input,textarea,select,button')||[])node.disabled=false}}
  function showClan(clan){
   title.textContent='['+clan.tag+'] '+clan.name;
   const summary=element('p',(clan.memberCount??clan.members?.length??0)+'/20 miembros · '+(admissions[clan.admission]||'')),description=element('p',clan.description||'Sin descripción.'),heading=element('h3','Miembros'),list=element('ul');list.className='clan-members';
   for(const member of clan.members||[]){const row=element('li'),name=element('span',member.pilot||'Piloto #'+String(member.account_id||'').replaceAll('-','').slice(-6)),role=element('strong',roles[member.role]||'Miembro');row.append(name,role);list.append(row)}
   if(!list.children.length)list.append(element('li','No hay miembros para mostrar.'));
   content.append(summary,description,heading,list);if(clan.role==='leader'){const edit=element('button','Administrar clan');edit.onclick=()=>fieldsForm(clan);content.append(edit);}
  }
  mine.onclick=()=>{title.textContent='Mi clan';load('/clans/me',data=>{
   if(data.clan)showClan(data.clan);else{content.append(element('h3','Todavía no perteneces a un clan'));const create=element('button','Crear clan · 200.000 créditos');create.onclick=()=>fieldsForm();const search=element('button','Buscar clanes');search.onclick=()=>searchTab.onclick();content.append(create,search)}
   if(hasPendingCreation()){const recover=element('button','Comprobar creación pendiente');recover.onclick=()=>write(()=>createClan({}));content.append(element('p','Hay una creación pendiente de confirmar. Compruébala antes de volver a crear.'),recover);}
  })};
  searchTab.onclick=()=>{
   epoch++;controller?.abort();title.textContent='Buscar clanes';status.textContent='';content.replaceChildren();
   const form=element('form'),input=element('input'),submit=element('button','Buscar');input.type='search';input.maxLength=40;input.placeholder='Nombre o etiqueta';input.setAttribute('aria-label','Nombre o etiqueta del clan');submit.type='submit';form.append(input,submit);content.append(form);
   const results=element('div');content.append(results);
   function search(){const query=input.value.trim();load('/clans/search?q='+encodeURIComponent(query),data=>{content.append(form,results);results.replaceChildren();if(!data.clans.length){results.append(element('p',query?'No se encontraron clanes con ese nombre o etiqueta.':'Todavía no hay clanes creados.'));return}for(const clan of data.clans){const card=element('button');card.className='clan-card';card.append(element('strong','['+clan.tag+'] '+clan.name),element('span',clan.memberCount+'/20 · '+admissions[clan.admission]));card.onclick=()=>load('/clans/detail?id='+encodeURIComponent(clan.id),data=>showClan(data.clan));results.append(card)}if(data.clans.length===data.limit)results.append(element('p','Se muestran los primeros 20. Escribe un nombre o etiqueta para afinar la búsqueda.'))})}
   form.onsubmit=e=>{e.preventDefault();search()};search();
  };
  document.body.append(dialog);dialog.showModal();mine.onclick();
 };
}
