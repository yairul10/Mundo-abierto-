import {fleetMultipliers} from './fleet-balance.js?v=450';
import {shipRole} from './assembled-ships.js?v=450';
import {SHIP_PREVIEWS} from './ship-preview-catalog.js?v=355';

const modes={pve:'PvE',cooperative:'Cooperativo',pvp:'PvP'};
const descriptions={
 aurora:{name:'Sobrecarga',key:'overload',duration:5,increment:.25,upgrades:[['energy','Reactor eficiente','Recarga del escudo +4 % por nivel'],['overload','Sobrecarga avanzada','Duración +0,25 s por nivel'],['shield','Recuperación de casco','Recupera 0,3 % del casco por segundo durante Sobrecarga por nivel']]},
 titan:{name:'Fortaleza',key:'fortress',duration:6,increment:.3,upgrades:[['armor','Blindaje pesado','Reducción de daño +1 % por nivel'],['fortress','Fortaleza extendida','Duración +0,3 s por nivel'],['repair','Reparación táctica','Recupera 0,15 % del casco por segundo por nivel tras 5 s sin daño']]},
 espectro:{name:'Furia',key:'fury',duration:5,increment:.25,upgrades:[['crit','Precisión letal','Probabilidad de crítico +1 % por nivel'],['fury','Furia prolongada','Duración +0,25 s por nivel'],['evasion','Maniobras evasivas','Probabilidad de evasión +0,8 % por nivel']]}
};
const level=(player,id,key)=>Math.max(0,Math.min(10,Math.floor(Number(player.shipSpecializations?.[id]?.[key])||0)));
export function shipInfo(id,player={},mode='pve'){
 if(!SHIP_PREVIEWS[id])return null;
 mode=Object.hasOwn(modes,mode)?mode:'pve';
 const role=shipRole(id),ability=descriptions[role]||descriptions.aurora,upgraded=['centella','vertigo'].includes(id),improvedDefense=['bastion','egida'].includes(id),improvedFury=['segadora','azote'].includes(id);
 const effect=role==='titan'?`Reduce el daño recibido por Fortaleza un ${improvedDefense?50:40} % mientras está activa, además de la resistencia pasiva.`:role==='espectro'?`Aumenta el daño de los láseres principales un ${improvedFury?70:60} %, pero también aumenta el daño recibido un ${improvedFury?20:30} % mientras está activa.`:`Aumenta la cadencia del láser un ${upgraded?40:30} %${upgraded?' y rompe el arpón o la parálisis al activarse':''}.`;
 const passive=role==='titan'?'Reduce el daño recibido un 10 % antes de las mejoras exclusivas.':role==='espectro'?'Los láseres principales tienen 15 % de probabilidad de crítico, que causa 50 % más de daño.':'Sobrecarga mejora la cadencia del láser mientras está activa.';
 return {id,mode,name:SHIP_PREVIEWS[id].name,equippedName:SHIP_PREVIEWS[player.shipId]?.name||'Cadete',stats:fleetMultipliers(id,mode),equipped:fleetMultipliers(player.shipId||'aurora',mode),ability:ability.name,effect,passive,duration:ability.duration+level(player,id,ability.key)*ability.increment,upgrades:ability.upgrades.map(([key,name,description])=>({name,description,level:level(player,id,key)}))};
}
const fmt=value=>Number(value.toFixed(2)).toLocaleString('es-CL');
export function renderShipInfo(id,player={},mode='pve'){
 const data=shipInfo(id,player,mode);if(!data)return '';
 const stats=[['hp','Casco'],['attack','Ataque'],['defense','Defensa'],['speed','Velocidad']].map(([key,label])=>{const selected=data.stats[key],current=data.equipped[key],diff=current?(selected/current-1)*100:0;const comparison=Math.abs(diff)<.01?'Igual':`${diff>0?'+':''}${fmt(diff)} %`;return `<div><span>${label}</span><strong>×${fmt(selected)}</strong><small>${comparison}</small></div>`}).join('');
 const options=Object.entries(modes).map(([key,label])=>`<option value="${key}" ${key===data.mode?'selected':''}>${label}</option>`).join('');
 return `<section class="ship-info" data-ship-info="${id}"><label>Modo <select data-ship-info-mode>${options}</select></label><p class="muted">Comparación de coeficientes con ${data.equippedName}; las mejoras, formaciones y el casco de combate pueden modificar los valores finales.</p><div class="ship-info-stats">${stats}</div><details><summary>Habilidades y mejoras exclusivas</summary><p><strong>${data.ability}</strong> · ${fmt(data.duration)} s de duración · recarga 15 s</p><p>${data.effect}</p><p><strong>Ventaja pasiva:</strong> ${data.passive}</p><p class="muted">Las mejoras exclusivas mostradas corresponden al nivel guardado para esta nave.</p>${data.upgrades.map(u=>`<p><strong>${u.name}</strong> · Nivel ${u.level}/10<br><small>${u.description}</small></p>`).join('')}</details></section>`;
}
export function bindShipInfo(host,player){
 host.querySelectorAll('[data-ship-info-mode]').forEach(select=>select.onchange=()=>{const section=select.closest('[data-ship-info]'),details=section.querySelector('details')?.open;section.outerHTML=renderShipInfo(section.dataset.shipInfo,player,select.value);bindShipInfo(host,player);if(details)host.querySelector('[data-ship-info] details').open=true});
}
