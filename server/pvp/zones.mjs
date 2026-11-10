export const COOP_CORRIDOR=Object.freeze({radius:1600,centerY:120,start:1200,end:-12500,baseEnd:-650});
export function constrainCorridor(pos,margin=60){
 const r=Math.hypot(pos[0],pos[1]-COOP_CORRIDOR.centerY),limit=COOP_CORRIDOR.radius-margin;
 if(r>limit){pos[0]*=limit/r;pos[1]=COOP_CORRIDOR.centerY+(pos[1]-COOP_CORRIDOR.centerY)*limit/r}
 pos[2]=Math.max(COOP_CORRIDOR.end+margin,Math.min(COOP_CORRIDOR.start-margin,pos[2]));return pos;
}
export const ZONES=Object.freeze({base:650,pve:3275,edge:5900});
export const radial=position=>Math.hypot(position?.[0]||0,position?.[2]||0);
export const zoneOf=p=>p.corridor||p.rules?.corridor?(p.pos[2]>=COOP_CORRIDOR.baseEnd?'base':'pve'):radial(p.pos)<=ZONES.base?'base':radial(p.pos)<=ZONES.pve?'pve':'hostile';
export function sameCombatZone(a,b){return zoneOf(a)===zoneOf(b)&&zoneOf(a)!=='base'}
export function constrainEnemy(b){
 if(b.rules?.corridor){constrainCorridor(b.pos,Math.min(300,b.hitRadius||50)+25);b.pos[2]=Math.min(-900,b.pos[2]);return}
 const zone=b.rules?.zone;if(!zone)return;
 const margin=Math.min(300,b.hitRadius||50)+25,min=zone==='pve'?ZONES.base+margin:ZONES.pve+margin,max=(zone==='pve'?ZONES.pve:ZONES.edge)-margin;
 const r=radial(b.pos)||1,next=Math.max(min,Math.min(max,r));b.pos[0]*=next/r;b.pos[2]*=next/r;
}
