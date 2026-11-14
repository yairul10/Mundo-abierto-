const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const roles={leader:'Líder',officer:'Oficial',member:'Miembro'};
const admissions={open:'Ingreso libre',request:'Por solicitud',invite:'Solo invitación'};
export function mountClans({button,getToken,realm='normal'}){
 let dialog=null,controller=null,epoch=0;
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const style=element('link');style.rel='stylesheet';style.href='./css/clans.css?v=465';document.head.append(style);
 button.onclick=()=>{
  if(dialog)return;
  dialog=element('dialog');dialog.className='clan-dialog';dialog.setAttribute('aria-label','Clanes');
  const header=element('header'),title=element('h2','Clanes'),close=element('button','Cerrar'),tabs=element('nav'),mine=element('button','Mi clan'),searchTab=element('button','Buscar clanes'),content=element('section'),status=element('p');status.setAttribute('role','status');content.setAttribute('aria-live','polite');header.append(title,close);tabs.append(mine,searchTab);dialog.append(header,tabs,status,content);
  function finish(){epoch++;controller?.abort();dialog?.close();dialog?.remove();dialog=null;button.focus()}
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
  function showClan(clan){
   title.textContent='['+clan.tag+'] '+clan.name;
   const summary=element('p',(clan.memberCount??clan.members?.length??0)+'/20 miembros · '+(admissions[clan.admission]||'')),description=element('p',clan.description||'Sin descripción.'),heading=element('h3','Miembros'),list=element('ul');list.className='clan-members';
   for(const member of clan.members||[]){const row=element('li'),name=element('span',member.pilot||'Piloto #'+String(member.account_id||'').replaceAll('-','').slice(-6)),role=element('strong',roles[member.role]||'Miembro');row.append(name,role);list.append(row)}
   if(!list.children.length)list.append(element('li','No hay miembros para mostrar.'));
   content.append(summary,description,heading,list);
  }
  mine.onclick=()=>{title.textContent='Mi clan';load('/clans/me',data=>{if(data.clan){showClan(data.clan);return}content.append(element('h3','Todavía no perteneces a un clan'),element('p','Explora los clanes disponibles en Buscar clanes.'));const search=element('button','Buscar clanes');search.onclick=()=>searchTab.onclick();content.append(search)})};
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
