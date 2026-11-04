import {rankedName,rankBadge,pvpRank} from './pvp-ranks.js?v=347';
export function mountPvpSocialUI({send,getState,onTarget,storage=localStorage}){
 const root=document.createElement('section');root.id='pvpSocial';
 root.innerHTML='<button type="button" data-social-toggle aria-expanded="false" aria-controls="pvpSocialMenu" aria-label="Abrir clasificaciones, grupos y duelos" title="Clasificaciones, grupos y duelos">🏆</button><div id="pvpSocialMenu" hidden><button data-top>🏆 Clasificaciones</button><button data-group-open hidden>Grupo PvP</button><button data-requests>Solicitudes de duelo</button></div><div class="pvp-social-card" data-group hidden></div><div class="pvp-social-card" data-duel hidden></div><div class="pvp-social-card" data-ranks hidden><button data-close>Cerrar</button><h3>Clasificaciones PvP</h3><p>Solo bajas válidas de la zona hostil. Sin límite diario. Hasta 3 por rival cada 5 horas.</p><div data-table></div><p data-mine></p></div>';document.body.append(root);
 const toggle=root.querySelector('[data-social-toggle]'),menu=root.querySelector('#pvpSocialMenu');
 const closeMenu=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false')};
 toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))};
 const actions=document.getElementById('pvpMapActions');if(actions)actions.prepend(toggle);
 for(const event of ['pointerdown','touchstart','keydown','keyup'])toggle.addEventListener(event,e=>e.stopPropagation());
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target)&&!toggle.contains(e.target))closeMenu()},true);
 const groupPanel=root.querySelector('[data-group]'),groupOpen=root.querySelector('[data-group-open]');
 let groupShown=false,groupStamp='',dismissedInvite='';
 const closeGroup=()=>{groupShown=false;groupPanel.hidden=true;const {state,me}=getState();dismissedInvite=state?.groupInvites?.find(i=>i.to===me?.id)?.id||''};
 const escape=e=>{if(e.key==='Escape'&&(!menu.hidden||!ranks.hidden||!groupPanel.hidden)){closeMenu();closeGroup();ranks.hidden=true;toggle.focus()}};
 document.addEventListener('keydown',escape);root.addEventListener('keydown',escape);toggle.addEventListener('keydown',escape);
 const requests=root.querySelector('[data-requests]');const syncRequests=()=>requests.textContent=storage.getItem('cosmos.duelRequestsOff')==='1'?'Duelos: bloqueados':'Duelos: disponibles';syncRequests();requests.onclick=()=>{const block=storage.getItem('cosmos.duelRequestsOff')!=='1';storage.setItem('cosmos.duelRequestsOff',block?'1':'0');send({type:'duelBlock',block});syncRequests();closeMenu()};
 const duel=root.querySelector('[data-duel]'),ranks=root.querySelector('[data-ranks]'),table=root.querySelector('[data-table]'),mine=root.querySelector('[data-mine]');let stamp='',result=null;
 function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b}
 function updateGroup(state,me){
  groupOpen.hidden=!Array.isArray(state.groups);
  if(groupOpen.hidden){closeGroup();return}
  const own=state.groups.find(g=>g.members.includes(me.id));
  const request=state.groupInvites.find(i=>i.to===me.id&&i.expiresAt>state.serverTime);
  groupPanel.hidden=!groupShown&&(!request||request.id===dismissedInvite);
  if(groupPanel.hidden){groupStamp='';return}
  const grouped=new Set(state.groups.flatMap(g=>g.members));
  const available=state.players.filter(p=>p.id!==me.id&&!grouped.has(p.id));
  const waiting=state.groupInvites.find(i=>i.from===me.id&&i.expiresAt>state.serverTime);
  const next=JSON.stringify([own,request,waiting,state.players.map(p=>[p.id,p.name])]);
  if(next===groupStamp)return;
  groupStamp=next;
  const heading=document.createElement('h3');heading.textContent='Grupo PvP';
  const pilotName=id=>state.players.find(p=>p.id===id)?.name||'Piloto';
  groupPanel.replaceChildren(button('Cerrar',closeGroup),heading);
  if(own){
   const members=document.createElement('p');members.textContent='Pilotos ('+own.members.length+'/4) · '+own.members.map(pilotName).join(', ');
   groupPanel.append(members,button('Salir del grupo',()=>send({type:'groupLeave'})));
  }
  if(request){
   const invitation=document.createElement('p');invitation.textContent=pilotName(request.from)+' te invita a su grupo.';
   groupPanel.append(invitation,button('Aceptar',()=>send({type:'groupReply',id:request.id,accept:true})),button('Rechazar',()=>send({type:'groupReply',id:request.id,accept:false})));
  }
  if(waiting)groupPanel.append('Invitación enviada a '+pilotName(waiting.to)+'.');
  else if(!own||own.members.length<4){
   if(!available.length)groupPanel.append('No hay pilotos disponibles para invitar.');
   for(const pilot of available)groupPanel.append(button('Invitar a '+pilot.name,()=>send({type:'groupInvite',target:pilot.id})));
  }
 }
 groupOpen.onclick=()=>{closeMenu();groupShown=true;const {state,me}=getState();if(state&&me)updateGroup(state,me)};
 root.querySelector('[data-top]').onclick=()=>{closeMenu();ranks.hidden=false;send({type:'rankings'});table.textContent='Consultando servidor…'};root.querySelector('[data-close]').onclick=()=>ranks.hidden=true;
 document.addEventListener('pointerdown',e=>{if(!ranks.hidden&&!root.contains(e.target))ranks.hidden=true});
 for(const event of ['pointerdown','touchstart','keydown','keyup'])root.addEventListener(event,e=>e.stopPropagation());
 function showRanks(){table.replaceChildren();for(const [key,title]of [['kills','Bajas válidas'],['xp','XP obtenida en PvP']]){const section=document.createElement('section'),h=document.createElement('h4');h.textContent=title;section.append(h);const data=result[key];if(!data.top.length)section.append('Aún no hay resultados.');for(const row of data.top){const p=document.createElement('p');if(key==='kills')rankedName(p,row.position+'. '+row.name+' · '+Number(row[key]).toLocaleString('es-CL'),row,{title:true});else p.textContent=row.position+'. '+row.name+' · '+Number(row[key]).toLocaleString('es-CL');section.append(p)}const own=document.createElement('strong');own.textContent=data.mine?'Tu posición: '+data.mine.position+' · '+data.mine[key]:'Todavía no tienes bajas válidas.';if(key==='kills'){const stats=data.mine||{};own.prepend(rankBadge(stats));own.append(' · '+pvpRank(stats).name)}section.append(own);table.append(section)}mine.textContent='La XP de misiones y enemigos no cuenta en esta clasificación.'}
 return {receive(m){if(m.type!=='rankings')return false;result=m;showRanks();return true},update(){const {state,me,selected}=getState();if(!state||!me)return;updateGroup(state,me);const now=state.serverTime,request=state.invites?.find(i=>i.to===me.id&&i.expiresAt>now),own=state.duels?.find(d=>d.id===me.duelId),other=state.players.find(p=>p.id===selected&&p.id!==me.id);const next=JSON.stringify([request,own,other?.id,other?.zone,other?.death,other?.duelId,me.zone,me.death,me.hangar,Math.ceil(((own?.startsAt||0)-now)/1000)]);if(next===stamp)return;stamp=next;duel.replaceChildren();duel.hidden=!request&&!own&&!(other&&me.zone==='pve'&&other.zone==='pve');if(duel.hidden)return;
 if(request){const from=state.players.find(p=>p.id===request.from),p=document.createElement('p');p.textContent=(from?.name||'Piloto')+' te invita a un duelo sin pérdidas.';duel.append(p,button('Aceptar',()=>send({type:'reply',id:request.id,accept:true})),button('Rechazar',()=>send({type:'reply',id:request.id,accept:false})),button('Bloquear solicitudes',()=>{storage.setItem('cosmos.duelRequestsOff','1');send({type:'duelBlock',block:true});syncRequests()}))}
 else if(own){const remaining=Math.ceil((own.startsAt-now)/1000),p=document.createElement('p');p.textContent=remaining>0?'El duelo comienza en '+remaining+'…':'Duelo activo · La base no te protege del rival';duel.append(p,button('Rendirse',()=>{if(confirm('¿Terminar el duelo y volver a la base sin coste?'))send({type:'surrender'})}))}
 else {const p=document.createElement('p');p.textContent=other.name+' · Duelo voluntario, sin premios ni pérdidas.';duel.append(p,button('Solicitar duelo',()=>send({type:'invite',target:other.id})))}
 },enableRequests(){storage.removeItem('cosmos.duelRequestsOff');send({type:'duelBlock',block:false})}};
}
