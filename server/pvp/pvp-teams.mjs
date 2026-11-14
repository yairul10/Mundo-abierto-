export const PVP_MODES=Object.freeze({'1v1':{capacity:2,teamSize:1},'2v2':{capacity:4,teamSize:2},'5v5':{capacity:10,teamSize:5},'arena20':{capacity:20,teamSize:1,freeForAll:true}});
export const validPvpMode=mode=>Object.hasOwn(PVP_MODES,mode);
export const modeRules=match=>PVP_MODES[match?.mode]||PVP_MODES['1v1'];
export const teamForSlot=(slot,match)=>modeRules(match).freeForAll?'pilot-'+slot:slot%2?'b':'a';
export const arenaRadius=match=>match?.mode==='arena20'?8000:match?.mode==='5v5'?3000:2200;
export const spawnForSlot=(slot,match)=>modeRules(match).freeForAll?[Math.sin(slot*Math.PI/10)*6000,120,Math.cos(slot*Math.PI/10)*6000]:[(Math.floor(slot/2)-(modeRules(match).teamSize-1)/2)*520,120,slot%2?-700:700];
export const opponents=(a,b)=>!!a&&!!b&&a.id!==b.id&&(!a.team||!b.team||a.team!==b.team);
export const pvpRoomName=(realm,code,mode='1v1')=>'arena-'+(validPvpMode(mode)?mode:'1v1')+'-'+(realm==='test'?'test':'normal')+'-'+code;
