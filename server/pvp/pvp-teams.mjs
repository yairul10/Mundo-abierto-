export const PVP_MODES=Object.freeze({'1v1':{capacity:2,teamSize:1},'2v2':{capacity:4,teamSize:2},'5v5':{capacity:10,teamSize:5}});
export const validPvpMode=mode=>Object.hasOwn(PVP_MODES,mode);
export const modeRules=match=>PVP_MODES[match?.mode]||PVP_MODES['1v1'];
export const teamForSlot=slot=>slot%2?'b':'a';
export const spawnForSlot=(slot,match)=>[(Math.floor(slot/2)-(modeRules(match).teamSize-1)/2)*520,120,slot%2?-700:700];
export const opponents=(a,b)=>!!a&&!!b&&a.id!==b.id&&(!a.team||!b.team||a.team!==b.team);
export const pvpRoomName=(realm,code,mode='1v1')=>'arena-'+(validPvpMode(mode)?mode:'1v1')+'-'+(realm==='test'?'test':'normal')+'-'+code;
