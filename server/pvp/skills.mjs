// PvP powers: the server owns equipment, expiry and cooldown timestamps.
export const PVP_SKILLS = Object.freeze({
 interference:{name:'Interferencia',icon:'📡',duration:3000,cooldown:30000,description:'Impide la fijación automática y rompe el guiado de misiles durante 3 s. Los disparos manuales pueden acertar.'},
 instantShield:{name:'Escudo instantáneo',icon:'🛡️',duration:3000,cooldown:30000,description:'Reduce a la mitad el daño recibido durante 3 s.'},
 fury:{name:'Furia',icon:'🔥',duration:3000,cooldown:30000,description:'Duplica el daño causado durante 3 s.'},
 paralyze:{name:'Paralizado',icon:'⚡',duration:3000,cooldown:30000,description:'Inmoviliza al rival del duelo durante 3 s a un máximo de 1200 m. Puede seguir disparando.'},
 luck:{name:'Suerte',icon:'🍀',duration:0,cooldown:30000,description:'Dispara de nuevo una ráfaga de misiles, aunque estuvieran recargando.'},
 transfer:{name:'Transferencia',icon:'💚',duration:5000,cooldown:30000,description:'Recupera como vida el 50 % del daño real causado durante 5 s, sin superar el casco máximo.'},
});
export const DEFAULT_SKILLS = ['interference','instantShield'];
export function validSkills(ids){return Array.isArray(ids)&&ids.length===2&&new Set(ids).size===2&&ids.every(id=>typeof id==='string'&&Object.hasOwn(PVP_SKILLS,id));}
export function equippedSkills(p){return validSkills(p.equippedSkills)?p.equippedSkills:[...DEFAULT_SKILLS];}
export function clearSkills(p){p.skillUntil={};p.skillReadyAt={};p.paralyzedUntil=0;}
export const skillActive=(p,id,now)=>(p?.skillUntil?.[id]||0)>now;
export function activateSkill(p,id,now){
 if(!Object.hasOwn(PVP_SKILLS,id)||!equippedSkills(p).includes(id)||p.hp<=0||(p.skillReadyAt?.[id]||0)>now)return false;
 p.skillUntil||={};p.skillReadyAt||={};p.skillUntil[id]=now+PVP_SKILLS[id].duration;p.skillReadyAt[id]=now+PVP_SKILLS[id].cooldown;return true;
}
