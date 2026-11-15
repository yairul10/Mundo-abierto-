const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const ERRORS={war_admin_only:'Solo el administrador puede iniciar el evento.',war_need_teams:'Se necesitan al menos dos clanes inscritos.',war_event_busy:'Ya hay una guerra abierta.',war_registration_closed:'Las inscripciones están cerradas.',war_invalid_roster:'Selecciona exactamente el número de pilotos de la categoría.',war_members_only:'Todos los inscritos deben pertenecer a tu clan.',war_officer_only:'Solo líderes u oficiales pueden inscribir al equipo.',war_event_full:'El evento ya tiene 32 clanes.',war_cannot_cancel:'Solo se pueden cancelar inscripciones o cuentas atrás.',war_pending:'Tienes una guerra a punto de comenzar.',war_unavailable:'No se pudo conectar con las guerras. Inténtalo de nuevo.'};
export async function clanWarRequest(getToken,realm,path='status',body=null){const token=await getToken(),r=await fetch(API+'/wars/'+path+'?realm='+encodeURIComponent(realm),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000),cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(ERRORS[data.error]||'No se pudo completar la acción de guerra.');return data}
export function warEventText(event){return !event?'No hay una guerra abierta.':event.phase==='registration'?'Inscripciones abiertas · '+event.mode:event.phase==='countdown'?'Guerra '+event.mode+' · comienza en '+Math.max(0,Math.ceil((event.beginsAt-Date.now())/1000))+' s':event.phase==='active'?'Guerra '+event.mode+' en curso':event.phase==='cancelled'?'Evento cancelado':'Guerra terminada';}
export function mountClanWarWatch({getToken,realm='normal',hasAccount,transfer,notice,now=()=>Date.now()}){
 let lastInput=now(),state=null,busy=false,stopped=false,timer=null,transferring=false;const announced=new Set();
 const activity=()=>{lastInput=now()};for(const type of ['pointerdown','keydown','touchstart'])addEventListener(type,activity,{passive:true});
 const warOnPage=new URLSearchParams(location.search).get('clanWar');
 async function tick(){
  if(busy||stopped||!hasAccount())return;busy=true;
  try{state=await clanWarRequest(getToken,realm,'status',{active:!document.hidden&&now()-lastInput<90000});
   const e=state.event;if(!e||!state.enrolled)return;
   if(e.phase==='countdown'){const remaining=e.beginsAt-(state.serverTime||now()),seconds=remaining<=10000?10:remaining<=60000?60:300,key=e.id+':'+seconds;if(!announced.has(key)){announced.add(key);notice('Guerra de clanes: faltan '+(seconds===300?'5 minutos':seconds===60?'1 minuto':'10 segundos')+'. Al comenzar entrarás automáticamente si sigues activo.')}}
   const assignment=state.assignment;if(assignment&&!warOnPage&&sessionStorage.getItem('cosmos.clanWar.done.'+e.id)!=='1'&&!transferring&&!document.hidden&&now()-lastInput<90000){transferring=true;notice('Comienza la guerra de clanes. Trasladando a la arena…');try{await transfer(assignment)}catch(error){transferring=false;notice(error.message)}}
   if(['active','finished'].includes(e.phase)&&!assignment&&!warOnPage){const match=e.matches.find(m=>m.a===state.clanId||m.b===state.clanId),key=e.id+':'+(match?.status==='finished'?'result':'not-selected');if(!announced.has(key)){announced.add(key);if(match?.status==='finished'){const winner=match.winnerTeam==='a'?match.a:match.winnerTeam==='b'?match.b:null;notice(!winner?'Guerra de clanes: encuentro terminado sin ganador.':winner===state.clanId?'Guerra de clanes: victoria de tu clan'+(match.reason==='absence'?' por ausencia del rival.':'.'):'Guerra de clanes: tu clan perdió'+(match.reason==='absence'?' por ausencia.':'.'));}else notice(e.bye===state.clanId?'Tu clan quedó sin rival. No se asigna victoria.':'La guerra comenzó; no fuiste seleccionado como activo para este encuentro.')}}

  }catch{}finally{busy=false}
 }
 async function poll(){await tick();if(!stopped)timer=setTimeout(poll,5000)}void poll();
 return {get reserved(){return !!state?.enrolled&&state.event?.phase==='countdown'},stop(){stopped=true;clearTimeout(timer);for(const type of ['pointerdown','keydown','touchstart'])removeEventListener(type,activity)}};
}
export function renderClanWars({container,data,account,element,request,refresh}){
 const e=data.event;container.append(element('h3',warEventText(e)),element('p','Inicio manual por el administrador · 5 minutos de aviso · Mejor de tres · Sin bots ni premios monetarios · Victoria disputada: +100 puntos al top semanal. Ausencia o empate: 0. Solo entran los inscritos activos; un equipo incompleto participa con quienes estén presentes.'));
 const action=(label,body)=>{const b=element('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await request(body);await refresh()}catch(error){container.append(element('p',error.message))}finally{b.disabled=false}};return b};
 if(data.admin){if(!e||['finished','cancelled'].includes(e.phase))container.append(action('Abrir inscripciones 2v2',{action:'open',mode:'2v2'}),action('Abrir inscripciones 5v5',{action:'open',mode:'5v5'}));if(e?.phase==='registration')container.append(action('Sortear e iniciar · 5 minutos',{action:'start'}));if(e&&['registration','countdown'].includes(e.phase))container.append(action('Cancelar evento',{action:'cancel'}));}
 const clan=account?.clan;if(e?.phase==='registration'&&clan&&['leader','officer'].includes(clan.role)){
  const form=element('form'),inputs=[],size=e.mode==='2v2'?2:5;form.append(element('h3','Inscribir a ['+clan.tag+'] '+clan.name),element('p','Selecciona '+size+' miembros. Puedes actualizar la inscripción mientras esté abierta.'));
  for(const member of clan.members||[]){const label=element('label'),input=element('input');input.type='checkbox';input.value=member.account_id;label.append(input,' '+(member.pilot||'Nombre no disponible'));inputs.push(input);form.append(label)}
  const submit=element('button','Inscribir equipo');submit.type='submit';form.append(submit);form.onsubmit=async event=>{event.preventDefault();const roster=inputs.filter(n=>n.checked).map(n=>n.value);if(roster.length!==size){container.append(element('p','Selecciona exactamente '+size+' pilotos.'));return}submit.disabled=true;try{await request({action:'register',roster});await refresh()}catch(error){container.append(element('p',error.message))}finally{submit.disabled=false}};container.append(form,action('Retirar inscripción de mi clan',{action:'withdraw'}));
 }
 if(e){container.append(element('h3','Clanes inscritos'));for(const team of e.teams)container.append(element('p','['+team.tag+'] '+team.name+' · '+team.count+' pilotos'));
  container.append(element('h3','Enfrentamientos'));for(const m of e.matches){const name=id=>{const c=e.teams.find(t=>t.clanId===id);return c?'['+c.tag+'] '+c.name:'Clan'};container.append(element('p',name(m.a)+' vs '+name(m.b)+' · '+(m.status==='finished'?(m.winnerTeam?'Ganador: '+name(m.winnerTeam==='a'?m.a:m.b)+(m.reason==='absence'?' por ausencia':''):'Sin ganador · ambos ausentes o empate'):'Programado / en curso')+(m.score?' · '+m.score.a+'–'+m.score.b:'')))}if(e.bye){const c=e.teams.find(t=>t.clanId===e.bye);container.append(element('p','['+c.tag+'] '+c.name+' quedó sin rival. No se asigna victoria.'));}}
 for(const previous of data.history||[])if(previous.id!==e?.id)container.append(element('p','Evento anterior · '+previous.mode+' · '+previous.matches.filter(m=>m.winnerTeam).length+' encuentros con ganador'));
}

export function clanWarReturnURL(saved,current){
 const base=new URL('./index.html',current);let target;try{target=new URL(saved||base.href,current)}catch{return base.href}
 if(target.origin!==base.origin||target.searchParams.has('clanWar'))return base.href;
 // An ordinary PvP battle may have finished during the war; return to the saved PvE map.
 if(target.searchParams.get('arena')==='1'){target.searchParams.delete('arena');target.searchParams.delete('pvp')}
 return target.href;
}
