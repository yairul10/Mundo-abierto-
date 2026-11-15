import {pvpRank} from './pvp-ranks.js?v=479';
const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const ERRORS={party_busy:'Tu grupo está buscando partida o ya tiene una asignada.',party_full:'El grupo ya tiene cinco miembros.',party_not_found:'No se encontró ese código de grupo.',party_too_large:'El grupo tiene más miembros que el equipo de este modo.',leader_only:'Solo el líder puede iniciar o cancelar la búsqueda.',party_offline:'Todos los miembros deben estar conectados y jugando para buscar.',match_assigned:'La partida ya está asignada. Espera el traslado.',google_required:'Inicia sesión con Google Play para usar PvP.',match_not_assigned:'Esta partida ya no está disponible.'};
export function mountRankedMatchmaking({getToken,realm='normal',transfer,notice,onRank=()=>{},onQueued=()=>{},storage=sessionStorage}){
 const key='cosmos.ranked.active.'+realm,current=new URLSearchParams(location.search).get('ranked');let state=null,busy=false,stopped=false,dialog=null,transferring=false,lastNotice='',timer;
 const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const status=make('button');status.id='rankedQueueStatus';status.type='button';status.hidden=true;status.style.cssText='position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:95;max-width:65vw;padding:8px 12px;border:1px solid #e8bf7080;border-radius:9px;background:#101823ed;color:#fff0c8;font:12px system-ui';status.onclick=()=>open();document.body.append(status);
 async function request(raw){const token=await getToken(),response=await fetch(API+'/ranked/action',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...raw,realm}),signal:AbortSignal.timeout(12000),cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(ERRORS[data.error]||'No se pudo conectar a la búsqueda PvP. Vuelve a intentarlo.');return data}
 function update(data){state=data;onRank(data.rank);if(data.party||data.assignment)storage.setItem(key,'1');else storage.removeItem(key);status.hidden=!data.queue&&!data.assignment;
  if(data.queue)status.textContent='Buscando '+data.queue.mode+' · '+data.queue.players+'/'+data.queue.capacity+' jugadores · '+Math.max(0,Math.ceil((data.queue.deadline-data.serverTime)/1000))+' s · Ver grupo';
  if(data.assignment){const a=data.assignment,seconds=Math.max(0,Math.ceil((a.startsAt-data.serverTime)/1000));status.hidden=!!current;status.textContent='PvP '+a.mode+' · Traslado en '+seconds+' s';
   if(!current){if(lastNotice!==a.id){lastNotice=a.id;notice('Partida encontrada. Entrarás a PvP en 10 segundos. Guarda tus cambios.');}if(seconds<=0&&!document.hidden&&!transferring){transferring=true;Promise.resolve(transfer(a)).catch(e=>{transferring=false;notice(e.message)})}}
  }
  if(dialog)render();
 }
 async function act(raw){const data=await request(raw);update(data);return data}
 async function tick(){if(stopped||busy||storage.getItem(key)!=='1')return;busy=true;try{await act({action:'status',active:!document.hidden})}catch(error){status.hidden=false;status.textContent=error.message}finally{busy=false}}
 async function poll(){await tick();if(!stopped)timer=setTimeout(poll,3000)}void poll();
 function button(label,fn){const b=make('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}catch(error){notice(error.message);const message=make('p',error.message);dialog?.append(message)}finally{b.disabled=false}};return b}
 function render(){if(!dialog)return;dialog.replaceChildren(make('h2','Grupo y rango PvP'));
  const rank=state?.rank||{};dialog.append(make('p',pvpRank(rank).name+' · '+(rank.points||0)+' puntos · '+(rank.wins||0)+' victorias'));
  const p=state?.party;if(p){dialog.append(make('h3','Código de grupo: '+p.id),make('p','Comparte este código con tus amigos. Permanecerán en tu mismo equipo.'));
   for(const member of p.members)dialog.append(make('p',member.name+(member.id===p.leader?' · Líder':'')));
   if(state.queue)dialog.append(make('p',status.textContent));else if(state.assignment)dialog.append(make('p','Partida asignada. Espera el traslado.'));
   else if(p.leader===state.pilotId){for(const mode of ['1v1','2v2','5v5','arena20'])if(p.members.length<=(mode==='5v5'?5:mode==='2v2'?2:1))dialog.append(button('Buscar '+(mode==='arena20'?'Arena 20':mode),()=>queue(mode)))}
   if(state.queue&&p.leader===state.pilotId)dialog.append(button('Cancelar búsqueda',()=>act({action:'cancel'})));
   if(!state.assignment)dialog.append(button('Salir del grupo',()=>act({action:'leaveParty'})));
  }else{dialog.append(button('Crear grupo',()=>act({action:'create'})));const form=make('form'),input=make('input'),submit=make('button','Unirme al grupo');input.placeholder='Código de 6 caracteres';input.maxLength=6;input.required=true;input.setAttribute('aria-label','Código del grupo');submit.type='submit';form.append(input,submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await act({action:'joinParty',code:input.value})}catch(error){dialog.append(make('p',error.message))}finally{submit.disabled=false}};dialog.append(form)}
  dialog.append(make('p','Búsqueda: hasta 2 minutos. Puedes cerrar esta ventana y seguir jugando. Los cupos vacíos se completan con pilotos automáticos. Partidas públicas: victoria +50 puntos; Arena 20: 1.º +50, 2.º +18 y un punto menos por puesto hasta 19.º +1. Práctica y privadas: sin puntos.'));
  if(state?.latest)dialog.append(make('p','Última partida: +'+state.latest.points+' puntos'+(state.latest.place?' · Puesto '+state.latest.place:'')));
  const top=make('details'),summary=make('summary','Top de puntos PvP');top.append(summary);for(const [i,row]of(state?.top||[]).entries())top.append(make('p',(i+1)+'. '+row.name+' · '+row.points));dialog.append(top,button('Cerrar y seguir jugando',()=>{dialog.close();dialog.remove();dialog=null}));
 }
 async function open(){if(dialog)return;dialog=make('dialog');dialog.className='account-dialog ranked-dialog';for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());dialog.addEventListener('cancel',()=>{dialog.remove();dialog=null});document.body.append(dialog);dialog.showModal();dialog.append(make('p','Cargando grupo…'));try{await act({action:'status',active:!document.hidden})}catch(error){dialog.append(make('p',error.message),button('Cerrar',()=>{dialog.close();dialog.remove();dialog=null}))}}
 async function queue(mode){await act({action:'queue',mode,active:!document.hidden});onQueued();notice('Búsqueda '+mode+' iniciada. Puedes seguir jugando mientras esperas.');if(dialog){dialog.close();dialog.remove();dialog=null}}
 window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer)},{once:true});
 return {queue,open,get reserved(){return !!state?.assignment||!!state?.queue}};
}
