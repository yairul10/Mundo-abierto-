// A small wall-clock budget tolerates bunched WebSocket deliveries without
// letting a client simulate unlimited time or accumulate time while idle.
export function movementDuration(p,input,now){
 const elapsed=Math.max(0,(now-p.lastInput)/1000);
 p.lastInput=now;
 if(!Number.isFinite(input.dt))return Math.min(.15,elapsed); // older APKs
 const available=Math.min(.75,(p.movementCredit??.15)+elapsed);
 const dt=Math.min(.15,Math.max(0,input.dt),available);
 p.movementCredit=available-dt;
 return dt;
}
