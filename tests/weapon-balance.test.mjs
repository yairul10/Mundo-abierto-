import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCombatPlayer,volley} from '../server/pvp/combat.mjs';
import {readFileSync} from 'node:fs';
test('laser and drone base damage triples while missiles retain 80 percent',()=>{
 const p={id:'p',pos:[0,0,0],connected:true};makeCombatPlayer(p,{attack:100,shipId:'aurora',droneCount:1,explorerDrone:true});
 const s={status:'active',players:[p],bullets:[]},shot={offset:[0,0,-58],direction:[0,0,-1]};
 assert.deepEqual(volley(s,p,{weapon:'laser',shots:[shot,shot,{...shot,kind:'drone'}]},10000).map(x=>x.damage),[150,150,60]);
 assert.equal(volley(s,p,{weapon:'missile',shots:[shot]},10000)[0].damage,240);
 assert.equal(volley(s,p,{weapon:'explorer',shots:[shot]},10000)[0].damage,60);
 assert.equal(volley(s,p,{weapon:'missile',shots:[shot]},16000),null);
 assert.equal(volley(s,p,{weapon:'missile',shots:[shot]},17000)[0].damage,240);
});
test('local PvE damage matches authoritative cooperative coefficients',()=>{
 const s=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
 assert.match(s,/damage:player.attack\*mult\*1\.5\*classDamageMultiplier/);
 assert.match(s,/damage:player.attack\*\.6\*equippedBonus/);
 assert.match(s,/damage:player.attack\*\.6\*activeBooster/);
 assert.match(s,/damage:player.attack\*2\.4\*activeBooster\('damage'\),missile:true/);
 assert.match(s,/skillCd=7;/);
});
