const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const roles={leader:'Líder',officer:'Oficial',member:'Miembro'};
const admissions={open:'Ingreso libre',request:'Por solicitud',invite:'Solo invitación'};
export function mountClans({button,getToken,createClan,hasPendingCreation=()=>false,realm='normal'}){
 let dialog=null,controller=null,epoch=0,busy=false,accountState=null;
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const style=element('link');style.rel='stylesheet';style.href='./css/clans.css?v=474';document.head.append(style);
 button.onclick=()=>{
  if(dialog)return;
  dialog=element('dialog');dialog.className='clan-dialog';dialog.setAttribute('aria-label','Clanes');
  const header=element('header'),title=element('h2','Clanes'),close=element('button','Cerrar'),tabs=element('nav'),mine=element('button','Mi clan'),searchTab=element('button','Buscar clanes'),missionsTab=element('button','Misiones'),rankingTab=element('button','Ranking'),content=element('section'),status=element('p');status.setAttribute('role','status');content.setAttribute('aria-live','polite');header.append(title,close);tabs.append(mine,searchTab,missionsTab,rankingTab);dialog.append(header,tabs,status,content);
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
  async function write(action,form){if(busy)return;busy=true;missionsTab.disabled=rankingTab.disabled=close.disabled=mine.disabled=searchTab.disabled=true;for(const node of form?.querySelectorAll?.('input,textarea,select,button')||[])node.disabled=true;status.textContent='Guardando…';try{await action();busy=false;globalThis.dispatchEvent?.(new Event('cosmos:clans-changed'));mine.onclick()}catch(error){status.textContent=error.message}finally{busy=false;missionsTab.disabled=rankingTab.disabled=close.disabled=mine.disabled=searchTab.disabled=false;for(const node of form?.querySelectorAll?.('input,textarea,select,button')||[])node.disabled=false}}
  function actionButton(label,action,clanId,targetId){const button=element('button',label);button.type='button';button.onclick=()=>membership(action,clanId,targetId);return button}
  function membership(action,clanId,targetId,form){return write(async()=>{
   const token=await getToken(),response=await fetch(API+'/clans/membership?realm='+encodeURIComponent(realm),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,clanId,targetId}),signal:AbortSignal.timeout(12000)}),result=await response.json();
   if(!response.ok)throw Error(({clan_full:'El clan ya tiene 20 miembros.',already_in_clan:'Ese piloto ya pertenece a un clan.',clan_forbidden:'Solo el líder o un oficial pueden gestionar los ingresos.',invalid_pilot:'Usa el ID completo que aparece en Clanes del otro piloto.',pilot_unavailable:'No se pudo invitar: revisa el ID, el cupo y si el piloto ya tiene clan.',clan_unavailable:'El ingreso ya no está disponible. Revisa el clan o la invitación.',clan_request_limit:'Puedes mantener hasta cinco solicitudes pendientes.',clan_invitation_limit:'Este clan ya tiene 50 invitaciones pendientes.',leader_cannot_leave:'El líder no puede salir mientras conserve el liderazgo.',cannot_invite_self:'No puedes invitarte a ti mismo.'})[result.error]||'No se pudo completar la acción. Vuelve a abrir Mi clan para comprobarla.');
  },form)}
  function membershipLists(data){
   if(data.pilotId){const label=element('label','Tu ID de piloto'),id=element('input');id.value=data.pilotId;id.readOnly=true;id.setAttribute('aria-label','Tu ID de piloto para invitaciones');id.onclick=()=>id.select?.();label.append(id);content.append(label,element('p','Comparte este ID para recibir invitaciones de otros clanes.'));}
   for(const invite of data.invitations||[]){const row=element('article');row.append(element('p','Invitación de ['+invite.tag+'] '+invite.name),actionButton('Aceptar invitación','acceptInvite',invite.clan_id),actionButton('Rechazar invitación','declineInvite',invite.clan_id));content.append(row)}
   for(const request of data.requests||[]){const row=element('article');row.append(element('p','Solicitud pendiente: ['+request.tag+'] '+request.name),actionButton('Cancelar solicitud','cancelRequest',request.clan_id));content.append(row)}
   if(!data.clan||!data.permissions?.manageAdmissions)return;
   const form=element('form'),input=element('input'),submit=element('button','Invitar piloto');input.placeholder='ID completo del piloto';input.setAttribute('aria-label','ID del piloto a invitar');input.required=true;input.maxLength=36;submit.type='submit';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();return membership('invite',data.clan.id,input.value.trim(),form)};content.append(element('h3','Invitaciones · duran 7 días'),form);
   for(const invite of data.outgoingInvitations||[]){const row=element('article');row.append(element('p','Invitado: '+(invite.pilot||'Nombre no disponible')),actionButton('Cancelar invitación','cancelInvite',data.clan.id,invite.account_id));content.append(row)}
   if(data.pendingRequests?.length)content.append(element('h3','Solicitudes de ingreso'));
   for(const request of data.pendingRequests||[]){const row=element('article');row.append(element('p',request.pilot||'Nombre no disponible'),actionButton('Aprobar ingreso','approve',data.clan.id,request.account_id),actionButton('Rechazar solicitud','reject',data.clan.id,request.account_id));content.append(row)}
  }
  function adminButton(label,action,clan,member){
   const button=element('button',label);button.type='button';const operationId=()=>crypto.randomUUID();
   async function execute(id){return write(async()=>{const token=await getToken(),response=await fetch(API+'/clans/admin?realm='+encodeURIComponent(realm),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,clanId:clan.id,targetId:member?.account_id,operationId:id}),signal:AbortSignal.timeout(12000)}),result=await response.json();if(!response.ok)throw Error(({clan_forbidden:'No tienes permiso para realizar esta acción.',clan_target_unavailable:'El piloto ya no está disponible en este clan.',clan_role_changed:'El cargo del piloto cambió. Actualiza Mi clan.',operation_conflict:'Esta operación ya se utilizó para otra acción.'})[result.error]||'No se pudo confirmar la acción. Vuelve a intentarlo o actualiza Mi clan.')})}
   let pending=null;
   button.onclick=()=>{
    if(busy)return;
    pending||=operationId();
    if(action==='promote'||action==='demote')return execute(pending);
    const box=element('section');box.className='clan-confirm';
    const pilot=member?.pilot||'Nombre no disponible';
    box.append(element('h3',label),element('p',action==='transfer'?'El nuevo líder será '+pilot+'. Tú pasarás a ser oficial.':action==='kick'?'Se expulsará a '+pilot+' del clan.':'Se eliminarán el clan, sus membresías, solicitudes e invitaciones. No se devuelven los 200.000 créditos de creación.'));
    let tag;if(action==='disband'){tag=element('input');tag.placeholder='Escribe '+clan.tag+' para confirmar';tag.setAttribute('aria-label','Etiqueta del clan para confirmar disolución');box.append(tag)}
    const confirm=element('button','Confirmar '+(action==='transfer'?'transferencia':action==='kick'?'expulsión':'disolución')),cancel=element('button','Cancelar');confirm.type=cancel.type='button';confirm.onclick=()=>{if(tag&&tag.value.trim().toUpperCase()!==clan.tag){status.textContent='Escribe la etiqueta exacta del clan para confirmar.';return}return execute(pending)};cancel.onclick=()=>{if(!busy){box.remove();pending=null;button.disabled=false}};box.append(confirm,cancel);content.append(box);button.disabled=true;
   };return button;
  }
  function showClan(clan){
   title.textContent='['+clan.tag+'] '+clan.name;
   const summary=element('p',(clan.memberCount??clan.members?.length??0)+'/20 miembros · '+(admissions[clan.admission]||'')),description=element('p',clan.description||'Sin descripción.'),heading=element('h3','Miembros'),list=element('ul');list.className='clan-members';
   for(const member of clan.members||[]){const row=element('li'),name=element('span',member.pilot||'Nombre no disponible'),role=element('strong',roles[member.role]||'Miembro');row.append(name,role);if(clan.role&&member.account_id&&member.account_id!==accountState?.pilotId&&member.role!=='leader'){const actions=element('div');actions.className='clan-member-actions';if(clan.role==='leader'){actions.append(adminButton(member.role==='officer'?'Quitar cargo de oficial':'Ascender a oficial',member.role==='officer'?'demote':'promote',clan,member),adminButton('Transferir liderazgo','transfer',clan,member));}if(clan.role==='leader'||clan.role==='officer'&&member.role==='member')actions.append(adminButton('Expulsar','kick',clan,member));row.append(actions);}list.append(row)}
   if(!list.children.length)list.append(element('li','No hay miembros para mostrar.'));
   content.append(summary,description,heading,list);if(!clan.role&&!accountState?.clan){if(clan.admission==='open')content.append(actionButton('Unirme al clan','join',clan.id));else if(clan.admission==='request')content.append(actionButton('Solicitar ingreso','request',clan.id));else content.append(element('p','Este clan requiere una invitación.'));}
   if(clan.role&&clan.role!=='leader'){const leave=element('button','Salir del clan');leave.onclick=()=>{content.append(element('p','¿Confirmas que quieres salir de este clan?'),actionButton('Confirmar salida','leave',clan.id));leave.disabled=true;};content.append(leave);}
   if(clan.role==='leader')content.append(element('p','Para salir, transfiere el liderazgo a otro miembro. Si quieres cerrar el clan, puedes disolverlo.'),adminButton('Disolver clan','disband',clan));
   if(clan.role==='leader'){const edit=element('button','Administrar clan');edit.onclick=()=>fieldsForm(clan);content.append(edit);}
  }
  mine.onclick=()=>{title.textContent='Mi clan';load('/clans/me',data=>{
   accountState=data;globalThis.dispatchEvent?.(new CustomEvent('cosmos:clans-changed',{detail:{pilotId:data.pilotId}}));if(data.clan)showClan(data.clan);else{content.append(element('h3','Todavía no perteneces a un clan'));const create=element('button','Crear clan · 200.000 créditos');create.onclick=()=>fieldsForm();const search=element('button','Buscar clanes');search.onclick=()=>searchTab.onclick();content.append(create,search)}
   membershipLists(data);
   if(hasPendingCreation()){const recover=element('button','Comprobar creación pendiente');recover.onclick=()=>write(()=>createClan({}));content.append(element('p','Hay una creación pendiente de confirmar. Compruébala antes de volver a crear.'),recover);}
  })};
  searchTab.onclick=()=>{
   epoch++;controller?.abort();title.textContent='Buscar clanes';status.textContent='';content.replaceChildren();
   const form=element('form'),input=element('input'),submit=element('button','Buscar');input.type='search';input.maxLength=40;input.placeholder='Nombre o etiqueta';input.setAttribute('aria-label','Nombre o etiqueta del clan');submit.type='submit';form.append(input,submit);content.append(form);
   const results=element('div');content.append(results);
   function search(){const query=input.value.trim();load('/clans/search?q='+encodeURIComponent(query),data=>{content.append(form,results);results.replaceChildren();if(!data.clans.length){results.append(element('p',query?'No se encontraron clanes con ese nombre o etiqueta.':'Todavía no hay clanes creados.'));return}for(const clan of data.clans){const card=element('button');card.className='clan-card';card.append(element('strong','['+clan.tag+'] '+clan.name),element('span',clan.memberCount+'/20 · '+admissions[clan.admission]));card.onclick=()=>load('/clans/detail?id='+encodeURIComponent(clan.id),data=>showClan(data.clan));results.append(card)}if(data.clans.length===data.limit)results.append(element('p','Se muestran los primeros 20. Escribe un nombre o etiqueta para afinar la búsqueda.'))})}
   form.onsubmit=e=>{e.preventDefault();search()};search();
  };
  const period=data=>element('p','Semana actual · termina '+new Date(data.endsAt).toLocaleString()+'. Reinicio: lunes 00:00 UTC.');
  missionsTab.onclick=()=>{title.textContent='Misiones del clan';load('/clans/missions',data=>{
   content.append(period(data));if(!data.clan){content.append(element('p','Únete a un clan para participar en sus misiones.'));return;}
   content.append(element('h3','['+data.clan.tag+'] '+data.clan.name),element('p','Bajas del cooperativo validadas por el servidor. Cada enemigo cuenta una vez para el clan; los pilotos que hicieron daño registran su participación.'));
   for(const mission of data.missions){const row=element('article'),bar=element('progress');bar.max=mission.goal;bar.value=mission.progress;bar.setAttribute('aria-label',mission.title);row.append(element('h3',mission.title),element('p',mission.progress+'/'+mission.goal+' · '+mission.points+' puntos'+(mission.completed?' · Completada ✓':'')),bar);content.append(row)}
   content.append(element('h3','Aportes de la semana'),element('p','Las participaciones de varios miembros en una misma baja se muestran por separado. Los puntos ya obtenidos permanecen en el clan aunque un miembro salga.'));
   const list=element('ol');for(const pilot of data.contributors)list.append(element('li',pilot.pilot+' · '+pilot.kills+' participaciones'));if(!data.contributors.length)content.append(element('p','Todavía no hay aportes.'));else content.append(list);
  })};
  rankingTab.onclick=()=>{title.textContent='Ranking semanal de clanes';load('/clans/ranking',data=>{
   content.append(period(data),element('p','Puntos por misiones completadas. En empates se comparan las bajas únicas del clan.'));
   if(!data.ranking.length){content.append(element('p','Todavía no hay clanes para mostrar.'));return;}
   const list=element('ol');for(const clan of data.ranking){const row=element('li');row.append(element('strong','['+clan.tag+'] '+clan.name),element('p',clan.points+' puntos · '+clan.kills+' bajas'));list.append(row)}content.append(list,element('p','Se muestran hasta '+data.limit+' clanes.'));
  })};
  document.body.append(dialog);dialog.showModal();mine.onclick();
 };
}
