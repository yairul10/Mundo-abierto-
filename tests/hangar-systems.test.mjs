import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as H from '../js/hangar-systems.js';
const fresh=()=>({gold:20000,loot:{chatarra:200,aleacion:70,nucleo:25,reliquia:8},droneCount:8,droneFormation:'shield'});
const p=fresh();H.normalizeHangar(p);assert.equal(p.droneFormation,'fan');assert.deepEqual(p.formations,{fan:true});
for(const f of H.FORMATIONS.filter(f=>f.id!=='fan')){
 const q=fresh();H.normalizeHangar(q);assert(H.assemble(q,f.id));assert.equal(q.gold,0);assert.deepEqual(q.loot,{chatarra:0,aleacion:0,nucleo:0,reliquia:0});assert(!H.assemble(q,f.id));
 q.droneFormation=f.id;const b=H.formationBonus(q);assert(Object.values(b).some(x=>x!==1));assert.deepEqual(H.formationBonus(q,false),H.formationBonus({...q,droneFormation:'fan'}));
 for(let n=1;n<=8;n++)for(let t of [0,1,8]){const coords=Array.from({length:n},(_,i)=>H.formationOffset(f.id,i,n,t));assert(coords.flat().every(Number.isFinite));assert.equal(new Set(coords.map(x=>JSON.stringify(x))).size,n)}
 const reload=JSON.parse(JSON.stringify(q));H.normalizeHangar(reload);assert(reload.formations[f.id]);assert.equal(reload.droneFormation,f.id);
 q.droneCount=0;assert(Object.values(H.formationBonus(q)).every(x=>x===1));
}
for(const missing of ['gold','chatarra','aleacion','nucleo','reliquia']){const q=fresh();H.normalizeHangar(q);if(missing==='gold')q.gold--;else q.loot[missing]--;const before=JSON.stringify(q);assert(!H.assemble(q,'shield'));assert.equal(JSON.stringify(q),before)}
const q=fresh();H.normalizeHangar(q);assert(!H.sellMaterial(q,'chatarra',201));assert(!H.sellMaterial(q,'chatarra',1.5));assert(!H.sellMaterial(q,'unknown',1));assert(H.sellMaterial(q,'chatarra',10));assert.equal(q.loot.chatarra,190);assert.equal(q.gold,20150);
assert(H.buyBooster(q,'damage'));assert.equal(q.boosters.damage,900);H.tickBoosters(q,50,true);assert.equal(q.boosters.damage,900);H.tickBoosters(q,50,false);assert.equal(q.boosters.damage,850);assert.equal(H.boosterBonus(q,'damage'),1.15);assert.equal(H.boosterBonus(q,'damage',false),1);assert(H.buyBooster(q,'damage'));assert.equal(q.boosters.damage,1750);assert.equal(H.boosterBonus(q,'damage'),1.15);H.tickBoosters(q,1750,false);assert.equal(H.boosterBonus(q,'damage'),1);
const source=fs.readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const sync=source.slice(source.indexOf('function syncShipStats(){'),source.indexOf('function changeShip('));
const c={player:{shipBaseStats:{maxHp:100,attack:10,defense:5,speed:220},maxHp:100,hp:50},ensureShipBaseStats(){},shipBonuses(){return {maxHp:0,attack:0,defense:0,speed:0}},equippedBonus(){return {hp:this.factor||1}},factor:1};c.equippedBonus=()=>({hp:c.factor});vm.createContext(c);vm.runInContext(sync,c);
for(let i=0;i<10;i++){c.factor=1.15;c.syncShipStats();assert.equal(c.player.maxHp,115);assert.equal(c.player.hp,57.5);c.factor=1;c.syncShipStats();assert.equal(c.player.hp,50)}
c.player.hp=0;c.syncShipStats();assert.equal(c.player.hp,0);
console.log('Hangar systems: recipes, ownership, economy, duration, layouts, perks and health ratios passed.');
