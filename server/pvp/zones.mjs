export const ZONES=Object.freeze({base:650,pve:1800,edge:2950});
export const radial=position=>Math.hypot(position?.[0]||0,position?.[2]||0);
export const zoneOf=p=>radial(p.pos)<=ZONES.base?'base':radial(p.pos)<=ZONES.pve?'pve':'hostile';
export function sameCombatZone(a,b){return zoneOf(a)===zoneOf(b)&&zoneOf(a)!=='base'}
export function constrainEnemy(b){
 const zone=b.rules?.zone;if(!zone)return;
 const margin=Math.min(300,b.hitRadius||50)+25,min=zone==='pve'?ZONES.base+margin:ZONES.pve+margin,max=(zone==='pve'?ZONES.pve:ZONES.edge)-margin;
 const r=radial(b.pos)||1,next=Math.max(min,Math.min(max,r));b.pos[0]*=next/r;b.pos[2]*=next/r;
}
