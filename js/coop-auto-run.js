export const COOP_AUTO_KEY='cosmosLegacy.coopAuto.v1',COOP_RESUME_KEY='cosmosLegacy.coopAutoResume.v1';
export const COOP_STOPS=Object.freeze({colossi:'Después de los 3 Colosos',inferno:'Después de Inferno Pro',titan:'Después del Gran Titán Pro',all:'Mapa completo (Titán del Nexo)'});
export function coopAutoConfig(value={}){return {repeat:value?.repeat===true,stop:Object.hasOwn(COOP_STOPS,value?.stop)?value.stop:'all'}}
export function readCoopAuto(storage){try{return coopAutoConfig(JSON.parse(storage.getItem(COOP_AUTO_KEY)||'{}'))}catch{return coopAutoConfig()}}
const stages=[['pvp-coloso-1','pvp-coloso-2','pvp-coloso-3'],['coop-inferno-pro'],['pvp-gran-titan'],['pvp-super-boss']];
export function coopStopReached(snapshot,stop='all'){
 if(!snapshot?.room)return false;if(stop==='all')return snapshot.room.status==='completed';
 const n=['colossi','inferno','titan'].indexOf(stop);if(n<0)return false;
 return stages.slice(0,n+1).flat().every(id=>snapshot.enemies?.some(e=>e.id===id&&Number.isFinite(e.hp)&&e.hp<=0));
}
export function consumeCoopResume(storage,{owner,realm,choice,now=Date.now()}){try{const raw=storage.getItem(COOP_RESUME_KEY);storage.removeItem(COOP_RESUME_KEY);const value=JSON.parse(raw||'null');return !!(owner?.startsWith('play:')&&value?.owner===owner&&value.realm===realm&&value.expiresAt>now&&value.expiresAt<=now+120000&&choice?.action==='create')}catch{return false}}
export async function prepareCoopRepeat({session,owner,realm,shouldContinue,saveChoice,flush,leave,navigate,now=Date.now()}){
 if(!owner?.startsWith('play:')||!shouldContinue())return false;
 let timer;try{if(flush)await Promise.race([Promise.resolve().then(flush).catch(()=>{}),new Promise(resolve=>{timer=setTimeout(resolve,2500)})])}finally{clearTimeout(timer)}
 if(!shouldContinue())return false;
 const marker=JSON.stringify({owner,realm,expiresAt:now+90000});session.setItem(COOP_RESUME_KEY,marker);if(session.getItem(COOP_RESUME_KEY)!==marker)throw Error('No se pudo preparar la repetición.');
 try{saveChoice({action:'create'});leave();navigate();return true}catch(error){session.removeItem(COOP_RESUME_KEY);throw error}
}
export function mountCoopAutoSettings({parent,getConfig,onStart,onStop,isRunning}){
 const button=document.createElement('button');button.style.cssText='min-height:40px;padding:0 8px;background:#1c2430;color:#f5ebcf;border:1px solid #967546;border-radius:8px;font:700 11px system-ui';button.type='button';button.id='pvpFarmSettings';button.textContent='Ajustar AUTO';button.className='cockpit-control';parent.append(button);
 button.onclick=()=>{const wasRunning=isRunning();onStop();const dialog=document.createElement('dialog');dialog.className='account-dialog';dialog.id='coopAutoSettings';const title=document.createElement('h2'),label=document.createElement('label'),repeat=document.createElement('input'),select=document.createElement('select'),text=document.createElement('p'),start=document.createElement('button'),stop=document.createElement('button'),back=document.createElement('button');title.textContent='AUTO PRO · Cooperativo';repeat.type='checkbox';repeat.checked=getConfig().repeat;label.append(repeat,' Repetir en una privada nueva');select.setAttribute('aria-label','Terminar y repetir después de');for(const [value,name] of Object.entries(COOP_STOPS)){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option)}select.value=getConfig().stop;text.textContent='El punto de término se aplica al repetir. Solo tu piloto cambia a la nueva privada; la sala actual y sus otros jugadores conservan el avance. Se detiene al perder las vidas o tomar el control manual.';start.textContent='Guardar e iniciar';stop.textContent='Detener AUTO';stop.disabled=!wasRunning;back.textContent='Cerrar';start.onclick=()=>{const config=coopAutoConfig({repeat:repeat.checked,stop:select.value});try{document.activeElement?.blur();onStart(config);dialog.close();dialog.remove()}catch(error){text.textContent=error.message}};stop.onclick=()=>{onStop();dialog.close();dialog.remove()};back.onclick=()=>{dialog.close();dialog.remove()};dialog.append(title,label,select,text,start,stop,back);document.body.append(dialog);dialog.showModal()};return button;
}
