// Player-adjustable PvP controls. Editor uses inert previews, never activates weapons.
export function mountPvpControlEditor({realm,isHangarOpen}){
 const ids=['fireBtn','skillBtn','classAbilityBtn','pvpSkillButton0','pvpSkillButton1'];
 const defaults=[[92,84],[82,91],[93,63],[79,66],[69,72]];
 const key='mundoAbierto.pvpControls.'+realm;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let positions=defaults.map(p=>[...p]);
 try{const data=JSON.parse(localStorage.getItem(key));if(Array.isArray(data)&&data.length===ids.length&&data.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))positions=data.map(p=>[clamp(p[0],5,95),clamp(p[1],10,94)])}catch{}
 const buttons=()=>ids.map(id=>document.getElementById(id));
 function apply(){
  buttons().forEach((button,i)=>{if(!button)return;button.style.setProperty('position','fixed','important');button.style.setProperty('left',positions[i][0]+'vw','important');button.style.setProperty('top',positions[i][1]+'vh','important');button.style.setProperty('right','auto','important');button.style.setProperty('bottom','auto','important');button.style.setProperty('transform','translate(-50%,-50%)','important');button.style.setProperty('z-index','66','important')});
 }
 const home=document.getElementById('hangarHomeView');
 if(!home)return {apply};
 const section=document.createElement('section');section.id='pvpControlEditorEntry';
 section.innerHTML='<h3>🎮 Controles del duelo</h3><p>Arrastra los botones para organizarlos. Se guardan por separado para pruebas y partida normal.</p><button type="button" id="pvpEditControls">Acomodar botones</button>';
 home.append(section);
 const overlay=document.createElement('div');overlay.id='pvpControlEditor';overlay.hidden=true;
 overlay.innerHTML='<div class="pvp-editor-toolbar"><strong>Editar controles PvP</strong><span>Arrastra cada botón a su posición</span><button type="button" data-action="reset">Restablecer</button><button type="button" data-action="cancel">Cancelar</button><button type="button" data-action="save">Guardar</button></div><div class="pvp-editor-canvas" aria-label="Vista previa de botones"></div>';
 document.body.append(overlay);
 const canvas=overlay.querySelector('.pvp-editor-canvas');
 let draft=[],drag=null;
 function draw(){canvas.replaceChildren();ids.forEach((id,i)=>{const original=document.getElementById(id),b=document.createElement('button');b.type='button';b.className='pvp-editor-control'+(i===0?' primary':'');b.textContent=i===0?'🔥':i===1?'🚀':i===2?'🛡️':(original?.querySelector('span')?.textContent||'✨');b.setAttribute('aria-label',['Disparar','Misil','Habilidad de nave','Habilidad PvP 1','Habilidad PvP 2'][i]);b.style.left=draft[i][0]+'%';b.style.top=draft[i][1]+'%';b.dataset.index=i;b.addEventListener('pointerdown',e=>{e.preventDefault();drag={i,pointer:e.pointerId};b.setPointerCapture(e.pointerId)});b.addEventListener('pointermove',e=>{if(!drag||drag.i!==i||drag.pointer!==e.pointerId)return;const r=canvas.getBoundingClientRect();draft[i]=[clamp((e.clientX-r.left)/r.width*100,5,95),clamp((e.clientY-r.top)/r.height*100,10,94)];b.style.left=draft[i][0]+'%';b.style.top=draft[i][1]+'%'});b.addEventListener('pointerup',()=>{drag=null});b.addEventListener('pointercancel',()=>{drag=null});canvas.append(b)})}
 const open=()=>{if(!isHangarOpen())return;draft=positions.map(p=>[...p]);draw();overlay.hidden=false};
 const close=()=>{overlay.hidden=true;drag=null};
 section.querySelector('#pvpEditControls').onclick=open;
 overlay.querySelector('[data-action="reset"]').onclick=()=>{draft=defaults.map(p=>[...p]);draw()};
 overlay.querySelector('[data-action="cancel"]').onclick=close;
 overlay.querySelector('[data-action="save"]').onclick=()=>{positions=draft.map(p=>[...p]);try{localStorage.setItem(key,JSON.stringify(positions))}catch{}apply();close()};
 addEventListener('resize',apply);
 apply();
 return {apply};
}
