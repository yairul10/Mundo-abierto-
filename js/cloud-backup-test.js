// Copia experimental manual: nunca reemplaza el guardado local ni restaura partidas.
const API='https://cosmos-legacy-api.yairul17.workers.dev';
const IDENTITY_KEY='cosmosLegacy.guestIdentity.v1';
const SAVE_KEY='mundoAbierto.player';
function getIdentity(){try{const x=JSON.parse(localStorage.getItem(IDENTITY_KEY)||'null');return x&&/^[a-f0-9]{64}$/.test(x.guest_token)?x:null}catch{return null}}
export function mountBackupTest(){
 if(window.MUNDO_PLAY_MODE?.mode==='test'||new URLSearchParams(location.search).has('pvp'))return;
 const btn=document.createElement('button');btn.type='button';btn.textContent='☁️ Probar copia';btn.title='Copia experimental: no sincroniza ni restaura partidas';
 btn.style.cssText='position:fixed;left:12px;bottom:12px;z-index:1001;border:1px solid #7ed9ff;border-radius:12px;padding:9px 12px;background:#081a33;color:#eaf8ff;font:600 12px system-ui;opacity:.85';
 document.body.appendChild(btn);
 btn.onclick=async()=>{
  const identity=getIdentity();if(!identity){alert('La identidad invitada todavía no está disponible. Espera unos segundos y prueba otra vez.');return}
  const raw=localStorage.getItem(SAVE_KEY);if(!raw){alert('Todavía no hay una partida local guardada. Entra al mundo y vuelve a probar.');return}
  if(!confirm('¿Enviar una copia experimental de tu partida a Cloudflare? No se restaurará ni sustituirá el guardado local.'))return;
  btn.disabled=true;btn.textContent='☁️ Enviando…';
  try{const save=JSON.parse(raw);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{const res=await fetch(API+'/v1/backup-test',{method:'POST',headers:{'authorization':'Bearer '+identity.guest_token,'content-type':'application/json'},body:JSON.stringify({kind:'cosmos-local-backup-test',save}),signal:controller.signal});const data=await res.json();if(!res.ok||!data.stored)throw Error(data.error||'HTTP '+res.status);alert('☁️ Copia experimental guardada ('+data.bytes+' bytes). Tu partida local no se modificó.')}finally{clearTimeout(timer)}
  }catch(e){alert('No se pudo guardar la copia: '+e.message+'. La partida local sigue intacta.')}
  finally{btn.disabled=false;btn.textContent='☁️ Probar copia'}
 };
}
