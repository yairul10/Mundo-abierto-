const COMMON='Se consigue en Aurora, Cinturón Perdido, Ascuas y Cementerio de Naves al recoger materiales de los enemigos. También aparece en las recompensas del mapa Cooperativo.';
export function materialSource(id){return {
 chatarra:COMMON,aleacion:COMMON,nucleo:COMMON,reliquia:COMMON,
 nucleo_demolicion:'Se consigue de las Catapultas en Cementerio de Naves.',
 bobina_anclaje:'Se consigue de los Arponeros en Cementerio de Naves.',
 cristal_punteria:'Se consigue de los Acechadores en Cementerio de Naves.',
 nucleoNexo:'Se consigue en el mapa Cooperativo mediante recompensas de enemigos Pro y misiones cooperativas. Se utiliza para ensamblar naves en la base cooperativa.'
}[id]||'Origen no disponible.'}
export function materialInventoryHtml(materials,loot={}){
 return materials.map(t=>'<details class="inventory-item"><summary><span class="inventory-gem" style="background:#'+t.color.toString(16).padStart(6,'0')+'"></span><span class="inventory-description"><strong>'+t.name+'</strong><small>'+t.rarity+' · '+t.description+'</small><small class="material-info-hint">Toca para ver dónde se consigue</small></span><b>×'+Math.max(0,Number(loot[t.id])||0)+'</b></summary><p class="material-source">'+materialSource(t.id)+'</p></details>').join('');
}
