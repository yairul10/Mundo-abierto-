import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASSEMBLED_SHIPS,canAssembleShip} from '../js/assembled-ships.js';
import {pvpMultipliers,pveMultipliers} from '../js/pvp-loadout.js';
// Exercise the real recipe renderer: missing UI metadata previously threw before
// installing material buttons, leaving the selected recipe and store empty.
const source=readFileSync(new URL('../js/hangar-ui.js',import.meta.url),'utf8');
const render=source.slice(source.indexOf(' function renderShipAssembly(id){'),source.indexOf('\n function render(force=false)'));
const materials=[['chatarra','Chatarra','#abc'],['aleacion','Aleación','#abc'],['nucleo','Núcleo','#abc'],['reliquia','Reliquia','#abc']];
for(const [id,ship] of Object.entries(ASSEMBLED_SHIPS).filter(([,ship])=>!ship.adminOnly)){
 const player={level:163,gold:2000000,loot:{...ship.recipe},ownedShips:{aurora:true}};
 const nodes=new Map(),node=()=>({innerHTML:'',querySelectorAll:()=>[]});
 const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const run=new Function('$','ASSEMBLED_SHIPS','pvpMultipliers','pveMultipliers','MATERIALS','player','draft','canAssembleShip','baseZone','assembledShipPreview','fmt','view',render+';return renderShipAssembly');
 const draw=run($,ASSEMBLED_SHIPS,pvpMultipliers,pveMultipliers,materials,player,new Set(),canAssembleShip,()=>ship.assemblyZone||'pve',()=>'',String,'home');
 draw(id);
 for(const key of Object.keys(ship.recipe))assert.ok($('assemblyDetail').innerHTML.includes('data-ship-material="'+key+'"'),id+': '+key);
 if(ship.assemblyZone==='pvp')assert.match($('assemblyDetail').innerHTML,/Núcleo del Nexo/);
 assert.match($('assemblyDetail').innerHTML,/Ensamblar nave/);
 assert.equal(player.gold,2000000,'Viewing a recipe never debits credits');
}
console.log('Every PvE/PvP recipe renders all material slots, including Nexus cores.');
