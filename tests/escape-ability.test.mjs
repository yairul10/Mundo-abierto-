import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('function activateClassAbility()'),source.indexOf('function classAbilityActive('));
function run(id,energy,time=0){let breaks=0;const player={shipId:id,energy},a={name:'Skill',icon:'',energy:id==='bastion'?55:40};
new Function('combatAudio','player','SHIP_ABILITIES','scrapCombat',`let PVP_MODE=false,pvpSession=null,classAbilityTime=${time},docked=false,landing=false;const inSafeZone=()=>false,playerMesh={position:{}},abilityDuration=()=>5,hud=()=>{},lootToast=()=>{};${code};activateClassAbility();`)({play(){}},player,{[id]:a},{breakTether:()=>breaks++});return {energy:player.energy,breaks}}
assert.deepEqual(run('centella',40),{energy:0,breaks:1});assert.deepEqual(run('centella',39),{energy:39,breaks:0});assert.deepEqual(run('centella',100,1),{energy:100,breaks:0});assert.deepEqual(run('bastion',100),{energy:45,breaks:0});assert.deepEqual(run('aurora',100),{energy:60,breaks:0});
console.log('Centella escape: successful activation only, exact energy cost, no escape for other ships.');

assert.deepEqual(run('vertigo',40),{energy:0,breaks:1});assert.deepEqual(run('vertigo',39),{energy:39,breaks:0});
