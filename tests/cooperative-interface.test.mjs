import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {materialSource,materialInventoryHtml} from '../js/material-info.js';
test('all inventory resources expose their maps and Nexus uses the existing save key',async()=>{
 const game=await readFile(new URL('../js/game3d.js',import.meta.url),'utf8');
 const definition=game.slice(game.indexOf('const LOOT_TYPES=['),game.indexOf('player.loot=',game.indexOf('const LOOT_TYPES=[')));
 const materials=new Function(definition+';return LOOT_TYPES')();
 assert.equal(materials.length,8);assert.equal(materials.at(-1).id,'nucleoNexo');
 for(const item of materials)assert.notEqual(materialSource(item.id),'Origen no disponible.');
 const loot={nucleoNexo:17};const html=materialInventoryHtml(materials,loot);
 assert.equal((html.match(/<details /g)||[]).length,8);assert.equal((html.match(/<summary>/g)||[]).length,8);
 assert.match(html,/Núcleo del Nexo/);assert.match(html,/×17/);assert.match(html,/mapa Cooperativo/);
 assert.match(materialSource('bobina_anclaje'),/Arponeros.*Cementerio/);assert.deepEqual(loot,{nucleoNexo:17});
});
test('portal, inventory and mode switch describe cooperative without changing travel IDs',async()=>{
 const game=await readFile(new URL('../js/game3d.js',import.meta.url),'utf8'),html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/pvp:'COOPERATIVO'/);assert.match(game,/Cooperativo · requiere internet/);
 assert.match(game,/qaSwitch.textContent='Cambiar de partida'/);assert.match(game,/qaTools.classList.add\('hidden'\)/);
 const section=html.slice(html.indexOf('<section id="qaPanel">'),html.indexOf('<div id="qaTools"'));
 assert.match(section,/Cambiar de partida/);assert.doesNotMatch(section,/Servidor de prueba|Mapa cooperativo|<a|<h3|<p/);
 assert.match(game,/to:'pvp'/);assert.match(game,/materialInventoryHtml\(LOOT_TYPES,player.loot\)/);
});
