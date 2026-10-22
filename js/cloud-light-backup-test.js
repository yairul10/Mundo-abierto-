// Copia ligera experimental, separada de la copia completa. Nunca restaura partidas.
const API='https://cosmos-legacy-lite-test.yairul17.workers.dev/v1/light-backup-test';
const FIELDS=['name','level','xp','gold','loot','ownedShips','shipId','shipSpecializations','shipBaseStats','droneCount','explorerDrone','explorerRangeLevel','repairRobot','repairRobotLevel','upgrades','formations','droneFormation','boosters','quests','pvpBossReceipts','maxHp','maxEnergy','attack','defense','speed'];
export function mountLightBackupTest(){
 if(window.MUNDO_PLAY_MODE?.mode==='test'||new URLSearchParams(location.search).has('pvp'))return;
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
}
