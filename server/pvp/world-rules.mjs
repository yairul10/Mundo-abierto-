import {ZONES,zoneOf,sameCombatZone,radial} from './zones.mjs';
import {inviteDuel,replyDuel,tickDuels,duelFor,finishDuel} from './duels.mjs';
import {awardKill} from './pvp-results.mjs';
import {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage} from './arena-enemies.mjs';
import {PVP_SKILLS,equippedSkills,validSkills,clearSkills,activateSkill} from './skills.mjs';
import {makeCombatPlayer,stepCombat,volley,ability} from './combat.mjs';
export const WORLD={formationSwitch:true,radius:ZONES.edge,safeRadius:ZONES.base,pveRadius:ZONES.pve,openCombat:true,protectionDelay:5000,capacity:24,skills:PVP_SKILLS,portal:[0,120,850],spawn:[0,120,0]};
export const SHIPS={adminpod:[15,1.6,1,1.7],azote:[1.2,1.95,1.05,1.15],egida:[2.6,1.1,2.1,.95],vertigo:[1.05,1.2,.95,1.95],obsidian:[1.9,1.75,1.6,1.2],aurora:[1,1,1,1],titan:[1.8,.85,1.5,.75],espectro:[.7,1.35,.65,1.4],segadora:[1.1,1.85,.95,1.05],bastion:[2.5,1,2,.85],centella:[.95,1.1,.85,1.85]};
export const safe=p=>zoneOf(p)==='base';
export const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
export function importRoster(raw){
 const roster={};for(const id of Object.keys(SHIPS)){const q=raw?.[id];if(q&&typeof q==='object'&&!Array.isArray(q))roster[id]={...q,shipId:id}}
 if(!Object.keys(roster).length)roster.aurora={shipId:'aurora',level:1,maxHp:100,maxEnergy:100,attack:10,defense:5,speed:220};return roster;
}
export function equip(p,id){
 if(id==='adminpod'&&(!p.adminShipAllowed||p.clientVersion<4))return false;
 if(!Object.hasOwn(SHIPS,id)||!Object.hasOwn(p.roster||{},id==='adminpod'?'aurora':id))return false;
 const raw=p.roster[id==='adminpod'?'aurora':id];makeCombatPlayer(p,{...raw,shipId:id});const q=p.profile;
 // Derive admin stats from the ordinary Aurora profile (PvP Aurora uses base ×0.5).
 if(id==='adminpod'){q.maxHp*=30;q.attack*=3.2;q.defense*=2;q.speed*=3.4;}
 // Multiply the original offline hull once; never multiply a previous PvP snapshot.
 q.offlineMaxHp=q.maxHp;q.maxHp=q.offlineMaxHp*20;q.hp=q.maxHp;
 q.droneFormation=q.droneCount>0&&['fan','shield','spear','fortress','hunter','drive','recovery'].includes(raw.droneFormation)?raw.droneFormation:'fan';
 q.baseSpeed=q.speed;q.speed*=q.droneFormation==='drive'?1.12:1;
 q.droneDamage=q.droneFormation==='spear'?1.2:1;q.resistance=(q.droneFormation==='shield'?.85:1)*(raw.boosters?.resistance===true?.85:1);q.damageBonus=raw.boosters?.damage===true?1.15:1;
 q.droneRange=q.droneFormation==='hunter'?1380:1200;q.repairBonus=q.droneFormation==='recovery'?1.25:1;q.explorerRange=450+Math.max(1,Math.min(10,Number(raw.explorerRangeLevel)||1))*100;
 p.hp=q.maxHp;p.energy=q.maxEnergy;p.abilityUntil=0;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;return true;
}
export function reset(p,respawn=false){clearSkills(p);p.hp=p.profile.maxHp;p.energy=p.profile.maxEnergy;p.abilityUntil=0;p.firing=false;p.duelId=null;p.revision=(p.revision||0)+1;for(const key of ['laser','missile','explorer'])p['last_'+key]=0;if(respawn)p.pos=[...(p.spawn||WORLD.spawn)];p.baseInside=safe(p);p.baseEnteredAt=p.baseInside?-WORLD.protectionDelay:null;p.lastDamagedBy=null;p.lastDamageNoRewards=false;}
// Fixed entry deadline, independent from attacks, damage and skill activation.
export function updateProtection(p,now){
 const inside=safe(p);
 if(p.baseInside===undefined){p.baseInside=inside;p.baseEnteredAt=inside?now-WORLD.protectionDelay:null}
 else if(inside&&!p.baseInside)p.baseEnteredAt=now;
 else if(!inside)p.baseEnteredAt=null;
 p.baseInside=inside;return protectedAt(p,now);
}
export const protectedAt=(p,now)=>!!p&&!p.duelId&&safe(p)&&(p.baseEnteredAt===undefined||p.baseEnteredAt===null||now>=p.baseEnteredAt+WORLD.protectionDelay);
export const combatEligible=(p,now)=>!!p&&p.connected&&p.hp>0&&!p.hangar&&!p.death&&!p.exiting&&(!p.duelId||now>=p.duelStartsAt)&&(!!p.duelId||!protectedAt(p,now));
export const canDamage=(owner,target,now)=>{
 if(!owner?.connected||owner.hp<=0||owner.death||owner.hangar)return false;
 if(owner.exiting)return false;
 if(!owner.npc&&!owner.boss&&!combatEligible(owner,now))return false;
 if(!target)return owner.npc||owner.boss?true:combatEligible(owner,now);
 if(target.id===owner.id||!target.connected||target.hp<=0||target.death||target.hangar)return false;
 const a=!!(owner.npc||owner.boss),b=!!(target.npc||target.boss);
 if(a&&b)return false;
 if(owner.duelId||target.duelId)return !a&&!b&&owner.duelId===target.duelId&&now>=owner.duelStartsAt&&now>=target.duelStartsAt;
 if(!sameCombatZone(owner,target))return false;
 if(a||b)return combatEligible(a?target:owner,now);
 return zoneOf(owner)==='hostile';
};
export function advance(s,now){
 s.invites||=[];s.duels||=[];s.events||=[];s.bullets||=[];s.recoveries||={};tickDuels(s,reset,now);
 for(const p of s.players){if(p.duelId&&!s.duels.some(d=>d.id===p.duelId))p.duelId=null;updateProtection(p,now)}
 const targets=ensureArenaEnemies(s,now);
 const combat={status:'active',players:[...s.players,...targets],bullets:s.bullets,simTime:s.simTime??now,canDamage,onDamage:(owner,target,damage,time,bullet)=>{target.lastDamageNoRewards=!!bullet?.noRewards;if(targets.includes(target))recordArenaDamage(s,target,owner,damage,time,!!bullet?.noRewards)}};
 combat.allowBullet=(b,owner)=>b.duelId?owner.duelId===b.duelId:zoneOf({pos:b.pos})===b.combatZone&&zoneOf(owner)===b.combatZone;
 stepCombat(combat,now);s.bullets=combat.bullets;s.simTime=combat.simTime;
 advanceArenaEnemies(s,now,combatEligible);tickDuels(s,reset,now);
 for(const p of s.players)if(p.connected&&p.hp<=0&&!p.death){
  const winner=s.players.find(q=>q.id===p.lastDamagedBy),id=crypto.randomUUID();
  s.bullets=s.bullets.filter(b=>b.owner!==p.id&&b.target!==p.id);
  if(winner&&!winner.duelId&&zoneOf(p)==='hostile'&&zoneOf(winner)==='hostile')awardKill(s,winner,p,now,id);
  s.critical=true;p.death={id,time:now};s.recoveries[p.id]=p.death;p.firing=false;p.hangar=false;
  s.events.push({type:'destroyed',id,victim:p.id,winner:winner?.id||null,time:now});
 }
}
// Old invitation clients cannot re-enable duels in the open arena.
export const invite=inviteDuel;
export const reply=replyDuel;
export function attack(s,p,m,now){
 updateProtection(p,now);if(!combatEligible(p,now))return null;
 const clean={...m,shots:Array.isArray(m.shots)?m.shots.map(x=>({...x,crit:Math.random()<.15+(p.profile.special.crit||0)*.01})):null};
 const targets=[...s.players,...ensureArenaEnemies(s,now)],target=targets.find(x=>x.id===m.targetId&&canDamage(p,x,now));
 if(m.weapon==='explorer'&&(!target||(target.skillUntil?.interference||0)>now))return null;
 const combat={players:targets,bullets:s.bullets||[],canDamage};const bullets=volley(combat,p,clean,now);for(const b of bullets||[]){b.combatZone=zoneOf(p);b.duelId=p.duelId||null;b.noRewards=p.profile.shipId==='adminpod'}s.bullets=combat.bullets;return bullets;
}
export function useAbility(s,p,now){updateProtection(p,now);if(!combatEligible(p,now)||!ability(p,now))return false;if(['centella','vertigo'].includes(p.profile.shipId))p.paralyzedUntil=0;return true}

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

