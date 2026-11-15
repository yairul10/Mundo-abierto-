const FLAGS={invalid_level:'Nivel no válido',level_decreased:'Bajada de nivel',large_jump:'Salto amplio de nivel',rapid_gain:'Subida rápida'};
const interval=ms=>ms===null?'Sin dato anterior':ms<0?'Fecha anterior inconsistente':ms<60000?Math.floor(ms/1000)+' s':ms<3600000?Math.floor(ms/60000)+' min':ms<86400000?(ms/3600000).toFixed(1)+' h':(ms/86400000).toFixed(1)+' días';
export function renderLevelAudit({content,data,make,options,load}){
 content.append(make('h3',options.pilotName?'Historial de '+options.pilotName:'Historial de niveles · Administración'));
 content.append(make('p','Se registra cada cambio de nivel sincronizado, con fecha del servidor. Los avisos sirven para revisar; no prueban trampas ni aplican sanciones.'));
 const form=make('form'),search=make('input'),submit=make('button','Buscar jugador'),label=make('label'),check=make('input');form.className='audit-filters';search.value=options.query;search.placeholder='Nombre del jugador';search.maxLength=80;search.setAttribute('aria-label','Buscar historial por nombre');submit.type='submit';check.type='checkbox';check.checked=options.flagged;label.append(check,' Solo avisos');form.append(search,submit,label);
 form.onsubmit=event=>{event.preventDefault();options.query=search.value.trim();options.pilot='';options.pilotName='';options.before=null;load('audit')};check.onchange=()=>{options.flagged=check.checked;options.before=null;load('audit')};content.append(form);
 const overview=make('button','Ver avisos recientes');overview.type='button';overview.onclick=()=>{Object.assign(options,{query:'',pilot:'',pilotName:'',before:null,flagged:true});load('audit')};content.append(overview);
 const rows=data.rows||[];if(!rows.length)content.append(make('p',options.flagged?'No hay avisos con estos filtros.':'No hay registros con estos filtros.'));
 else{
  const wrap=make('div'),table=make('table'),head=make('thead'),headers=make('tr'),body=make('tbody');wrap.className='hall-table-wrap audit-table';
  for(const text of ['Fecha del servidor','Jugador','Antes → Después','Cambio','Desde guardado anterior','Motivo','Detalle']){const th=make('th',text);th.setAttribute('scope','col');headers.append(th)}head.append(headers);
  for(const row of rows){const tr=make('tr');if(row.flags.length)tr.className='audit-flag';
   const old=row.oldLevel===null?(row.source==='change'?'Inválido':'—'):row.oldLevel,next=row.newLevel===null?'Inválido':row.newLevel;
   tr.append(make('td',new Date(row.time).toLocaleString('es-CL')),make('td',row.name),make('td',old+' → '+next),make('td',row.delta===null?'—':(row.delta>0?'+':'')+row.delta),make('td',interval(row.elapsedMs)),make('td',row.flags.length?row.flags.map(key=>FLAGS[key]||key).join(' · '):row.source==='baseline'?'Punto de partida':row.source==='created'?'Primer guardado':'Sin aviso'));
   const cell=make('td'),detail=make('button','Ver historial');detail.type='button';detail.onclick=()=>{Object.assign(options,{pilot:row.pilot,pilotName:row.name,query:'',flagged:false,before:null});load('audit')};cell.append(detail);tr.append(cell);body.append(tr);
  }
  table.append(head,body);wrap.append(table);content.append(wrap);
 }
 const pages=make('div');pages.className='audit-pages';if(options.before){const first=make('button','Más recientes');first.type='button';first.onclick=()=>{options.before=null;load('audit')};pages.append(first)}
 if(data.nextCursor){const next=make('button','Más antiguos');next.type='button';next.onclick=()=>{options.before=data.nextCursor;load('audit')};pages.append(next)}content.append(pages,make('small','Avisos: +'+(data.criteria?.largeJump||10)+' niveles en un guardado; +'+(data.criteria?.rapidGain||5)+' en '+((data.criteria?.rapidWindowMs||300000)/60000)+' minutos desde nivel '+(data.criteria?.rapidMinLevel||30)+'; bajadas o niveles no válidos. Jugar sin conexión puede producir saltos legítimos.'));
}
