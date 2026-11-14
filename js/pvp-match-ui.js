const KEY='cosmosLegacy.pvp1v1.v1';
export const arenaRequested=()=>new URLSearchParams(location.search).get('arena')==='1';
export function readArenaChoice(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
export function saveArenaChoice(choice){if(choice)sessionStorage.setItem(KEY,JSON.stringify(choice));else sessionStorage.removeItem(KEY)}
export function choosePvpMatch(){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog pvp-match-dialog';dialog.setAttribute('aria-label','Sala PvP 1v1');
 for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());
 const title=document.createElement('h2'),text=document.createElement('p'),actions=document.createElement('div'),cancel=document.createElement('button');title.textContent='PvP · 1v1';text.textContent='Elige dos habilidades y marca Listo. Gana quien destruya la nave rival.\nPartida de prueba: sin premios ni pérdida de créditos. El equipamiento se fija al entrar.';dialog.append(title,text,actions,cancel);
 const done=value=>{dialog.close();dialog.remove();resolve(value)};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)};
 button('Buscar rival',()=>done({action:'find'}));button('Crear sala privada',()=>done({action:'create'}));button('Unirme con código',()=>{
  actions.replaceChildren();const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.placeholder='Código de 6 caracteres';input.setAttribute('aria-label','Código de sala PvP');input.maxLength=6;input.required=true;input.autocomplete='off';input.autocapitalize='characters';input.pattern='[A-HJ-NP-Za-hj-np-z2-9]{6}';input.style.cssText='box-sizing:border-box;width:100%;padding:12px;font:18px system-ui;text-align:center;letter-spacing:3px';submit.textContent='Unirme';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())done({action:'join',code:input.value.trim().toUpperCase()})};actions.append(form);input.focus();
 });cancel.textContent='Volver';cancel.onclick=()=>done(null);dialog.addEventListener('cancel',e=>{e.preventDefault();done(null)});document.body.append(dialog);dialog.showModal();
})}
export function showPvpResult(match,myId,onLeave){
 const dialog=document.createElement('dialog');dialog.className='account-dialog';const title=document.createElement('h2'),text=document.createElement('p'),button=document.createElement('button');
 title.textContent=match.winner===myId?'¡Victoria!':match.winner?'Derrota':'Empate';text.textContent=(match.reason==='disconnect'?'La partida terminó por desconexión. ':match.reason==='time'?'Se agotaron los 5 minutos. ':match.reason==='surrender'?'La partida terminó por abandono. ':'')+'No pierdes créditos ni equipo. Puedes volver a buscar rival.';button.textContent='Volver a mi mapa';button.onclick=()=>{dialog.close();dialog.remove();onLeave()};dialog.addEventListener('cancel',e=>e.preventDefault());dialog.append(title,text,button);document.body.append(dialog);dialog.showModal();
}
