import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
test('las rutas de mascotas son completas y los modelos existen para Android',()=>{
 const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
 for(const name of ['pet-blue.glb','pet-red.glb']){
  assert(game.includes("'./assets/models/"+name+"?v=1'"),name+' debe aparecer con ruta completa');
  assert(existsSync(fileURLToPath(new URL('../assets/models/'+name,import.meta.url))));
 }
 assert(!game.includes("'./assets/models/pet-'"),'no debe haber rutas parciales de modelos');
});
