export const JOURNAL_LIMIT=200;
export function journalEntries(player){return Array.isArray(player?.activityJournal)?player.activityJournal.filter(e=>e&&typeof e.text==='string'&&Number.isFinite(e.at)&&Math.abs(e.at)<=8640000000000000).slice(-JOURNAL_LIMIT):[]}
export function recordAction(player,type,text,details={},now=Date.now()){
 const entry={type,text:String(text).slice(0,240),at:now,details:JSON.parse(JSON.stringify(details))};
 player.activityJournal=[...journalEntries(player),entry].slice(-JOURNAL_LIMIT);return entry;
}
export function mountJournal({getPlayer,onOpen=()=>{}}){
 const panel=document.createElement('section');panel.id='activityPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','journalTitle');
 panel.innerHTML='<div class="journal-card"><header><div><h2 id="journalTitle">📖 Diario de actividad</h2><small id="journalCount"></small></div><button id="closeJournal" type="button">Cerrar</button></header><label>Mostrar <select id="journalFilter"><option value="all">Todas las acciones</option><option value="combat">Combate</option><option value="mission">Misiones</option><option value="commerce">Compras y ensamblaje</option><option value="qa">Ayudas de prueba</option></select></label><ol id="journalEntries"></ol><p>Se conservan las últimas 200 acciones de esta partida. El registro comienza con esta actualización.</p></div>';
 document.body.appendChild(panel);const list=panel.querySelector('ol'),filter=panel.querySelector('select');
 function render(){const entries=journalEntries(getPlayer());panel.querySelector('#journalCount').textContent=entries.length+' / 200 acciones · '+(window.MUNDO_PLAY_MODE?.mode==='test'?'Servidor de prueba':'Partida normal');list.replaceChildren();for(const entry of entries.slice().reverse().filter(e=>filter.value==='all'||e.type===filter.value)){const row=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.dateTime=new Date(entry.at).toISOString();time.textContent=new Date(entry.at).toLocaleString('es-CL');text.textContent=entry.text;row.append(time,text);list.appendChild(row)}if(!list.children.length){const row=document.createElement('li');row.textContent='Todavía no hay acciones en esta categoría.';list.appendChild(row)}}
 const close=()=>{panel.hidden=true;document.body.classList.remove('journal-open')};panel.querySelector('#closeJournal').onclick=close;filter.onchange=render;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
 return {open(){onOpen();render();panel.hidden=false;document.body.classList.add('journal-open');panel.querySelector('#closeJournal').focus()},close};
}
