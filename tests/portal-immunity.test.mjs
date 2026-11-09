import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {WORLD,portalProtected,protectedAt,combatEligible,canDamage,attack,equip,importRoster,openHangar} from '../server/pvp/world-rules.mjs';

test('server grants portal immunity from authoritative position, blocking damage and attacks',()=>{
 const now=100000,p={id:'pilot',connected:true,pos:[...WORLD.portal],roster:importRoster({aurora:{maxHp:100,maxEnergy:500,attack:100,defense:0,speed:220,level:40}})};
 equip(p,'aurora');const npc={id:'npc',npc:true,connected:true,hp:100,pos:[0,120,1200]};
 const s={players:[p],events:[],duels:[],invites:[],realm:'test'};
 assert.equal(portalProtected(p),true);assert.equal(protectedAt(p,now),true);assert.equal(combatEligible(p,now),false);
 assert.equal(canDamage(npc,p,now),false);assert.equal(canDamage(p,npc,now),false);assert.equal(openHangar(s,p,now),'base_only');
 assert.equal(attack(s,p,{weapon:'laser',shots:[{offset:[0,0,0],direction:[0,0,1]}]},now),null);
 p.pos[0]=100;assert.equal(portalProtected(p),true);
 p.pos[0]=100.01;assert.equal(portalProtected(p),false);assert.equal(protectedAt(p,now),false);assert.equal(canDamage(npc,p,now),true);
 p.pos=[0,220.01,850];assert.equal(portalProtected(p),false,'vertical distance also cancels');
 p.pos=[...WORLD.portal];p.duelId='duel';assert.equal(portalProtected(p),false,'active duels do not gain escape protection');
 delete p.duelId;p.death={id:'death'};assert.equal(portalProtected(p),false);delete p.death;
 p.hangar=true;assert.equal(portalProtected(p),false);p.hangar=false;p.pos=[NaN,120,850];assert.equal(portalProtected(p),false);
});

test('local portal immunity requires a real unlocked countdown and cancels immediately on departure',()=>{
 const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
 const helper=game.slice(game.indexOf('function portalTransitProtected(){'),game.indexOf('function portalChargePulse('));
 const damage=game.slice(game.indexOf('function applyPlayerDamage(amount){'),game.indexOf('function classDamageMultiplier('));
 const make=new Function(`${helper}\n${damage}\n
 let PVP_MODE=false,docked=false,landing=false,portalCountdown=1,selectedPortalId='route',lastHitAt=0;
 const player={level:40,hp:100,shield:50,shipId:'aurora'},playerMesh={position:{distanceTo:()=>distance}};
 let distance=50;const route={id:'route',level:30,pos:{}};
 const sectorPortalRoutes=()=>[route],inSafeZone=()=>false,shipRole=()=> 'aurora',equippedBonus=()=>({resistance:1}),activeBooster=()=>1,classAbilityActive=()=>false;
 const combatAudio={play(){}},repairRobot={},repairBeam={};
 function applyShieldDamage(p,amount){p.hp-=amount;return {absorbed:0}}
 return {player,route,portalTransitProtected,applyPlayerDamage,setDistance:v=>distance=v,setCountdown:v=>portalCountdown=v,setPvp:v=>PVP_MODE=v,setDocked:v=>docked=v};`);
 const c=make();assert(c.portalTransitProtected());c.applyPlayerDamage(30);assert.equal(c.player.hp,100);assert.equal(c.player.shield,50);
 c.setDistance(101);assert.equal(c.portalTransitProtected(),false);c.applyPlayerDamage(30);assert.equal(c.player.hp,70);
 c.setDistance(50);c.setCountdown(0);assert.equal(c.portalTransitProtected(),false);
 c.setCountdown(1);c.route.level=50;assert.equal(c.portalTransitProtected(),false);c.route.level=30;
 c.setPvp(true);assert.equal(c.portalTransitProtected(),false);c.setPvp(false);c.setDocked(true);assert.equal(c.portalTransitProtected(),false);
});
