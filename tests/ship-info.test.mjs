import test from 'node:test';
import assert from 'node:assert/strict';
import {shipInfo,renderShipInfo} from '../js/ship-info.js';
import {SHIP_PREVIEWS} from '../js/ship-preview-catalog.js';
import {fleetMultipliers} from '../js/fleet-balance.js';

test('each ship exposes its mode-specific balance and compares the equipped ship',()=>{
 const player={shipId:'aurora'};
 for(const id of Object.keys(SHIP_PREVIEWS))for(const mode of ['pve','cooperative','pvp']){
  const info=shipInfo(id,player,mode);
  assert.deepEqual(info.stats,fleetMultipliers(id,mode));
  assert.deepEqual(info.equipped,fleetMultipliers('aurora',mode));
  const html=renderShipInfo(id,player,mode);
  for(const label of ['Casco','Ataque','Defensa','Velocidad','Habilidades y mejoras exclusivas','Recarga'])assert.ok(html.toLowerCase().includes(label.toLowerCase()),`${id}: ${label}`);
 }
});
test('abilities reflect the ship role, variant and saved specialization',()=>{
 const p={shipId:'titan',shipSpecializations:{titan:{fortress:4}}};
 assert.equal(shipInfo('titan',p).duration,7.2);
 assert.match(shipInfo('titan',p).effect,/40/);
 assert.match(shipInfo('bastion',p).effect,/50/);
 assert.match(shipInfo('segadora',p).effect,/70/);
 assert.match(shipInfo('espectro',p).effect,/60/);
 assert.match(shipInfo('centella',p).effect,/40/);
 assert.match(shipInfo('centella',p).effect,/arpón/);
 assert.equal(shipInfo('not-a-ship',p),null);
});
