import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {enemyBalance,ENEMY_BASELINES} from '../js/enemy-balance.js';
import {proMultiplier,proRewardMultiplier} from '../js/pro-enemies.js';
import {ensureArenaEnemies,advanceArenaEnemies,recordArenaDamage} from '../server/pvp/arena-enemies.mjs';
const expected={raider:[350,10,50,90],sentinel:[700,20,120,200],destroyer:[1400,35,250,400],catapult:[6900,690,2200,3300],harpooner:[11500,115,3200,4500],stalker:[9200,575,4500,5500]};
test('Six approved normal baselines produce exact PvE Pro x4 and PvP Pro x8 at level 105',()=>{
 assert.equal(readFileSync(new URL('../js/enemy-balance.js',import.meta.url),'utf8'),readFileSync(new URL('../server/pvp/enemy-balance.mjs',import.meta.url),'utf8'),'Browser and Worker balance copies must be identical');
 for(const [type,values]of Object.entries(expected))for(const multiplier of [1,4,8]){assert.deepEqual(Object.values(enemyBalance(type,105,multiplier)),values.map(v=>v*multiplier));assert.equal(proMultiplier({type,pro:true}),4);assert.equal(proRewardMultiplier({type,pro:true}),4)}
 assert.equal(proMultiplier({type:'scout',pro:true}),2);assert.equal(proRewardMultiplier({type:'scout',pro:true}),1);assert.equal(enemyBalance('carrier'),null);
});
test('Level scaling remains bounded and all multipliers apply once',()=>{
 for(const type of Object.keys(expected))for(const level of [1,40,70,105,1000]){const normal=enemyBalance(type,level),pro=enemyBalance(type,level,4),pvp=enemyBalance(type,level,8);for(const key of ['hp','damage','gold','xp']){assert(Math.abs(pro[key]-normal[key]*4)<.001);assert(Math.abs(pvp[key]-pro[key]*2)<.001)}}
 assert.deepEqual(enemyBalance('catapult',1000),{hp:7500,damage:750,gold:2200,xp:3300});
});
test('Actual PvE kill path awards normal/pro credits and XP without multiplying material drops',()=>{
 const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),source=game.slice(game.indexOf('function kill(e,missile=false){'),game.indexOf('// Modelo 3D del misil.'));
 for(const [type,values]of Object.entries(expected))for(const pro of [false,true]){
  let xp=0,boxes=0;const player={level:105,gold:0},loot={raider:2,sentinel:4,destroyer:6,catapult:8,harpooner:7,stalker:8}[type],noop=()=>{};
  const context={combatAudio:{play:noop},TYPES:{[type]:{...ENEMY_BASELINES[type],loot}},enemyRewardScale:()=>2.5,proRewardMultiplier,player,activeSector:'test',logAction:noop,missionEvent:noop,spawnLoot:()=>boxes++,gainXp:v=>xp+=v,lootToast:noop,save:noop,LOOT_TYPES:[{id:'nucleo_demolicion'},{id:'bobina_anclaje'},{id:'cristal_punteria'}]};
  const kill=new Function('context','with(context){'+source+';return kill}')(context);const random=Math.random;try{Math.random=()=>.99;kill({type,pro,mesh:{visible:true,position:{}}})}finally{Math.random=random}
  const factor=pro?4:1;assert.equal(player.gold,values[2]*factor);assert.equal(xp,values[3]*factor);assert.equal(boxes,loot);
 }
});
test('Live PvP escorts migrate HP fraction and contribution weights once, preserve deaths and pending receipts',()=>{
 const s={players:[],events:[],bullets:[],bossRewards:[{id:'old',amount:2400,xp:3600}]};ensureArenaEnemies(s,1000);const parent=s.arenaEnemies.find(b=>b.kind==='colossusPro');recordArenaDamage(s,parent,{id:'a'},1,1000);parent.hp=parent.maxHp*.69;advanceArenaEnemies(s,1100,()=>false);const b=s.arenaEnemies.find(b=>b.model==='raider');
 b.balanceVersion=0;b.maxHp=14000;b.hp=7000;b.contributions={a:5000,b:2000};ensureArenaEnemies(s,1200);assert.equal(b.maxHp,2800);assert.equal(b.hp,1400);assert.deepEqual(b.contributions,{a:1000,b:400});assert.equal(b.rules.damage,80);assert.equal(b.rules.reward,400);assert.equal(b.rules.xpReward,720);ensureArenaEnemies(s,1300);assert.equal(b.hp,1400);assert.equal(b.rules.damage,80);assert.deepEqual(s.bossRewards,[{id:'old',amount:2400,xp:3600}]);
 b.balanceVersion=0;b.hp=0;ensureArenaEnemies(s,1400);assert.equal(b.hp,0);
});
