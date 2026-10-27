// A second fleet tier. Each ship is owned permanently and assembled separately.
export const ASSEMBLED_SHIPS=Object.freeze({
 azote:{assemblyZone:'pvp',pvePenalty:.5,equivalent:'segadora',name:'Azote',level:40,cost:500000,hp:1.2,attack:1.95,defense:1.05,speed:1.15,role:'espectro',color:0xff3939,yaw:Math.PI,description:'Ofensiva PvP · versión de Segadora · −0,5 por característica en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 egida:{assemblyZone:'pvp',pvePenalty:.5,equivalent:'bastion',name:'Égida',level:40,cost:500000,hp:2.6,attack:1.1,defense:2.1,speed:0.95,role:'titan',color:0xa66fe8,yaw:Math.PI,description:'Defensiva PvP · versión de Bastión · −0,5 por característica en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 vertigo:{assemblyZone:'pvp',pvePenalty:.5,equivalent:'centella',name:'Vértigo',level:40,cost:500000,hp:1.05,attack:1.2,defense:0.95,speed:1.95,role:'aurora',color:0x4b9aff,yaw:Math.PI,description:'Ágil PvP · versión de Centella · −0,5 por característica en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 obsidian:{assemblyZone:'pvp',name:'Obsidian',level:40,cost:1000000,hp:1.9,attack:1.75,defense:1.6,speed:1.2,role:'aurora',color:0x38e6cd,yaw:0,description:'Ancestral · combate equilibrado con dos anillos en rotación',recipe:{chatarra:3000,aleacion:900,nucleo:240,reliquia:60,nucleo_demolicion:200,bobina_anclaje:200,cristal_punteria:200,nucleoNexo:750}},
 segadora:{name:'Segadora',level:40,cost:500000,hp:1.1,attack:1.85,defense:.95,speed:1.05,role:'espectro',color:0xff3939,yaw:-Math.PI/2,description:'Ofensiva · daño superior, resistencia y movilidad moderadas',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 bastion:{name:'Bastión',level:40,cost:500000,hp:2.5,attack:1,defense:2,speed:.85,role:'titan',color:0x398aff,yaw:Math.PI,description:'Defensiva · casco y escudo superiores, menor daño y velocidad',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 centella:{name:'Centella',level:40,cost:500000,hp:.95,attack:1.1,defense:.85,speed:1.85,role:'aurora',color:0x4beaff,yaw:Math.PI,description:'Ágil · velocidad superior, menor daño y resistencia',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}}
});
export function canAssembleShip(player,id,zone='pve'){
 const ship=ASSEMBLED_SHIPS[id];
 return !!ship&&(ship.assemblyZone||'pve')===zone&&!player.ownedShips?.[id]&&Number(player.level)>=ship.level&&Number(player.gold)>=ship.cost&&Object.entries(ship.recipe).every(([key,amount])=>Number(player.loot?.[key]||0)>=amount);
}
export function assembleShip(player,id,zone='pve'){
 if(!canAssembleShip(player,id,zone))return false;
 const ship=ASSEMBLED_SHIPS[id];player.gold-=ship.cost;
 for(const [key,amount]of Object.entries(ship.recipe))player.loot[key]-=amount;
 player.ownedShips||={};player.ownedShips[id]=true;return true;
}
export const shipRole=id=>ASSEMBLED_SHIPS[id]?.role||id;
