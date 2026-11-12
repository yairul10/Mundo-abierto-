import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shieldLevel,shieldCapacity,syncShield,applyShieldDamage,regenerateShield,buyShieldUpgrade,shieldUpgradeCost,SHIELD_PER_LEVEL} from '../js/shield-system.js';
import {profile,makeCombatPlayer,ability,stepCombat,volley,defenseDamage} from '../server/pvp/combat.mjs';
import {equip,reset,importRoster} from '../server/pvp/world-rules.mjs';
import {offlineRoster,initialPvpPilot} from '../js/pvp-loadout.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
assert.equal(readFileSync(new URL('../js/shield-system.js',import.meta.url),'utf8'),readFileSync(new URL('../server/pvp/shield-system.mjs',import.meta.url),'utf8'),'client/server shield rules identical');
const legacy={shipId:'titan',level:138,hp:100,maxHp:100000,energy:999,maxEnergy:999,gold:155000,upgrades:{},ownedShips:{aurora:true,titan:true},shipBaseStats:{maxHp:100,attack:10,defense:0,speed:220}};
syncShield(legacy);assert.equal(legacy.maxShield,0);assert.equal(legacy.shield,0);assert.equal(legacy.gold,155000);
for(const price of [5000,10000,20000,40000,80000]){
 assert.equal(shieldUpgradeCost(legacy),price);const before=structuredClone(legacy);assert.equal(buyShieldUpgrade(legacy),false);assert.deepEqual(legacy,before);assert.equal(buyShieldUpgrade(legacy,{docked:true}),true);
}
assert.equal(legacy.gold,0);assert.equal(legacy.maxShield,200);assert.equal(legacy.shield,200);assert.equal(buyShieldUpgrade(legacy,{docked:true}),false);assert.equal(shieldUpgradeCost(legacy),null);
for(const shipId of Object.keys(SHIELD_PER_LEVEL))for(let level=0;level<=5;level++)assert.equal(shieldCapacity({shipId,upgrades:{shieldGenerator:level}}),SHIELD_PER_LEVEL[shipId]*level);
for(const value of [Infinity,NaN,-10,'invalid'])assert.equal(shieldLevel({upgrades:{shieldGenerator:value}}),0);assert.equal(shieldLevel({upgrades:{shieldGenerator:999}}),5);
const p={shipId:'aurora',hp:100,upgrades:{shieldGenerator:2}};syncShield(p,{fill:true});assert.equal(p.maxShield,50);
let hit=applyShieldDamage(p,30,10000);assert.deepEqual(hit,{absorbed:30,hullDamage:0,total:30});assert.equal(p.hp,100);assert.equal(p.shield,20);
hit=applyShieldDamage(p,40,11000);assert.deepEqual(hit,{absorbed:20,hullDamage:20,total:40});assert.equal(p.hp,80);assert.equal(p.shield,0);
regenerateShield(p,1,15999);assert.equal(p.shield,0);regenerateShield(p,1,16500);assert.equal(p.shield,2.5,'only half of the frame occurs after the 5 s delay');regenerateShield(p,1,17500);assert.equal(p.shield,7.5);
p.firing=true;regenerateShield(p,1,18500,1.4);assert.equal(p.shield,14.5,'shooting does not block recharge');applyShieldDamage(p,5,19000);const charge=p.shield;regenerateShield(p,1,23000);assert.equal(p.shield,charge,'new hit resets delay');p.hp=0;regenerateShield(p,10,40000);assert.equal(p.shield,charge,'dead pilot cannot regenerate');
// Preserve percentage through ship changes and PvE/PvP, never derive shields from HP.
legacy.shield=100;legacy.shipId='espectro';syncShield(legacy);assert.equal(legacy.maxShield,100);assert.equal(legacy.shield,50);syncShield(legacy,{pvp:true});assert.equal(legacy.maxShield,2000);assert.equal(legacy.shield,1000);syncShield(legacy);assert.equal(legacy.maxShield,100);assert.equal(legacy.shield,50);
legacy.shipId='titan';syncShield(legacy);const editor=createHangarEditor(legacy);editor.maxShield*=20;editor.shield=editor.maxShield*.25;const saved=serializeHangarEditor(editor,legacy);assert.equal(saved.maxShield,200);assert.equal(saved.shield,50);assert.equal(initialPvpPilot(saved).maxShield,200);
const roster=offlineRoster(saved);const pilot={id:'a',pos:[0,0,0],connected:true,roster:importRoster(roster.profiles)};assert(equip(pilot,'titan'));assert.equal(pilot.profile.maxShield,4000);assert.equal(pilot.shield,4000);pilot.energy=0;assert(ability(pilot,10000));assert.equal(pilot.energy,0);assert(!ability(pilot,10001),'cooldown still enforced');
const target={id:'b',pos:[0,0,-100],connected:true};makeCombatPlayer(target,{shipId:'aurora',maxHp:200,defense:0,upgrades:{shieldGenerator:1}});target.shield=target.profile.maxShield;
const attacker={id:'c',pos:[0,0,0],connected:true};makeCombatPlayer(attacker,{attack:100,maxHp:100});const state={status:'active',simTime:20000,players:[attacker,target]};volley(state,attacker,{weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,-1]}]},20000);stepCombat(state,20050);assert.equal(target.shield,0);assert.equal(target.hp,75);
reset(pilot,true);assert.equal(pilot.shield,pilot.profile.maxShield);
console.log('Shields: migration at zero, exact atomic upgrades, ship capacities, absorption/overflow, delayed regen while firing, death, cooldown-only abilities, PvP hits and unscaled persistence.');
// Bomb areas and attached harpoons must hit shield first, not bypass it.
const {tickNpcPattern,advanceNpcHazards}=await import('../server/pvp/npc-patterns.mjs');
const protectedPilot={id:'shielded',clientVersion:5,connected:true,pos:[0,120,1100],hp:10000,shield:3000,profile:{maxHp:10000,maxShield:3000,shipId:'aurora',defense:0,special:{}},skillUntil:{}};
const catapult={id:'cat',instanceId:'cat-round',kind:'reinforcement',model:'catapult',npc:true,connected:true,pos:[0,120,800],hp:9000,maxHp:10000,active:true,rules:{attackPattern:'catapult',damage:1380,zone:'pve',targets:1,range:1400}};
const hazards={players:[protectedPilot],arenaEnemies:[catapult],bullets:[],events:[]};tickNpcPattern(hazards,catapult,1000,[protectedPilot]);tickNpcPattern(hazards,catapult,2400,[protectedPilot]);advanceNpcHazards(hazards,3900,()=>true);assert.equal(protectedPilot.hp,10000);assert.equal(protectedPilot.shield,1620);
protectedPilot.paralyzedUntil=10000;protectedPilot.npcTether={owner:catapult.id,instance:catapult.instanceId,dps:1000,until:10000,tickAt:4000};advanceNpcHazards(hazards,4300,()=>true);assert.equal(protectedPilot.hp,10000);assert.equal(protectedPilot.shield,1320);
const {ensureBoss,recordBossDamage,tickBoss}=await import('../server/pvp/cooperative-boss.mjs');
const beamState={players:[protectedPilot],bossRewards:[],events:[]},beam=ensureBoss(beamState,5000,{id:'beam',maxHp:1000,damage:100,targets:1,attackInterval:1000,range:1500,pos:[0,120,800]});recordBossDamage(beam,protectedPilot,1,5000);beam.hp=999;tickBoss(beamState,6000,()=>true);assert.equal(protectedPilot.hp,10000);assert.equal(protectedPilot.shield,1220,'direct boss beam absorbs shield');
console.log('Shield integration: catapult AoE, harpoon damage-over-time and direct boss beam all respect the shield layer.');
