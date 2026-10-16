import {PVP_SKILLS,equippedSkills,validSkills,clearSkills,activateSkill} from './skills.mjs';
import {makeCombatPlayer,stepCombat,volley,ability} from './combat.mjs';
export const WORLD={radius:3000,safeRadius:650,openCombat:true,protectionDelay:5000,capacity:24,skills:PVP_SKILLS,portal:[0,120,850],spawn:[0,120,0]};
export const SHIPS={aurora:[1,1,1,1],titan:[1.8,.85,1.5,.75],espectro:[.7,1.35,.65,1.4],segadora:[1.1,1.85,.95,1.05],bastion:[2.5,1,2,.85],centella:[.95,1.1,.85,1.85]};
export const safe=p=>Math.hypot(...p.pos)<=WORLD.safeRadius;
export const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
export function importRoster(raw){
 const roster={};for(const id of Object.keys(SHIPS)){const q=raw?.[id];if(q&&typeof q==='object'&&!Array.isArray(q))roster[id]={...q,shipId:id}}
 if(!Object.keys(roster).length)roster.aurora={shipId:'aurora',level:1,maxHp:100,maxEnergy:100,attack:10,defense:5,speed:220};return roster;
}
export function equip(p,id){
 if(!Object.hasOwn(SHIPS,id)||!Object.hasOwn(p.roster||{},id))return false;
 const raw=p.roster[id];makeCombatPlayer(p,raw);const q=p.profile;
 // Multiply the original offline hull once; never multiply a previous PvP snapshot.
 q.offlineMaxHp=q.maxHp;q.maxHp=q.offlineMaxHp*20;q.hp=q.maxHp;
 q.droneFormation=q.droneCount>0&&['fan','shield','spear','fortress','hunter','drive','recovery'].includes(raw.droneFormation)?raw.droneFormation:'fan';
 q.baseSpeed=q.speed;q.speed*=q.droneFormation==='drive'?1.12:1;
 q.droneDamage=q.droneFormation==='spear'?1.2:1;q.resistance=(q.droneFormation==='shield'?.85:1)*(raw.boosters?.resistance===true?.85:1);q.damageBonus=raw.boosters?.damage===true?1.15:1;
 q.droneRange=q.droneFormation==='hunter'?1380:1200;q.repairBonus=q.droneFormation==='recovery'?1.25:1;q.explorerRange=450+Math.max(1,Math.min(10,Number(raw.explorerRangeLevel)||1))*100;
 p.hp=q.maxHp;p.energy=q.maxEnergy;p.abilityUntil=0;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;return true;
}
export function reset(p,respawn=false){clearSkills(p);p.hp=p.profile.maxHp;p.energy=p.profile.maxEnergy;p.abilityUntil=0;p.firing=false;p.duelId=null;p.revision=(p.revision||0)+1;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;if(respawn)p.pos=[...(p.spawn||WORLD.spawn)];p.baseInside=safe(p);p.baseEnteredAt=p.baseInside?-WORLD.protectionDelay:null;p.lastDamagedBy=null;}
// Fixed entry deadline, independent from attacks, damage and skill activation.
export function updateProtection(p,now){
 const inside=safe(p);
 if(p.baseInside===undefined){p.baseInside=inside;p.baseEnteredAt=inside?now-WORLD.protectionDelay:null}
 else if(inside&&!p.baseInside)p.baseEnteredAt=now;
 else if(!inside)p.baseEnteredAt=null;
 p.baseInside=inside;return protectedAt(p,now);
}
export const protectedAt=(p,now)=>!!p&&safe(p)&&(p.baseEnteredAt===undefined||p.baseEnteredAt===null||now>=p.baseEnteredAt+WORLD.protectionDelay);
export const combatEligible=(p,now)=>!!p&&p.connected&&p.hp>0&&!p.hangar&&!protectedAt(p,now);
export const canDamage=(owner,target,now)=>combatEligible(owner,now)&&(!target||target.id!==owner.id&&combatEligible(target,now));
export function advance(s,now){
 s.invites=[];s.duels=[];s.events||=[];s.bullets||=[];
 for(const p of s.players){p.duelId=null;updateProtection(p,now)}
 const combat={status:'active',players:s.players,bullets:s.bullets,simTime:s.simTime??now,canDamage};
 stepCombat(combat,now);s.bullets=combat.bullets;s.simTime=combat.simTime;
 for(const p of s.players)if(p.connected&&p.hp<=0){
  const winner=p.lastDamagedBy||null;s.bullets=s.bullets.filter(b=>b.owner!==p.id&&b.target!==p.id);
  reset(p,true);s.events.push({type:'destroyed',id:crypto.randomUUID(),victim:p.id,winner,time:now});
 }
}
// Old invitation clients cannot re-enable duels in the open arena.
export const invite=()=> 'open_pvp';
export const reply=()=> 'open_pvp';
export function attack(s,p,m,now){
 updateProtection(p,now);if(!combatEligible(p,now))return null;
 const clean={...m,shots:Array.isArray(m.shots)?m.shots.map(x=>({...x,crit:Math.random()<.15+(p.profile.special.crit||0)*.01})):null};
 const target=s.players.find(x=>x.id===m.targetId&&canDamage(p,x,now));
 if(m.weapon==='explorer'&&(!target||(target.skillUntil?.interference||0)>now))return null;
 const combat={players:s.players,bullets:s.bullets||[],canDamage};const bullets=volley(combat,p,clean,now);s.bullets=combat.bullets;return bullets;
}
export function useAbility(s,p,now){updateProtection(p,now);if(!combatEligible(p,now)||!ability(p,now))return false;if(p.profile.shipId==='centella')p.paralyzedUntil=0;return true}

export function openHangar(s,p,now=Date.now()){
 updateProtection(p,now);if(p.duelId||!safe(p)||!protectedAt(p,now))return 'base_only';p.hangar=true;p.firing=false;s.invites=s.invites.filter(i=>i.from!==p.id&&i.to!==p.id);return null;
}
export function applyHangarLoadout(s,p,raw,id,now=Date.now()){
 if(!p.hangar||p.duelId||!safe(p)||!protectedAt(p,now))return 'base_only';
 const updated={...p,roster:importRoster(raw)};if(!equip(updated,id))return 'invalid_ship';
 Object.assign(p,updated);p.hangar=false;reset(p);return null;
}

export function setSkills(s,p,ids,now=Date.now()){
 updateProtection(p,now);if(p.duelId||!safe(p)||!protectedAt(p,now))return 'base_only';
 if(!validSkills(ids))return 'invalid_skills';
 p.equippedSkills=[...ids];clearSkills(p);return null;
}
export function usePvpSkill(s,p,id,now,targetId){
 updateProtection(p,now);if(!combatEligible(p,now))return 'protected';
 if(!Object.hasOwn(PVP_SKILLS,id)||!equippedSkills(p).includes(id))return 'invalid_skills';
 const other=s.players.find(x=>x.id===targetId&&canDamage(p,x,now));
 if(id==='paralyze'&&(!other||distance(p,other)>1200))return 'too_far';
 if(!activateSkill(p,id,now))return 'skill_cooldown';
 if(id==='paralyze')other.paralyzedUntil=now+3000;
 if(id==='luck')p.last_missile=now-7000;
 if(id==='interference')for(const bullet of s.bullets||[])if(bullet.target===p.id)bullet.target=null;
 return null;
}
