// Presentation only: input handlers and combat authority stay with the game.
export const COMBAT_ART=Object.freeze({fire:'#ff563c',missile:'#ffb84b',overload:'#ffc75c',interference:'#c38aff',shield:'#65dfff',fury:'#ff5649',paralyze:'#ffe366',luck:'#7be94c',transfer:'#f178dd'});
const ART_SCALE={fire:1.006,missile:1.094,overload:1.038,interference:1.015,shield:1.073,fury:1.033,paralyze:1.006,luck:1.173,transfer:1.043};
export function cooldownProgress(remaining,duration){
 const left=Math.max(0,Number(remaining)||0),total=Math.max(0,Number(duration)||0);
 return total>0?Math.max(0,Math.min(1,1-left/total)):1;
}
export function setCombatArtwork(button,id){
 if(!button)return;const art=Object.hasOwn(COMBAT_ART,id)?id:'overload';
 button.classList.add('combat-button');button.style.setProperty('--combat-accent',COMBAT_ART[art]);
 if(button.dataset.combatArt===art)return;
 button.style.setProperty('--combat-art-scale',String(ART_SCALE[art]||1));button.dataset.combatArt=art;let image=button.querySelector('.combat-art');
 if(!image){image=document.createElement('img');image.className='combat-art';image.alt='';image.setAttribute('aria-hidden','true');image.draggable=false;button.prepend(image)}
 image.src=new URL('../assets/combat-buttons/'+art+'.webp',import.meta.url).href;
}
export function presentCombatButton(button,{art,remaining=0,duration=0,active=false,blocked=false,pressed=false}={}){
 if(!button)return;if(art)setCombatArtwork(button,art);
 const progress=cooldownProgress(remaining,duration);
 button.style.setProperty('--combat-ready',String(progress));
 button.classList.toggle('combat-cooling',remaining>0&&!active);
 button.classList.toggle('combat-active',!!active);button.classList.toggle('combat-blocked',!!blocked);button.classList.toggle('combat-pressed',!!pressed);
 const ready=remaining<=0&&!blocked;
 if(ready&&button.dataset.combatWasReady==='false'){
  button.classList.remove('combat-ready-flash');void button.offsetWidth;button.classList.add('combat-ready-flash');
 }
 button.dataset.combatWasReady=String(ready);
}
export function shipCombatArtwork(role){return role==='titan'?'shield':role==='espectro'?'fury':'overload'}
