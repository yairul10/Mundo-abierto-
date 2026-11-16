// One pointer owns movement; firing/aiming fingers keep their independent inputs.
export function mountFloatingJoystick({element,stick,onMove,canMove=()=>true,doc=document,win=window}){
 const excluded='button,a,input,textarea,select,label,[role="button"],[contenteditable],dialog,.panel,#hud,#radarWidget,#worldPanel,#worldTarget,#worldInvite,#pvpSkills,.world-nameplate,#combatControls,#zoomControls,#hangarPanel,#shopPanel,#systemMapOverlay,#pvpControlEditor,#farmAutoMenu,#chatPanel,#worldChat,#questTracker,#targetInfo,#flightNotices,#worldLoading,#orientationGate';
 const style=doc.createElement('style');style.textContent='#joystick[data-floating]{opacity:0!important;pointer-events:none!important}#joystick[data-floating][data-active]{opacity:.65!important}';doc.head.appendChild(style);element.setAttribute('data-floating','');
 let pointer=null,center=null,saved=null,capture=null;
 const fields=['position','left','top','right','bottom','transform'];
 function reset(){
  const id=pointer;pointer=null;center=null;onMove(0,0);stick.style.transform='';element.removeAttribute('data-active');
  if(saved){for(const [key,value,priority] of saved){if(value)element.style.setProperty(key,value,priority);else element.style.removeProperty(key)}saved=null}
  try{if(capture?.hasPointerCapture?.(id))capture.releasePointerCapture(id)}catch{}capture=null;
 }
 const consume=e=>{if(e.cancelable)e.preventDefault();e.stopPropagation()};
 function down(e){
  if(pointer!==null||e.button!==0||e.clientX<0||e.clientX>=win.innerWidth/2||!canMove()||e.target.closest?.(excluded))return;
  const r=element.getBoundingClientRect();pointer=e.pointerId;center={x:e.clientX,y:e.clientY,width:r.width||120,height:r.height||120};
  saved=fields.map(key=>[key,element.style.getPropertyValue(key),element.style.getPropertyPriority(key)]);
  for(const [key,value] of Object.entries({position:'fixed',left:center.x+'px',top:center.y+'px',right:'auto',bottom:'auto',transform:'translate(-50%,-50%)'}))element.style.setProperty(key,value,'important');
  element.setAttribute('data-active','');stick.style.transform='';onMove(0,0);consume(e);
  capture=e.target;try{capture.setPointerCapture?.(pointer)}catch{}
 }
 function move(e){if(e.pointerId!==pointer)return;if(!canMove()){reset();return}consume(e);const clamp=v=>Math.max(-1,Math.min(1,v)),x=clamp((e.clientX-center.x)/(center.width*.38)),y=clamp((e.clientY-center.y)/(center.height*.38));onMove(x,-y);stick.style.transform='translate('+x*38+'px,'+y*38+'px)'}
 function up(e){if(e.pointerId!==pointer)return;consume(e);reset()}
 const options={capture:true,passive:false};
 for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])doc.addEventListener(name,handler,options);
 const visibility=()=>{if(doc.hidden)reset()};doc.addEventListener('visibilitychange',visibility);
 for(const name of ['blur','pagehide','resize'])win.addEventListener(name,reset);
 // Opening a menu must also stop a finger that was already held down.
 const observer=win.MutationObserver?new win.MutationObserver(()=>{if(pointer!==null&&!canMove())reset()}):null;observer?.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['class','hidden','open']});
 return {reset,dispose(){reset();observer?.disconnect();for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])doc.removeEventListener(name,handler,options);doc.removeEventListener('visibilitychange',visibility);for(const name of ['blur','pagehide','resize'])win.removeEventListener(name,reset);element.removeAttribute('data-floating');style.remove()}};
}
