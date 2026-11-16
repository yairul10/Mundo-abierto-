// Nearby-base shortcuts share the existing menu actions and landing control.
export function mountBaseActions({root,dock,pvp,hall,onPvp,onHall}){
 let canOpen=false;
 root.addEventListener('pointerdown',event=>event.stopPropagation());
 const open=action=>()=>{if(canOpen)action()};
 pvp.addEventListener('click',open(onPvp));hall.addEventListener('click',open(onHall));
 return {update({visible=false,landing=false,canLand=false,canUseMenus=true}={}){
  const shown=visible||landing;
  root.classList.toggle('hidden',!shown);
  canOpen=visible&&!landing&&canUseMenus;
  dock.classList.toggle('hidden',!shown);dock.disabled=landing||!canLand;
  pvp.hidden=hall.hidden=landing;
  pvp.disabled=hall.disabled=!canOpen;
 }};
}
