import {presentCombatButton} from './combat-buttons.js?v=389';
// Two extra PvP powers. Rules and timestamps come from the server snapshot.
export function mountPvpSkills({tools,getState,canUse,send,isHangarOpen,isPreparing=()=>false,equipmentHost=null,storage,key}){
 let saved=['interference','instantShield'];try{const value=JSON.parse(storage.getItem(key));if(Array.isArray(value)&&value.length===2)saved=value}catch{}
 const equipment=document.createElement('fieldset');equipment.id='pvpSkillEquipment';equipment.hidden=true;const legend=document.createElement('legend');legend.textContent=equipmentHost?'Habilidades PvP · Elige dos':'Habilidades PvP · Elige dos gratis en el hangar';equipment.append(legend);(equipmentHost||document.getElementById('hangarHomeView')||tools).append(equipment);
 const bar=document.createElement('section');bar.id='pvpSkills';bar.hidden=true;bar.setAttribute('aria-label','Habilidades PvP');document.body.append(bar);const condition=document.createElement('p');condition.id='pvpCondition';condition.setAttribute('role','status');condition.hidden=true;bar.append(condition);
 const slots=[0,1].map(i=>{const label=document.createElement('label'),select=document.createElement('select'),detail=document.createElement('small'),button=document.createElement('button'),icon=document.createElement('span'),name=document.createElement('span'),timer=document.createElement('small');label.textContent='Habilidad '+(i+1);select.id='pvpSkillSelect'+i;select.setAttribute('aria-label','Habilidad PvP '+(i+1));label.append(select);equipment.append(label,detail);icon.className='combat-legacy-icon';name.className='combat-name';timer.className='combat-timer';button.id='pvpSkillButton'+i;button.disabled=true;button.type='button';button.append(icon,name,timer);bar.append(button);
 function activate(){const {state,me}=getState();if(state?.rules?.cooperative||state?.rules?.pvpSkills===false)return;if(canUse()&&!isHangarOpen()&&!button.disabled)send({type:'pvpSkill',skill:me.equippedSkills[i]})}
 button.onclick=activate;button.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();activate()},{passive:false});
 select.onchange=()=>{if(getState().state?.rules?.cooperative||getState().state?.rules?.pvpSkills===false)return;const ids=slots.map(s=>s.select.value);if(ids[0]===ids[1]){const other=slots[1-i];other.select.value=Object.keys(getState().state.rules.skills).find(id=>id!==ids[i]);ids[1-i]=other.select.value}send({type:'skills',skills:ids})};return {select,detail,button,icon,name,timer};});
 let stamp='';
 function update(){const {state,me,now}=getState(),definitions=state?.rules?.skills;bar.hidden=!me||isHangarOpen()||isPreparing();bar.classList.toggle('paralyzed',!!me&&(me.paralyzedUntil||0)>now);equipment.hidden=!definitions||!(isHangarOpen()||isPreparing());const paralyzed=Math.max(0,(me?.paralyzedUntil||0)-now);condition.hidden=!paralyzed;condition.textContent=paralyzed?'Paralizado · '+Math.ceil(paralyzed/1000)+' s':'';
 const disabled=state?.rules?.cooperative===true||state?.rules?.pvpSkills===false;
 for(const slot of slots)slot.button.hidden=disabled;
 if(disabled){equipment.hidden=true;bar.hidden=!me||isHangarOpen()||!paralyzed;bar.setAttribute('aria-label','Estado de la nave');for(const slot of slots){slot.button.disabled=true;slot.select.disabled=true}return}
 bar.setAttribute('aria-label','Habilidades PvP');
 if(!me||!definitions){for(const s of slots)s.button.disabled=true;return}
 const entries=Object.entries(definitions),nextStamp=JSON.stringify(entries);
 if(stamp!==nextStamp){stamp=nextStamp;for(const s of slots){s.select.replaceChildren();for(const [id,rule]of entries){const o=document.createElement('option');o.value=id;o.textContent=rule.icon+' '+rule.name;s.select.append(o)}}}
 const ids=me.equippedSkills||saved;try{if(JSON.stringify(ids)!==JSON.stringify(saved)){storage.setItem(key,JSON.stringify(ids));saved=[...ids]}}catch{}
 const inBase=Math.hypot(...me.pos)<=state.rules.safeRadius;
 for(let i=0;i<slots.length;i++){const s=slots[i],id=ids[i],rule=definitions[id];if(!rule)continue;s.select.value=id;s.select.disabled=!me.protected||!(inBase||isPreparing())||!(isHangarOpen()||isPreparing());s.detail.textContent=rule.description+' Recarga: '+rule.cooldown/1000+' s.';const active=Math.max(0,(me.skillUntil?.[id]||0)-now),wait=Math.max(0,(me.skillReadyAt?.[id]||0)-now);s.icon.textContent='';presentCombatButton(s.button,{art:({instantShield:'shield'})[id]||id,remaining:wait/1000,duration:rule.cooldown/1000,active:active>0,blocked:!canUse()||isHangarOpen()});s.name.textContent=rule.name;s.timer.textContent=active?'Activa '+Math.ceil(active/1000)+' s':wait?Math.ceil(wait/1000)+' s':'';s.timer.style.display=s.timer.textContent?'':'none';s.button.disabled=!canUse()||wait>0||isHangarOpen();s.button.classList.toggle('active',active>0);s.button.title=rule.description;s.button.setAttribute('aria-label',rule.name+' · '+(s.timer.textContent||'Lista'))}
 }
 addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;const i=['Digit1','Digit2'].indexOf(e.code);if(i>=0&&!slots[i].button.disabled){e.preventDefault();slots[i].button.click()}});
 return {update,get saved(){return [...saved]}};
}



