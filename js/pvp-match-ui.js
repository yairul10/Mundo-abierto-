const KEY='cosmosLegacy.pvp1v1.v1';
export const arenaRequested=()=>new URLSearchParams(location.search).get('arena')==='1';
export function readArenaChoice(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
export function saveArenaChoice(choice){if(choice)sessionStorage.setItem(KEY,JSON.stringify(choice));else sessionStorage.removeItem(KEY)}
export function choosePvpMatch(){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog pvp-match-dialog';dialog.setAttribute('aria-label','Sala PvP');
 for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());
 const title=document.createElement('h2'),text=document.createElement('p'),actions=document.createElement('div'),back=document.createElement('button');dialog.append(title,text,actions,back);
 const done=value=>{dialog.close();dialog.remove();resolve(value)};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)};
 function modes(){title.textContent='PvP';text.textContent='Elige el modo de juego.';actions.replaceChildren();button('1v1',()=>menu('1v1'));button('2v2',()=>menu('2v2'));button('5v5',()=>menu('5v5'));button('Arena · 20 jugadores',()=>menu('arena20'));back.textContent='Volver a mi mapa';back.onclick=()=>done(null)}
 function menu(mode){title.textContent='PvP · '+(mode==='arena20'?'Arena 20':mode);text.textContent=(mode==='arena20'?'Todos contra todos. Gana la última nave en pie. Si caes, puedes observar el combate.':mode!=='1v1'?(mode==='5v5'?'Dos equipos de cinco. ':'Dos equipos de dos. ')+'Sin daño entre compañeros. Si caes, puedes observar a tu equipo.':'Gana quien destruya la nave rival.')+'\nElige dos habilidades y marca Listo. Sin premios ni pérdida de créditos. El equipamiento se fija al entrar.';actions.replaceChildren();back.textContent='Cambiar modo';back.onclick=modes;
  button(mode!=='1v1'?'Practicar con bots':'Practicar contra un bot',()=>done({action:'bot',mode}));button(mode!=='1v1'?'Buscar partida':'Buscar rival',()=>done({action:'find',mode}));button('Crear sala privada',()=>done({action:'create',mode}));button('Unirme con código',()=>{
   actions.replaceChildren();back.textContent='Volver';back.onclick=()=>menu(mode);const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.placeholder='Código de 6 caracteres';input.setAttribute('aria-label','Código de sala PvP '+mode);input.maxLength=6;input.required=true;input.autocomplete='off';input.autocapitalize='characters';input.pattern='[A-HJ-NP-Za-hj-np-z2-9]{6}';input.style.cssText='box-sizing:border-box;width:100%;padding:12px;font:18px system-ui;text-align:center;letter-spacing:3px';submit.textContent='Unirme';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())done({action:'join',mode,code:input.value.trim().toUpperCase()})};actions.append(form);input.focus();
  });
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();done(null)});modes();document.body.append(dialog);dialog.showModal();
})}
export function showPvpResult(match,myId,onLeave,myTeam){
 const dialog=document.createElement('dialog');dialog.className='account-dialog';const title=document.createElement('h2'),text=document.createElement('p'),button=document.createElement('button');
 const won=match.winnerTeam&&myTeam?match.winnerTeam===myTeam:match.winner===myId;title.textContent=won?(match.mode!=='1v1'&&match.mode!=='arena20'?'¡Victoria de tu equipo!':'¡Victoria!'):match.winner?'Derrota':'Empate';text.textContent=(match.reason==='disconnect'?'La partida terminó por desconexión. ':match.reason==='time'?'Se agotaron los 5 minutos. ':match.reason==='surrender'?'La partida terminó por abandono. ':'')+'No pierdes créditos ni equipo. Puedes volver a buscar rival.';button.textContent='Volver a mi mapa';button.onclick=()=>{dialog.close();dialog.remove();onLeave()};dialog.addEventListener('cancel',e=>e.preventDefault());dialog.append(title,text,button);document.body.append(dialog);dialog.showModal();
}

