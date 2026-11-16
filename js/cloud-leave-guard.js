// Never interpret a timeout or a paused sync as a confirmed backup.
export async function confirmCloudBeforeLeave(flush,onPending=async()=> 'stay'){
 if(typeof flush!=='function')return true;
 for(;;){
  let result;try{result=await flush()}catch{}
  if(result?.status==='stored'||result?.status==='unchanged')return true;
  const choice=await onPending();if(choice==='local')return true;if(choice!=='retry')return false;
 }
}
export function showPendingCloudExit(){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog';dialog.setAttribute('aria-label','Respaldo pendiente');const title=document.createElement('h2'),text=document.createElement('p');title.textContent='La nube aún no confirmó tu progreso';text.textContent='Tu partida sigue guardada en este dispositivo. Si sales ahora, conserva la copia del dispositivo al volver: restaurar una nube anterior puede quitar tus avances y compras.';dialog.append(title,text);
 const done=value=>{dialog.close();dialog.remove();resolve(value)};
 for(const [value,label] of [['retry','Reintentar respaldo'],['stay','Seguir en cooperativo'],['local','Salir conservando la partida local']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>done(value);dialog.append(button)}
 dialog.addEventListener('cancel',event=>{event.preventDefault();done('stay')});document.body.append(dialog);dialog.showModal();
})}
