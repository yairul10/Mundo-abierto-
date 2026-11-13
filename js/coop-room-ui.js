const KEY='cosmosLegacy.coopRoom.v1';
export function readCoopChoice(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
export function saveCoopChoice(value){if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY)}
export function chooseCoopRoom(){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog coop-room-dialog';for(const event of ['pointerdown','touchstart','keydown','keyup'])dialog.addEventListener(event,e=>e.stopPropagation());dialog.setAttribute('aria-label','Partida cooperativa');
 const title=document.createElement('h2'),text=document.createElement('p'),actions=document.createElement('div'),back=document.createElement('button');title.textContent='Cooperativo';text.textContent='Hasta 5 jugadores · 2 vidas · Recompensas compartidas';dialog.append(title,text,actions,back);
 const done=value=>{dialog.close();dialog.remove();resolve(value)};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)};
 function home(){actions.replaceChildren();back.textContent='Cancelar';back.onclick=()=>done(null);button('Partida común',()=>done({action:'common'}));button('Partida privada',privateMenu)}
 function privateMenu(){actions.replaceChildren();back.textContent='Volver';back.onclick=home;button('Crear partida',()=>done({action:'create'}));button('Unirme con código',()=>{actions.replaceChildren();const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.placeholder='Código de 6 caracteres';input.setAttribute('aria-label','Código de sala');input.maxLength=6;input.required=true;input.autocomplete='off';input.autocapitalize='characters';input.pattern='[A-HJ-NP-Za-hj-np-z2-9]{6}';submit.textContent='Unirme';submit.type='submit';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())done({action:'join',code:input.value.trim().toUpperCase()})};actions.append(form);input.focus()})}
 dialog.addEventListener('cancel',e=>{e.preventDefault();done(null)});home();document.body.append(dialog);dialog.showModal();
})}
export function showExpeditionEnd(reason,onLeave){
 const dialog=document.createElement('dialog');dialog.className='account-dialog coop-room-dialog';const title=document.createElement('h2'),text=document.createElement('p'),button=document.createElement('button');
 title.textContent=reason==='completed'?'¡Expedición completada!':'Sin vidas disponibles';text.textContent=reason==='completed'?'Tu grupo eliminó a todos los enemigos. Las recompensas se guardan en tu cuenta.':'Has usado tus dos vidas. Regresarás a tu mapa.';button.textContent='Volver a mi mapa';button.onclick=()=>{dialog.close();dialog.remove();onLeave()};dialog.addEventListener('cancel',e=>e.preventDefault());dialog.append(title,text,button);document.body.append(dialog);dialog.showModal();if(reason!=='completed')setTimeout(()=>button.click(),2500);
}
