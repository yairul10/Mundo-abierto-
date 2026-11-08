import {LASERS,availableLasers,buyLaser,equipLaser,normalizeLasers} from './laser-equipment.js?v=399';
const fmt=value=>value.toLocaleString('es-CL');
function commitChange(player,action,actions,message){
 const previous={gold:player.gold,lasers:structuredClone(player.lasers)};
 if(!actions.canEdit()||!action())return;
 if(actions.changed()===false){
  Object.assign(player,previous);actions.refresh();
  actions.note('No se pudo guardar el cambio. Inténtalo de nuevo.');return;
 }
 actions.note(message);
}
function icon(color){return '<svg viewBox="0 0 80 48" width="80" height="48" aria-hidden="true" style="color:'+color+'"><path d="M12 16h30l8 8-8 8H12l-6-8Z" fill="#26374a" stroke="currentColor" stroke-width="2"/><path d="M25 18v12M34 18v12M49 20h20v8H49M70 24h7" fill="none" stroke="currentColor" stroke-width="3"/></svg>'}
export function renderLaserShop(host,player,actions){
 normalizeLasers(player);
 host.innerHTML='<h3>Láseres</h3><p class="muted">Compra por unidad y equipa tus láseres desde el Hangar. Dos espacios en la nave y uno por dron de combate.</p><div class="commerce-grid">'+Object.entries(LASERS).map(([id,laser])=>'<article class="commerce-card">'+icon(laser.color)+'<h4>'+laser.name+'</h4><strong class="formation-perk">Daño ×'+laser.multiplier+'</strong><p>'+(laser.price?fmt(laser.price)+' créditos por unidad':'Equipamiento inicial gratuito')+'</p><small>'+(laser.price?'Comprados '+player.lasers.owned[id]+' · Libres '+availableLasers(player,id):'Disponible para todos los espacios')+'</small>'+(laser.price?'<button data-buy-laser="'+id+'" '+(player.gold<laser.price||player.lasers.owned[id]>=10?'disabled':'')+'>Comprar 1</button>':'')+'</article>').join('')+'</div>';
 host.querySelectorAll('[data-buy-laser]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.buyLaser;
  commitChange(player,()=>buyLaser(player,id),actions,LASERS[id].name+' comprado. Equípalo desde el Hangar.');
 });
}
export function renderLaserEquipment(host,player,actions){
 normalizeLasers(player);
 function slot(target,index){
  const selected=player.lasers[target][index];
  return '<label class="commerce-card">'+(target==='ship'?'Nave · Láser '+(index+1):'Dron '+(index+1))+'<select data-laser-target="'+target+'" data-laser-slot="'+index+'" aria-label="'+(target==='ship'?'Láser de nave '+(index+1):'Láser de dron '+(index+1))+'">'+Object.entries(LASERS).map(([id,laser])=>'<option value="'+id+'" '+(id===selected?'selected':'')+' '+(id!==selected&&availableLasers(player,id)<1?'disabled':'')+'>'+laser.name+' · ×'+laser.multiplier+'</option>').join('')+'</select></label>';
 }
 const drones=Math.max(0,Math.min(8,Math.floor(Number(player.droneCount)||0)));
 host.innerHTML='<h4>Láseres equipados</h4><p class="muted">El armamento acompaña a la nave que equipes. Cada láser comprado ocupa un solo espacio. Por descarga se disparan 2 láseres de nave y '+drones+' de drones.</p><div class="commerce-grid">'+[slot('ship',0),slot('ship',1),...Array.from({length:drones},(_,i)=>slot('drones',i))].join('')+'</div>';
 host.querySelectorAll('[data-laser-target]').forEach(select=>select.onchange=()=>{
  commitChange(player,()=>equipLaser(player,select.dataset.laserTarget,Number(select.dataset.laserSlot),select.value),actions,'Láser equipado.');
 });
}