// A tactical formation change does not re-equip the ship or reset combat state.
export function changeFormation(p,id){
 const valid=['fan','shield','spear','fortress','hunter','drive','recovery'],q=p.profile,raw=p.roster?.[q?.shipId];
 if(!p.connected||p.hp<=0||p.hangar||!q||!raw||!valid.includes(id))return 'invalid_formation';
 const owned=Array.isArray(raw.ownedFormations)?raw.ownedFormations:['fan',raw.droneFormation];
 if(id!=='fan'&&(!q.droneCount||!owned.includes(id)))return 'invalid_formation';
 if(id===q.droneFormation)return null;
 const ratio=Math.max(0,Math.min(1,p.hp/q.maxHp));
 const baseHull=Number(raw.maxHp)/(raw.droneFormation==='fortress'?1.15:1);
 q.offlineMaxHp=Math.round(baseHull*(id==='fortress'?1.15:1));q.maxHp=q.offlineMaxHp*20;
 p.hp=Math.min(q.maxHp,ratio*q.maxHp);q.hp=p.hp;q.droneFormation=id;
 q.speed=q.baseSpeed*(id==='drive'?1.12:1);
 q.droneDamage=id==='spear'?1.2:1;q.resistance=(id==='shield'?.85:1)*(raw.boosters?.resistance===true?.85:1);
 q.droneRange=id==='hunter'?1380:1200;q.repairBonus=id==='recovery'?1.25:1;
 return null;
}

export {zoneOf,duelFor,finishDuel};
