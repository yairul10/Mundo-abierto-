import {mountPvpControlEditor} from './pvp-control-editor.js?v=238';
import {mountPvpSkills} from './pvp-skills-ui.js?v=256';
import {pvpRoster,readOfflinePilot} from './pvp-loadout.js?v=314';
const API='https://mundo-abierto-pvp.yairul17.workers.dev';
const GUEST_KEY='mundoAbierto.guestKey',NAME_KEY='mundoAbierto.guestName',SHIP_KEY='mundoAbierto.guestShip';
const NAMES={obsidian:'Obsidian',azote:'Azote',egida:'Égida',vertigo:'Vértigo',aurora:'Aurora',titan:'Titán',espectro:'Espectro',segadora:'Segadora',bastion:'Bastión',centella:'Centella'};
const ERRORS={invalid_skills:'Elige dos habilidades distintas en la base.',skill_cooldown:'La habilidad todavía está recargando.',test_closed:'El servidor de prueba está desactivado.',already_connected:'Este invitado ya está conectado.',world_full:'El mapa está lleno (24 jugadores).',too_far:'Selecciona un objetivo vulnerable a menos de 1200 m.',rate_limit:'Espera unos segundos para volver a entrar.',prototype_retired:'La prueba anterior fue reemplazada por el mapa compartido.',base_only:'Disponible únicamente cuando la base te protege.',protected:'La protección de la base impide atacar.',open_pvp:'El combate es abierto al salir de la base.'};
export const sharedRequested=()=>new URLSearchParams(location.search).get('pvp')==='1';
export function guestIdentity(){let key=localStorage.getItem(GUEST_KEY);if(!/^[a-f0-9]{64}$/.test(key||'')){key=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');localStorage.setItem(GUEST_KEY,key)}return {guestKey:key,name:localStorage.getItem(NAME_KEY)||'Invitado',shipId:localStorage.getItem(SHIP_KEY)||'aurora'}}
export function startSharedSession(bridge){
 const realm=window.MUNDO_PLAY_MODE?.mode==='test'?'test':'normal';let loadout=pvpRoster(readOfflinePilot(localStorage));
 let identity=null,ws=null,state=null,me=null,seq=0,pending=[],lastSend=0,lastPing=0,lastReceived=performance.now(),retryAt=0,attempts=0,busy=false,closed=false,selected='',clockOffset=0,lastRevision=-1,portalTime=0,lastFrame=performance.now(),firstState=true,hangarRequested=false,hangarRequestAt=0,lastLuck=0,pingMs=null,messageUntil=0;
 const seenEvents=new Set(),$=id=>document.getElementById(id);
 const style=document.createElement('link');style.rel='stylesheet';style.href='./css/shared-world.css?v=256';document.head.appendChild(style);document.body.classList.add('pvp-hud');
 const panel=document.createElement('section');panel.id='worldPanel';panel.setAttribute('aria-label','PvP abierto');panel.innerHTML='<div class="world-top"><strong id="worldStatus">Conectando al mapa…</strong><button id="worldExit">Salir del PvP</button></div><small id="worldDetails">Invitado · Jefe cooperativo · Recompensas por daño</small><button id="worldHangar">Aterrizar y abrir hangar</button><div id="worldTools" hidden><label>Apodo <input id="worldName" maxlength="20" value="Invitado"></label><button id="worldSaveName">Guardar apodo</button><small>Usas tus naves y equipo. Casco ×20 en PvP.</small></div><div id="worldMessage" role="status"></div><button id="worldRetry" hidden>Reconectar</button>';
 document.body.append(panel);const zoom=$('zoomControls');if(zoom){const actions=document.createElement('div');actions.id='pvpMapActions';actions.append($('worldExit'),zoom);document.body.append(actions)}
 const home=$('hangarHomeView');if(home){const section=document.createElement('section');section.id='pvpHangarLoadout';section.innerHTML='<h3>Equipamiento PvP</h3><p>Equipa tus naves y habilidades al aterrizar.</p>';section.append($('worldTools'));home.append(section)}
 const targetCard=document.createElement('section');targetCard.id='worldTarget';targetCard.hidden=true;targetCard.setAttribute('role','dialog');targetCard.setAttribute('aria-label','Objetivo seleccionado');targetCard.innerHTML='<strong id="worldTargetName"></strong><small id="worldTargetDetail"></small><button id="worldTargetClose">Cerrar</button>';document.body.append(targetCard);
 const status=$('worldStatus'),details=$('worldDetails'),tools=$('worldTools'),message=$('worldMessage');
 function note(text){message.textContent=text;messageUntil=performance.now()+6500}
 function send(m){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m))}
 const active=()=>!!me&&ws?.readyState===WebSocket.OPEN&&performance.now()-lastReceived<3000;
 const canFight=()=>active()&&me.protected===false&&!me.hangar;
 const canTarget=id=>state?.boss?.id===id?state.boss.hp>0:!!state?.players.some(p=>p.id===id&&id!==me?.id&&!p.protected&&!p.hangar&&p.hp>0);
 const targetId=()=>selected||bridge.targetId?.()||null;
 const skillUI=mountPvpSkills({tools,getState:()=>({state,me,now:Date.now()+clockOffset}),canUse:canFight,send:m=>send({...m,targetId:targetId()}),isHangarOpen:bridge.isHangarOpen,storage:localStorage,key:'mundoAbierto.pvpSkills.'+realm});
 mountPvpControlEditor({realm,isHangarOpen:bridge.isHangarOpen});
 function exit(){if(closed)return;closed=true;send({type:'leave'});ws?.close();location.href='index.html'}
 function clearSelection(){selected='';targetCard.hidden=true}
 $('worldHangar').onclick=()=>bridge.requestLanding();$('worldExit').onclick=exit;$('worldRetry').onclick=()=>{attempts=0;retryAt=0;connect()};$('worldTargetClose').onclick=clearSelection;
 $('worldSaveName').onclick=()=>{const name=$('worldName').value.trim()||'Invitado';try{localStorage.setItem(NAME_KEY,name);if(identity)identity.name=name}catch{}send({type:'name',name})};
 function updateUI(){
  skillUI.update();if(!state||!me)return;
  status.textContent=me.protected?'Base PvP · Protegido':'PvP abierto';
  details.textContent=(realm==='test'?'PRUEBAS · ':'')+me.name+' #'+me.id.slice(-6)+' · '+state.players.length+' pilotos · '+(pingMs===null?'Conectado':pingMs+' ms');
  $('worldHangar').disabled=!me.protected||!!me.hangar||hangarRequested||!bridge.canLand();tools.hidden=!bridge.isHangarOpen();
  const other=state.players.find(p=>p.id===selected&&p.id!==me.id);if(state.boss?.id===selected&&state.boss.hp>0){$('worldTargetName').textContent=state.boss.name;$('worldTargetDetail').textContent=Math.ceil(state.boss.hp).toLocaleString()+' / '+state.boss.maxHp.toLocaleString()+' PV · Premio total: 1.000.000 créditos'}else if(!other){clearSelection()}else if(!targetCard.hidden){$('worldTargetName').textContent=other.name+' #'+other.id.slice(-6);$('worldTargetDetail').textContent=NAMES[other.profile.shipId]+(other.hangar?' · En hangar':other.protected?' · Protegido':' · Objetivo PvP')}
 }
 async function connect(){if(busy||closed)return;busy=true;$('worldRetry').hidden=true;status.textContent='Conectando al mapa…';try{
  if(bridge.isHangarOpen())loadout=pvpRoster(readOfflinePilot(localStorage));if(!identity)identity={...guestIdentity(),shipId:loadout.selected};$('worldName').value=identity.name;
  const r=await fetch(API+'/world/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,roster:loadout.profiles,realm,skills:skillUI.saved}),signal:AbortSignal.timeout(12000)}),ticket=await r.json();if(!r.ok)throw Error(ERRORS[ticket.error]||'No se pudo entrar al mapa.');
  if(closed)return;ws=new WebSocket(API.replace('https:','wss:')+'/world/socket?realm='+realm,['mundo-world-v1',ticket.token]);seq=0;pending=[];me=null;state=null;lastReceived=performance.now();
  ws.onopen=()=>{lastReceived=performance.now();lastPing=0;attempts=0};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}lastReceived=performance.now();
   if(m.type==='pong'){pingMs=Math.max(0,Math.round(Date.now()-m.echo));return}
   if(m.type==='error'){hangarRequested=false;note(ERRORS[m.error]||'No se pudo completar la acción.');return}
   if(m.type==='bossRewards'){try{const result=bridge.bossRewards?.(m.receipts);if(result?.ids?.length)send({type:'bossRewardAck',ids:result.ids});if(result?.added)note('Jefe derrotado · +'+result.added.toLocaleString()+' créditos por tu daño.')}catch{note('No se pudo guardar el premio. Se reintentará automáticamente.')}return}
   if(m.type==='volley'){if(m.owner!==ticket.playerId)bridge.remoteShots(m.shots);return}if(m.type!=='world')return;
   state=m;clockOffset=m.serverTime-Date.now();me=m.players.find(p=>p.id===ticket.playerId);if(!me)return;
   if(me.hangar&&hangarRequested){hangarRequested=false;if(bridge.openHangar()===false){send({type:'loadout',roster:loadout.profiles,shipId:loadout.selected});note('Vuelve a situarte sobre una plataforma para aterrizar.')}}
   if(bridge.isHangarOpen()&&!me.hangar&&performance.now()-hangarRequestAt>1500){hangarRequestAt=performance.now();send({type:'hangar',open:true})}
   if(identity.shipId!==me.profile.shipId){identity.shipId=me.profile.shipId;try{localStorage.setItem(SHIP_KEY,identity.shipId)}catch{}}
   pending=pending.filter(p=>p.seq>(me.seq??-1));const snap=lastRevision!==me.revision;bridge.snapshot(me,m.players.filter(p=>p.id!==me.id),firstState||snap,pending,state);lastRevision=me.revision;
   for(const event of m.events||[]){if(seenEvents.has(event.id))continue;seenEvents.add(event.id);if(seenEvents.size>200)seenEvents.delete(seenEvents.values().next().value);if(!firstState&&event.type==='destroyed'){bridge.destroyed?.(event.victim===me.id);if(event.victim===me.id){clearSelection();note('Nave destruida. Reapareciste en la base.');bridge.clearFight()}else if(event.winner===me.id)note('Enemigo destruido.')}}
   for(const event of m.events||[])if(event.type==='bossDefeated'&&!seenEvents.has('boss:'+event.id)){seenEvents.add('boss:'+event.id);if(!firstState)note('Titán del Nexo derrotado · Recompensas según el daño causado.')}
   const luck=me.skillReadyAt?.luck||0;if(!firstState&&luck>lastLuck&&luck>m.serverTime&&m.serverTime>=luck-30000&&m.serverTime<luck-27000)bridge.repeatMissiles?.();lastLuck=luck;firstState=false;updateUI();
  };
  ws.onclose=()=>{if(closed)return;clearSelection();state=null;me=null;pending=[];hangarRequested=false;bridge.pause();status.textContent='Sin conexión · Reconectando…';retryAt=performance.now()+2000};ws.onerror=()=>{};
 }catch(e){status.textContent='No se pudo conectar';note(e.name==='TimeoutError'?'La conexión tardó demasiado.':e.message);if(++attempts<8)retryAt=performance.now()+2500;else $('worldRetry').hidden=false}finally{busy=false}}
 for(const button of [...panel.querySelectorAll('button'),...targetCard.querySelectorAll('button')])button.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(!button.disabled)button.click()},{passive:false});
 connect();addEventListener('pagehide',()=>{closed=true;send({type:'leave'});ws?.close()});
 return {setFormation(id){if(!active()||me.hangar)return false;if(!state.rules.formationSwitch){note('El servidor PvP necesita actualizarse para cambiar formaciones en vuelo.');return false}send({type:'formation',formation:id});return true},get canDock(){return this.active&&me.protected===true&&!me.hangar&&!hangarRequested&&Math.hypot(...me.pos)<=state.rules.safeRadius},requestHangar(){if(!this.canDock||!bridge.canLand())return false;hangarRequested=true;hangarRequestAt=performance.now();send({type:'hangar',open:true});clearSelection();tools.hidden=true;return true},get paralyzed(){return (me?.paralyzedUntil||0)>Date.now()+clockOffset},isJammed(id){return (state?.players.find(p=>p.id===id)?.skillUntil?.interference||0)>Date.now()+clockOffset},get active(){return active()},get canFight(){return canFight()},canTarget,get targetId(){return targetId()},get radius(){return state?.rules?.radius||3000},get profile(){return me?.profile},get myId(){return me?.id},get opponentId(){return selected||null},refreshLoadout(source){loadout=pvpRoster(source);identity.shipId=loadout.selected;send({type:'loadout',roster:loadout.profiles,shipId:loadout.selected})},select(id){if(me?.hangar||bridge.isHangarOpen()||id===me?.id)return;selected=id;targetCard.hidden=false;tools.hidden=true;updateUI()},clearSelection,
 beforeFrame(dt,now){bridge.keepArena();bridge.frame(dt);if(retryAt&&now>=retryAt){retryAt=0;connect()}if(this.active&&now-lastPing>5000){send({type:'ping',time:Date.now()});lastPing=now}if(ws?.readyState===WebSocket.OPEN&&now-lastReceived>15000)ws.close();if(message.textContent&&now>messageUntil)message.textContent='';updateUI();const portal=bridge.nearPortal();portalTime=portal&&this.active&&!bridge.isHangarOpen()?portalTime+Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;if(portalTime>0){message.textContent='Regresando a tu mapa · '+Math.ceil(3-portalTime)+' s';messageUntil=now+200}if(portalTime>=3)exit()},
 input(move,aim,firing,dt,now){if(!this.active||now-lastSend<50)return;const elapsed=Math.min(.15,(now-lastSend)/1000);if(this.paralyzed)move=[0,0,0];const m={type:'input',seq:++seq,move,aim,firing:this.canFight&&firing};send(m);pending.push({seq:m.seq,move,dt:elapsed});pending=pending.slice(-12);lastSend=now},
 shots(weapon,shots,position,attack,factor,aimId){if(!this.canFight)return;send({type:'volley',weapon,targetId:aimId||targetId(),shots:shots.map((p,i)=>({kind:weapon==='laser'&&i>=2?'drone':weapon,offset:p.mesh.position.clone().sub(position).toArray(),direction:p.vel.clone().normalize().toArray(),speed:p.missileSpeed,delay:p.missileGuideDelay,locked:!!p.target}))})},ability(){if(this.canFight)send({type:'ability'})}};
}

