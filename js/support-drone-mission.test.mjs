import assert from 'node:assert/strict';
import {applyBossReceipts} from './pvp-boss-rewards.js';
import {PVP_MISSIONS,missionPrize} from './pvp-missions.js';
import {createMissionBoard} from './mission-board.js';
import {supportDesignSelected} from './support-drone-design.js';
const receipt=(kind,n)=>({id:`${kind}-${n}`,bossId:`boss-${kind}-${n}`,enemyKind:kind,amount:100,xp:10,damage:10,totalDamage:100});
let player={level:99,gold:0,xp:0,quests:{},pvpBossReceipts:[]};player=applyBossReceipts(player,[receipt('infernoPro',0)]).pilot;assert.equal(player.quests?.pvpMissions?.droneProgress,undefined);
player.level=100;player.quests.pvpMissions={completed:['pvp-first-titan','pvp-five-titans'],exclusiveKillsV1:true};let batch=[];for(let i=1;i<=49;i++)batch.push(receipt('infernoPro',i));for(let i=1;i<=40;i++)batch.push(receipt('granTitanPro',i));let result=applyBossReceipts(player,batch);player=result.pilot;assert.deepEqual(player.quests.pvpMissions.droneProgress,[49,40]);assert(!player.quests.pvpMissions.completed.includes('coop-drone-pearl'));
let board=createMissionBoard(PVP_MISSIONS,player.quests);let mission=board.remaining(100).find(m=>m.id==='coop-drone-pearl');assert(mission);assert.deepEqual(board.state.progress[mission.id],[49,40]);assert.match(missionPrize(mission),/Perla violeta/);
player=applyBossReceipts(player,[receipt('infernoPro',1),receipt('granTitanPro',1)]).pilot;assert.deepEqual(player.quests.pvpMissions.droneProgress,[49,40]);
result=applyBossReceipts(player,[receipt('infernoPro',50)]);player=result.pilot;assert(player.quests.pvpMissions.completed.includes('coop-drone-pearl'));assert.equal(result.missions.filter(m=>m.id==='coop-drone-pearl').length,1);assert.equal(supportDesignSelected(player),'original');player.quests.supportDroneSkin='pearl';assert.equal(supportDesignSelected(player),'pearl');assert(!createMissionBoard(PVP_MISSIONS,player.quests).remaining(100).some(m=>m.id==='coop-drone-pearl'));
console.log('Misión, duplicados, nivel, selección y progreso: OK');
const {offlineRoster} = await import('./pvp-loadout.js');
const {profile} = await import('../server/pvp/combat.mjs');
let roster=offlineRoster(player);assert.equal(roster.profiles.aurora.supportDroneSkin,'pearl');assert.equal(profile(roster.profiles.aurora).supportDroneSkin,'pearl');delete player.quests.pvpMissions.completed;assert.equal(offlineRoster(player).profiles.aurora.supportDroneSkin,'original');
console.log('Sincronización de diseño por perfil: OK');
// The cosmetic bonus is calculated by the combat server only for support drones.
const {makeCombatPlayer,volley}=await import('../server/pvp/combat.mjs');
const {supportDroneDamageMultiplier}=await import('./support-drone-design.js');
function fire(skin,weapon,kind,boosted=false){const pilot={id:'a',pos:[0,0,0],connected:true};makeCombatPlayer(pilot,{shipId:'aurora',maxHp:1000,maxEnergy:100,attack:100,defense:0,speed:220,droneCount:8,explorerDrone:true,supportDroneSkin:skin,boosters:boosted?{damage2:50}:{}});pilot.profile.droneDamage=1.2;const bullets=volley({players:[pilot],bullets:[]},pilot,{weapon,shots:[{offset:[0,0,0],direction:[0,0,-1],kind}]},10000);assert(bullets);return bullets[0].damage;}
for(const boosted of [false,true]){assert(Math.abs(fire('pearl','laser','drone',boosted)/fire('original','laser','drone',boosted)-1.3)<1e-10);assert.equal(fire('pearl','laser','laser',boosted),fire('original','laser','laser',boosted));assert.equal(fire('pearl','explorer','explorer',boosted),fire('original','explorer','explorer',boosted));}
assert.equal(supportDroneDamageMultiplier('pearl'),1.3);assert.equal(supportDroneDamageMultiplier('original'),1);
console.log('Daño de apoyo +30 %, potenciadores, nave y mascota: OK');
