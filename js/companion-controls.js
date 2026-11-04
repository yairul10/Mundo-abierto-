import {COMPANION_MODES,companionMode} from './companion-priority.js?v=359';
const LABELS={both:'Ambos',attack:'Atacar',collect:'Recoger'};
export function mountCompanionControls({parent,getPlayer,onChange,cockpit=false}){
 const button=document.createElement('button');button.id='companionModeBtn';button.type='button';
 button.style.cssText='font:600 11px system-ui;min-width:64px;min-height:36px;padding:5px 7px;white-space:nowrap;line-height:1.25';
 let rendered='';
 function render(){const player=getPlayer(),mode=companionMode(player.explorerMode),stamp=String(!!player.explorerDrone)+mode;if(rendered===stamp)return;rendered=stamp;button.hidden=!player.explorerDrone;button.style.display=player.explorerDrone?'':'none';button.textContent=(cockpit?'':'🛰 ')+LABELS[mode];button.setAttribute('aria-label','Modo de la mascota: '+LABELS[mode]+'. Tocar para cambiar.');button.title='Mascota: atacar, recoger o ambos';}
 button.onclick=()=>{const player=getPlayer();if(!player.explorerDrone)return;const next=COMPANION_MODES[(COMPANION_MODES.indexOf(companionMode(player.explorerMode))+1)%COMPANION_MODES.length];onChange(next);render();};
 button.addEventListener('touchstart',event=>{event.preventDefault();event.stopPropagation();button.click()},{passive:false});
 parent?.append(button);render();return {render};
}
