export const COOP_STOPS=Object.freeze({colossi:'Después de los 3 Colosos',inferno:'Después de Inferno Pro',titan:'Después del Gran Titán Pro',all:'Mapa completo (Titán del Nexo)'});
const stages=[['pvp-coloso-1','pvp-coloso-2','pvp-coloso-3'],['coop-inferno-pro'],['pvp-gran-titan']];
export function coopStopReached(snapshot,stop='all'){
 if(!snapshot?.room)return false;if(stop==='all')return snapshot.room.status==='completed';
 const n=['colossi','inferno','titan'].indexOf(stop);if(n<0)return false;
 return stages.slice(0,n+1).flat().every(id=>snapshot.enemies?.some(e=>e.id===id&&Number.isFinite(e.hp)&&e.hp<=0));
}
export function coopRepeatChoice({roomType='private',roomCode,stop='all'}={}){
 if(roomType!=='common')return {action:'create'};
 return {action:'common',...(typeof roomCode==='string'&&/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)?{excludeCode:roomCode}:{}),autoStop:Object.hasOwn(COOP_STOPS,stop)?stop:'all'};
}
export function shouldUseCoopAbility({enabled=true,canFight=false,safe=false,engaged=false,retreating=false,paralyzed=false,remaining=0,active=0}={}){
 return enabled&&canFight&&!safe&&remaining<=0&&active<=0&&(engaged||retreating||paralyzed);
}
