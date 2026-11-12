export const SYSTEM_SECTORS=Object.freeze([
 {id:'aurora',name:'Aurora',level:1,x:12,y:38,color:'#53ceff',icon:'✦',description:'Estación inicial y zona de entrenamiento.',enemies:'Exploradores y Asaltantes'},
 {id:'belt',name:'Cinturón Perdido',level:10,x:35,y:22,color:'#efb760',icon:'◈',description:'Cinturón de asteroides y estación de servicios.',enemies:'Guardianes y Destructores'},
 {id:'ember',name:'Ascuas',level:30,x:58,y:38,color:'#ff754d',icon:'☄',description:'Sector de combate avanzado y hogar del Coloso.',enemies:'Destructores, Devastadores y Coloso'},
 {id:'graveyard',name:'Cementerio de Naves',level:40,x:80,y:22,color:'#ae9aff',icon:'⌁',description:'Restos de antiguas naves y materiales exclusivos.',enemies:'Catapultas, Arponeros, Acechadores y Gran Titán'},
 {id:'pvp',name:'Cooperativo',level:40,x:80,y:76,color:'#ff5f98',icon:'⚔',description:'Expedición entre aliados desde una base protegida.',enemies:'Colosos Pro, Gran Titán Pro, Inferno Pro, refuerzos y Titán del Nexo',note:'Requiere Internet y una cuenta de Google Play.'}
]);
export const SYSTEM_ROUTES=Object.freeze([
 {from:'aurora',to:'belt',level:10,path:'M12 38 L35 22'},
 {from:'belt',to:'ember',level:30,path:'M35 22 L58 38'},
 {from:'ember',to:'graveyard',level:40,path:'M58 38 L80 22'},
 {from:'graveyard',to:'pvp',level:40,path:'M80 22 L80 76'},
 {from:'aurora',to:'pvp',level:40,path:'M12 38 C10 85 53 94 80 76',shortcut:true}
]);
export function systemMapState(level,current){
 const n=Math.max(1,Math.floor(Number(level)||1));
 return SYSTEM_SECTORS.map(s=>({...s,current:s.id===current,locked:n<s.level&&s.id!==current}));
}
export function mountSystemMap({trigger,getState,onOpen=()=>{}}){
 if(!trigger)return {get open(){return false},refresh(){}};
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('../css/system-map.css?v=365',import.meta.url).href;document.head.append(stylesheet);
 const overlay=document.createElement('div');overlay.id='systemMapOverlay';overlay.hidden=true;
 overlay.innerHTML='<section class="system-map-dialog" role="dialog" aria-modal="true" aria-labelledby="systemMapTitle"><header><div><small>COSMOS LEGACY · CARTA ESTELAR</small><h2 id="systemMapTitle">Mapa del sistema</h2></div><button type="button" class="system-map-close" aria-label="Cerrar mapa del sistema">✕</button></header><div class="system-map-content"><div class="system-map-board" aria-label="Sectores y conexiones"><svg class="system-map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div class="system-map-nodes"></div><p class="system-map-shortcut">Portal directo Aurora ↔ Cooperativo · Nivel 40</p></div><aside class="system-map-detail" aria-live="polite"></aside></div><footer><span>● Tu ubicación</span><span>🔒 Sector bloqueado</span><small>Viaja mediante los portales. Toca un sector para ver sus detalles.</small></footer></section>';
 document.body.append(overlay);
 const closeButton=overlay.querySelector('.system-map-close'),host=overlay.querySelector('.system-map-nodes'),routes=overlay.querySelector('.system-map-routes'),detail=overlay.querySelector('.system-map-detail');
 let selected='',stamp='',returnFocus=null;
 function showDetails(sector){
  selected=sector.id;const connections=SYSTEM_ROUTES.filter(r=>r.from===sector.id||r.to===sector.id).map(r=>SYSTEM_SECTORS.find(s=>s.id===(r.from===sector.id?r.to:r.from)).name);
  detail.replaceChildren();const tag=document.createElement('small'),heading=document.createElement('h3'),status=document.createElement('p'),description=document.createElement('p'),enemyTitle=document.createElement('strong'),enemies=document.createElement('p'),links=document.createElement('p');
  tag.className='system-map-eyebrow';tag.textContent=sector.id==='pvp'?'EXPEDICIÓN COOPERATIVA':'SECTOR PvE';heading.textContent=sector.name;
  status.className='system-map-status'+(sector.locked?' locked':'');status.textContent=sector.current?'● Estás aquí':sector.locked?'🔒 Bloqueado · Nivel '+sector.level:'Desbloqueado · Nivel '+sector.level;
  description.textContent=sector.description;enemyTitle.textContent='Enemigos';enemies.textContent=sector.enemies;links.className='system-map-links';links.textContent='Conexiones: '+connections.join(' · ');detail.append(tag,heading,status,description,enemyTitle,enemies,links);
  if(sector.note){const note=document.createElement('p');note.className='system-map-note';note.textContent=sector.note;detail.append(note)}
  host.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sector===selected)));
 }
 function refresh(force=false){
  if(overlay.hidden)return;const {level,current}=getState(),next=level+':'+current;if(!force&&next===stamp)return;stamp=next;
  const sectors=systemMapState(level,current),previous=selected;host.replaceChildren();routes.replaceChildren();
  for(const route of SYSTEM_ROUTES){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',route.path);path.setAttribute('class',Number(level)<route.level?'locked':'unlocked');if(route.shortcut)path.classList.add('shortcut');routes.append(path)}
  for(const sector of sectors){const button=document.createElement('button');button.type='button';button.dataset.sector=sector.id;button.className='system-map-node'+(sector.locked?' locked':'')+(sector.current?' current':'');button.style.left=sector.x+'%';button.style.top=sector.y+'%';button.style.setProperty('--sector-color',sector.color);
   const orb=document.createElement('span'),name=document.createElement('strong'),requirement=document.createElement('small');orb.className='system-map-orb';orb.textContent=sector.locked?'🔒':sector.icon;name.textContent=sector.name;requirement.textContent=sector.current?'● Estás aquí':sector.locked?'Nivel '+sector.level:'Nivel '+sector.level+' · Abierto';button.append(orb,name,requirement);button.setAttribute('aria-label',sector.name+(sector.locked?', bloqueado hasta nivel '+sector.level:sector.current?', estás aquí':', desbloqueado'));button.onclick=()=>showDetails(sector);host.append(button);
  }
  showDetails(sectors.find(s=>s.id===previous)||sectors.find(s=>s.current)||sectors[0]);
 }
 function close(){if(overlay.hidden)return;overlay.hidden=true;document.body.classList.remove('system-map-open');trigger.setAttribute('aria-expanded','false');returnFocus?.focus?.();}
 function open(){if(!overlay.hidden)return;returnFocus=trigger;selected=getState().current;overlay.hidden=false;document.body.classList.add('system-map-open');trigger.setAttribute('aria-expanded','true');onOpen();refresh(true);closeButton.focus();}
 trigger.style.pointerEvents='auto';trigger.style.cursor='pointer';trigger.style.touchAction='manipulation';trigger.setAttribute('role','button');trigger.tabIndex=0;trigger.setAttribute('aria-label','Abrir mapa completo del sistema');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.title='Toca para ver el sistema completo';
 trigger.addEventListener('click',open);trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
 closeButton.onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 document.addEventListener('keydown',event=>{if(overlay.hidden)return;if(event.key==='Escape'){event.preventDefault();close()}else if(event.key==='Tab'){event.preventDefault();const focusable=[closeButton,...host.querySelectorAll('button')],index=focusable.indexOf(document.activeElement);focusable[(index+(event.shiftKey?-1:1)+focusable.length)%focusable.length].focus()}event.stopPropagation();},true);
 return {get open(){return !overlay.hidden},refresh,close};
}

