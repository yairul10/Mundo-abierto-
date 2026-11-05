import {COMPANION_MODES,companionMode} from './companion-priority.js?v=359';
const LABELS={both:'Ambos',attack:'Atacar',collect:'Recoger'};
export function mountCompanionControls({parent,getPlayer,onChange,cockpit=false}){
 const button=document.createElement('button');button.id='companionModeBtn';button.type='button';
 button.style.cssText='font:600 11px system-ui;min-width:64px;min-height:36px;padding:5px 7px;white-space:nowrap;line-height:1.25';
 const menu=cockpit?document.createElement('div'):null;
 if(menu){
  menu.id='companionModeChoices';menu.hidden=true;
  menu.setAttribute('role','group');menu.setAttribute('aria-label','Modo de la mascota');
  button.style.minWidth='40px';
  button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h5m8 0h5M5.5 6v4l4 2h5l4-2V6M9 12l-2 5m8-5 2 5"/></svg>';
  button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-expanded','false');
  document.body.append(menu);
  document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!button.contains(event.target))closeMenu()},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopImmediatePropagation();closeMenu();button.focus()}},true);
  addEventListener('resize',closeMenu);
 }
 function closeMenu(){if(menu){menu.hidden=true;button.setAttribute('aria-expanded','false')}}
 function openMenu(){
  menu.replaceChildren(...COMPANION_MODES.map(mode=>{
   const option=document.createElement('button');option.type='button';
   option.textContent=mode==='attack'?'Matar':LABELS[mode];
   option.setAttribute('aria-pressed',String(companionMode(getPlayer().explorerMode)===mode));
   option.onclick=()=>{if(getPlayer().explorerDrone)onChange(mode);closeMenu();render();button.focus()};
   return option;
  }));
  menu.hidden=false;button.setAttribute('aria-expanded','true');
  const anchor=button.getBoundingClientRect(),width=menu.offsetWidth,height=menu.offsetHeight;
  menu.style.left=Math.max(8,Math.min(anchor.right-width,innerWidth-width-8))+'px';
  menu.style.top=(anchor.bottom+height+8<=innerHeight?anchor.bottom+4:Math.max(8,anchor.top-height-4))+'px';
 }
 let rendered='';
 function render(){
  const player=getPlayer(),mode=companionMode(player.explorerMode),stamp=String(!!player.explorerDrone)+mode;
  if(rendered===stamp)return;
  rendered=stamp;button.hidden=!player.explorerDrone;button.style.display=player.explorerDrone?'':'none';
  if(!player.explorerDrone)closeMenu();
  if(!cockpit)button.textContent='🛰 '+LABELS[mode];
  button.setAttribute('aria-label','Modo de la mascota: '+LABELS[mode]+(cockpit?'. Elegir modo.':'. Tocar para cambiar.'));
  button.title='Mascota · '+LABELS[mode];
 }
 button.onclick=()=>{
  const player=getPlayer();if(!player.explorerDrone)return;
  if(menu){if(menu.hidden)openMenu();else closeMenu();return}
  const next=COMPANION_MODES[(COMPANION_MODES.indexOf(companionMode(player.explorerMode))+1)%COMPANION_MODES.length];
  onChange(next);render();
 };
 button.addEventListener('touchstart',event=>{event.preventDefault();event.stopPropagation();button.click()},{passive:false});
 parent?.append(button);render();return {render};
}
