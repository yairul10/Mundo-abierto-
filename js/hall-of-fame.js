import {pvpRank,rankBadge} from './pvp-ranks.js?v=479';
const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const TABS={clans:'Clanes',ranks:'Rangos PvP',levels:'Niveles'};
export function mountHallOfFame({button,getToken,realm='normal',fetcher=fetch}){
 let dialog=null,controller=null,ticket=0,selected='clans';
 const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const style=make('link');style.rel='stylesheet';style.href='./css/hall-of-fame.css?v=480';document.head.append(style);
 button.onclick=()=>{
  if(dialog)return;dialog=make('dialog');dialog.className='account-dialog hall-dialog';dialog.setAttribute('aria-label','Sala de la fama');
  const header=make('header'),title=make('h2','Sala de la fama'),close=make('button','Cerrar'),tabs=make('nav'),status=make('p'),content=make('section'),refresh=make('button','Actualizar');close.type=refresh.type='button';status.setAttribute('role','status');content.setAttribute('role','tabpanel');content.id='hallContent';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Clasificaciones');header.append(title,close);const buttons={};
  for(const [key,label]of Object.entries(TABS)){const b=make('button',label);b.type='button';b.id='hallTab-'+key;b.setAttribute('role','tab');b.setAttribute('aria-controls','hallContent');b.onclick=()=>load(key);tabs.append(b);buttons[key]=b;}
  function finish(){ticket++;controller?.abort();dialog?.close();dialog?.remove();dialog=null;button.focus?.()}
  close.onclick=finish;refresh.onclick=()=>load(selected);dialog.addEventListener('cancel',event=>{event.preventDefault();finish()});dialog.addEventListener('click',event=>{if(event.target===dialog)finish()});for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());
  const number=value=>Math.max(0,Number(value)||0).toLocaleString('es-CL');
  function table(data){
   const key=selected,rows=data.ranking||[],mine=data.mine;
   const intro=key==='clans'?'Top '+data.limit+' de clanes · Puntos de misiones y guerras de esta semana.':key==='ranks'?'Top '+data.limit+' por puntos de partidas públicas. Práctica y privadas no puntúan.':'Top '+data.limit+' por nivel y luego XP · Partidas normales sincronizadas en la nube.';
   content.append(make('p',intro));
   if(key==='clans'&&data.endsAt)content.append(make('p','La semana termina: '+new Date(data.endsAt).toLocaleString('es-CL')));
   if(key==='levels'&&data.available===false){content.append(make('p','El top de niveles está disponible en el servidor normal. El progreso de prueba no participa.'));return;}
   const own=make('p');own.className='hall-own';
   own.textContent=mine?(key==='clans'?'Tu clan: ':'Tu posición: ')+(mine.position?'#'+mine.position:'Sin clasificar')+' · '+(key==='levels'?'Nivel '+number(mine.level):number(mine.points)+' puntos')+(key==='ranks'?' · '+pvpRank(mine).name:''):key==='clans'?(data.inClan?'Tu clan todavía no aparece entre los '+data.limit+' primeros.':'Todavía no perteneces a un clan.'):key==='levels'?'Aparecerás cuando tu partida con Google Play esté sincronizada en la nube.':'Todavía no tienes puntos de rango.';content.append(own);
   if(!rows.length){content.append(make('p','Todavía no hay participantes en esta clasificación.'));return;}
   const wrap=make('div'),table=make('table'),caption=make('caption',TABS[key]+' · '+(realm==='test'?'Pruebas':'Normal')),head=make('thead'),heading=make('tr'),body=make('tbody');wrap.className='hall-table-wrap';
   const columns=key==='clans'?['Puesto','Clan','Puntos','Guerras ganadas']:key==='levels'?['Puesto','Jugador','Nivel','XP']:['Puesto','Jugador','Rango','Puntos','Victorias'];
   for(const label of columns){const cell=make('th',label);cell.setAttribute('scope','col');heading.append(cell)}head.append(heading);
   for(const row of rows){const line=make('tr');if(row.own){line.className='hall-highlight';line.setAttribute('aria-label',key==='clans'?'Tu clan':'Tu posición')}
    line.append(make('td',(row.position<=3?['🥇','🥈','🥉'][row.position-1]+' ':'')+'#'+row.position));
    const name=make('td',key==='clans'?'['+row.tag+'] '+row.name:row.name);name.className='hall-name';line.append(name);
    if(key==='ranks'){const badge=make('td');badge.append(rankBadge(row),make('span',pvpRank(row).name));line.append(badge)}
    line.append(make('td',number(key==='levels'?row.level:row.points)),make('td',number(key==='clans'?row.warWins:key==='levels'?row.xp:row.wins)));body.append(line);
   }
   table.append(caption,head,body);wrap.append(table);content.append(wrap,make('small','Actualizado: '+new Date(data.updatedAt).toLocaleTimeString('es-CL')));
  }
  async function load(tab){
   selected=tab;const current=++ticket;controller?.abort();controller=new AbortController();const activeController=controller,signal=controller.signal;
   for(const [key,b]of Object.entries(buttons))b.setAttribute('aria-selected',String(key===tab));content.setAttribute('aria-labelledby',buttons[tab].id);content.replaceChildren();status.textContent='Cargando '+TABS[tab]+'…';let timer;
   try{let token;try{token=await getToken()}catch(error){if(/cooperativo|Play Games en la aplicación/.test(error.message))throw Error('Inicia sesión con Google Play desde la app Android para ver la Sala de la fama.');throw error}if(current!==ticket||!dialog)return;timer=setTimeout(()=>activeController.abort(),12000);
    const response=await fetcher(API+'/hall-of-fame?realm='+encodeURIComponent(realm)+'&tab='+encodeURIComponent(tab),{headers:{Authorization:'Bearer '+token},signal,cache:'no-store'}),data=await response.json();if(current!==ticket||!dialog)return;
    if(!response.ok)throw Error(data.error==='google_required'?'Inicia sesión con Google Play para ver la Sala de la fama.':data.error==='test_closed'?'El servidor de prueba está cerrado.':'No se pudo cargar la clasificación. Revisa tu conexión y pulsa Actualizar.');status.textContent='';table(data);
   }catch(error){if(current!==ticket||!dialog)return;status.textContent=signal.aborted?'La conexión tardó demasiado. Pulsa Actualizar para reintentar.':error.message;}finally{clearTimeout(timer)}
  }
  dialog.append(header,tabs,status,content,refresh);document.body.append(dialog);dialog.showModal();void load(selected);
 };
}
