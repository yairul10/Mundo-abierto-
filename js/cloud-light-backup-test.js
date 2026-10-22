// Copia ligera experimental, separada de la copia completa. Nunca restaura partidas.
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev/v1/light-backup-test';
const FIELDS=['name','classId','activityJournal','level','xp','gold','loot','ownedShips','shipId','shipSpecializations','shipBaseStats','droneCount','explorerDrone','explorerRangeLevel','repairRobot','repairRobotLevel','upgrades','formations','droneFormation','boosters','quests','pvpBossReceipts','maxHp','maxEnergy','attack','defense','speed'];
export function mountLightBackupTest(){
 if(window.MUNDO_PLAY_MODE?.mode==='test'||new URLSearchParams(location.search).has('pvp'))return;
 // Auditoría de cobertura: comprueba campos persistentes que no entran en la copia ligera.
 const audit=document.createElement('button');audit.type='button';audit.textContent='🛡️ Revisar guardado';audit.title='Comprobar qué datos permanentes faltan antes de permitir restauración';
 audit.style.cssText='position:fixed;left:12px;bottom:156px;z-index:1001;border:1px solid #f6d98b;border-radius:12px;padding:9px 12px;background:#3c2d12;color:#fff3d2;font:600 12px system-ui;opacity:.9';
 document.body.appendChild(audit);
 audit.onclick=()=>{
  let save;try{save=JSON.parse(localStorage.getItem('mundoAbierto.player')||'null')}catch{}
  if(!save||typeof save!=='object'){alert('No hay una partida local legible.');return}
  const temporary=new Set(['x','y','z','yaw','pitch','sector','hp','energy','granTitanState','carrierState']);
  const omitted=Object.keys(save).filter(key=>!FIELDS.includes(key)&&!temporary.has(key));
  const included=FIELDS.filter(key=>Object.prototype.hasOwnProperty.call(save,key));
  alert('🛡️ Auditoría de guardado ligero\\nCampos incluidos: '+included.length+'\nCampos temporales excluidos: '+Object.keys(save).filter(k=>temporary.has(k)).length+'\nCampos pendientes de revisión: '+omitted.length+(omitted.length?'\n'+omitted.join(', '):'')+'\n\nEsta auditoría no modifica nada. La restauración continúa desactivada.');
 };
 const button=document.createElement('button');button.type='button';button.textContent='☁️ Copia ligera';button.title='Prueba manual de progreso permanente, sin restauración';
 button.style.cssText='position:fixed;left:12px;bottom:60px;z-index:1001;border:1px solid #a8edc2;border-radius:12px;padding:9px 12px;background:#0b3027;color:#edfff5;font:600 12px system-ui;opacity:.9';
 document.body.appendChild(button);
 button.onclick=async()=>{
  let identity,local;try{identity=JSON.parse(localStorage.getItem('cosmosLegacy.guestIdentity.v1')||'null');local=JSON.parse(localStorage.getItem('mundoAbierto.player')||'null')}catch{}
  if(!identity||!/^[a-f0-9]{64}$/.test(identity.guest_token)){alert('Todavía no hay identidad invitada.');return}
  if(!local||typeof local!=='object'){alert('Todavía no hay partida local.');return}
  const progress={};for(const key of FIELDS)if(Object.prototype.hasOwnProperty.call(local,key))progress[key]=local[key];
  const body=JSON.stringify({kind:'cosmos-light-backup-test',schema:1,progress});
  const size=new TextEncoder().encode(body).length;
  if(!confirm('¿Enviar copia ligera de '+size+' bytes a Cloudflare? Se guardará separada de la copia completa y NO se restaurará automáticamente.'))return;
  button.disabled=true;button.textContent='☁️ Enviando…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(API,{method:'POST',headers:{authorization:'Bearer '+identity.guest_token,'content-type':'application/json'},body,signal:controller.signal});const data=await response.json();if(!response.ok||!data.stored)throw Error(data.error||'HTTP '+response.status);alert('☁️ Copia ligera guardada: '+data.bytes+' bytes. Partida local intacta.')}catch(e){alert('Error al enviar copia ligera: '+e.message)}finally{clearTimeout(timer);button.disabled=false;button.textContent='☁️ Copia ligera'}
 };
 // Lectura de prueba: nunca escribe sobre la partida local.
 const inspect=document.createElement('button');inspect.type='button';inspect.textContent='🔎 Ver copia nube';
 inspect.style.cssText='position:fixed;left:12px;bottom:108px;z-index:1001;border:1px solid #c2b2ff;border-radius:12px;padding:9px 12px;background:#282046;color:#f2eeff;font:600 12px system-ui;opacity:.9';
 document.body.appendChild(inspect);
 inspect.onclick=async()=>{
  let identity,local;try{identity=JSON.parse(localStorage.getItem('cosmosLegacy.guestIdentity.v1')||'null');local=JSON.parse(localStorage.getItem('mundoAbierto.player')||'null')}catch{}
  if(!identity||!/^[a-f0-9]{64}$/.test(identity.guest_token)){alert('No hay identidad de invitado disponible.');return}
  inspect.disabled=true;inspect.textContent='🔎 Consultando…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const res=await fetch(API,{method:'GET',headers:{authorization:'Bearer '+identity.guest_token},cache:'no-store',signal:controller.signal});
   const data=await res.json();if(!res.ok)throw Error(data.error||'HTTP '+res.status);
   if(!data.backup){alert('Todavía no hay copia ligera para esta identidad.');return}
   const cloud=data.backup.progress||{},changes=[];
   for(const key of FIELDS){if(Object.prototype.hasOwnProperty.call(cloud,key)&&JSON.stringify(cloud[key])!==JSON.stringify(local?.[key]))changes.push(key)}
   const info='☁️ Copia ligera encontrada\nTamaño: '+data.backup.bytes+' bytes\nFecha (UTC): '+data.backup.updated_at+'\nNivel nube: '+(cloud.level??'—')+' / local: '+(local?.level??'—')+'\nCréditos nube: '+(cloud.gold??'—')+' / local: '+(local?.gold??'—')+'\nCampos diferentes: '+changes.length+(changes.length?'\n'+changes.join(', '):'')+'\n\nNo se ha restaurado ni modificado nada.';
   alert(info);
  }catch(e){alert('No se pudo consultar la copia: '+e.message)}finally{clearTimeout(timer);inspect.disabled=false;inspect.textContent='🔎 Ver copia nube'}
 };

}
