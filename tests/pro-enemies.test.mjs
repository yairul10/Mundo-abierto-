import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proPopulation,proMultiplier,farmEnemyKey,PRO_TYPES_BY_SECTOR} from '../js/pro-enemies.js';
import {createFarmPilot,farmConfig} from '../js/farm-pilot.js';
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),population=proPopulation();
assert.equal(population.length,9);assert.equal(new Set(population.map(e=>e.proSector+':'+e.type)).size,9);assert.ok(population.every(e=>!['carrier','granTitan'].includes(e.type)));assert.equal(proMultiplier({}),1);assert.equal(proMultiplier(population[0]),2);
const pos=()=>({x:0,y:0,z:0,copy(){return this},set(){return this}}),mesh=()=>({position:pos(),visible:true,userData:{},children:[],add(o){this.children.push(o)}});
class Sprite {constructor(){this.position=pos();this.scale={set(){}}}}
const code=game.slice(game.indexOf('const enemies=[...enemyKinds'),game.indexOf('linkScrapPairs(enemies.filter'));
const enemies=new Function('enemyKinds','proPopulation','TYPES','graveyard','ship','scene','randomEnemyHome','enemyMaxHp','THREE','proBadgeMaterial',code+';return enemies')(['scout','raider'],proPopulation,Object.fromEntries(['scout','raider','sentinel','destroyer','devastator','catapult','harpooner','stalker'].map(t=>[t,{color:0}])),{enemyVisual:mesh},mesh,{add(){}},pos,()=>100,{Sprite},{});
assert.equal(enemies.length,11);for(const e of enemies.filter(e=>e.pro)){assert.equal(e.hp,200);assert.equal(e.maxHp,200);assert.equal(e.aggressive,false);assert.ok(e.mesh.userData.proBadge)}
const belongs=game.slice(game.indexOf('function enemyBelongsToSector'),game.indexOf('// Activate the assembled model'));
for(const sector of Object.keys(PRO_TYPES_BY_SECTOR)){const test=new Function('activeSector',belongs+';return enemyBelongsToSector')(sector);assert.equal(enemies.filter(e=>e.pro&&test(e)).length,PRO_TYPES_BY_SECTOR[sector].length)}
const damageText=game.slice(game.indexOf('function damageEnemy('),game.indexOf('function clearCombatShots()'));
const damage=new Function(damageText+';return damageEnemy')();const elite=enemies.find(e=>e.pro&&e.type==='scout');damage(elite,5);assert.equal(elite.aggressive,true);assert.equal(elite.hp,195);
const config=farmConfig();for(const [sector,types]of Object.entries(PRO_TYPES_BY_SECTOR))for(const type of types){assert.ok(!config.selections[sector].includes(type+'Pro'));assert.equal(farmEnemyKey({type,pro:true}),type+'Pro')}
const p=createFarmPilot({selections:{aurora:['scoutPro']}});p.start(40);const normal={type:'scout',hp:100,dead:0,mesh:{visible:true,position:{x:800,y:0,z:0}}},pro={...normal,pro:true,mesh:{visible:true,position:{x:1000,y:0,z:0}}};
const s={active:true,hp:100,maxHp:100,position:{x:0,y:0,z:0},sector:'aurora',safe:()=>false,enemies:[normal,pro],center:{x:0,z:0},radius:3000,attacks:[],obstacles:[]};assert.equal(p.tick(s,1).target,pro);
assert.match(game,/damage:t.damage\*proMultiplier\(e\)/);assert.match(game,/TYPES.stalker.damage\*proMultiplier\(e\)/);assert.match(game,/amount\*proMultiplier\(source\)/);assert.match(game,/e.aggressive=!e.pro&&e.type/);
console.log('Pro: nine unique map/type elites, double hull/damage, neutral until hit, unchanged normals and independent AUTO choices.');
