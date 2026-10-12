export function selectCompanionTask({manualActive,manualTarget,threats,now,isValid}){
 if(manualActive)return {mode:'attack',target:isValid(manualTarget)?manualTarget:null};
 let target=null,latest=-Infinity;
 for(const [enemy,lastAttack] of threats){if(now-lastAttack>4.5||!isValid(enemy))continue;if(lastAttack>latest){latest=lastAttack;target=enemy}}
 return target?{mode:'defend',target}:{mode:'collect',target:null};
}
