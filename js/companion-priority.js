export const COMPANION_MODES=Object.freeze(['both','attack','collect']);
export const companionMode=value=>COMPANION_MODES.includes(value)?value:'both';
export function selectCompanionTask({manualActive,manualTarget,threats,now,isValid,protectedZone=false,mode='both'}){
 const selected=companionMode(mode);
 if(selected==='collect')return {mode:'collect',target:null};
 if(protectedZone)return {mode:selected==='attack'?'idle':'collect',target:null};
 if(manualActive)return {mode:'attack',target:isValid(manualTarget)?manualTarget:null};
 let target=null,latest=-Infinity;
 for(const [enemy,lastAttack] of threats){if(now-lastAttack>4.5||!isValid(enemy))continue;if(lastAttack>latest){latest=lastAttack;target=enemy}}
 return target?{mode:'defend',target}:{mode:selected==='attack'?'idle':'collect',target:null};
}
