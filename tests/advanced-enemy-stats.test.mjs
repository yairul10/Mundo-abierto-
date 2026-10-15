import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {advancedEnemyScale,scaledHealth}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/graveyard.js',import.meta.url))).toString('base64'));
assert.equal(3000*advancedEnemyScale(40,40),3000);
assert.equal(5000*advancedEnemyScale(40,40),5000);
assert.equal(3000*advancedEnemyScale(94,40),6240);
assert.equal(5000*advancedEnemyScale(94,40),10400);
assert.equal(40000*advancedEnemyScale(40,30),48000);
assert.equal(150*advancedEnemyScale(40,30),180);
// Cambiar el máximo conserva el porcentaje de vida restante (50 %).
assert.equal(scaledHealth(20000,40000,80000),40000);
assert.equal(scaledHealth(20000,40000,48000),24000);
assert.equal(scaledHealth(40000,80000,40000),20000);
assert.equal(scaledHealth(0,40000,80000),0);

assert.equal(advancedEnemyScale(1000,40),2.5);
assert.equal(advancedEnemyScale(20,40),1);
console.log('Advanced enemy scaling and saved boss health migration passed.');

// Real kill path: rewards follow the same capped factor as health and damage.
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const killSource=game.slice(game.indexOf('function kill(e,missile=false){'),game.indexOf('// Modelo 3D del misil.'));
for(const [level,hp,damage,gold,xp]of [[30,40000,150,10000,15000],[40,48000,180,12000,18000],[104,99200,372,24800,37200],[105,100000,375,25000,37500],[106,100000,375,25000,37500],[1000,100000,375,25000,37500]]){
 const player={level,gold:0},bossState={hp:1,rewarded:false},enemy={type:'carrier',mesh:{visible:true,position:{}}};let boxes=0,awardedXp=0;
 const TYPES={carrier:{gold:10000,xp:15000,loot:30}},none=()=>{};
 const kill=new Function('TYPES','advancedEnemyScale','player','bossState','enemies','activeSector','missionEvent','spawnLoot','gainXp','lootToast','save','enemyRewardScale','logAction',killSource+';return kill;')(TYPES,advancedEnemyScale,player,bossState,[],'ember',none,()=>boxes++,amount=>awardedXp+=amount,none,none,()=>{throw Error('Carrier must use its own progression')},none);
 assert.equal(40000*advancedEnemyScale(level,30),hp);assert.equal(150*advancedEnemyScale(level,30),damage);
 kill(enemy);assert.equal(player.gold,gold);assert.equal(awardedXp,xp);assert.equal(boxes,30);
 kill(enemy);assert.equal(player.gold,gold);assert.equal(awardedXp,xp);assert.equal(boxes,30);
}
console.log('Carrier: level-105 cap for health, damage and actual kill rewards; loot and duplicate protection preserved.');
