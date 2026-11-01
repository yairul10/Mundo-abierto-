import {HOME_STATS} from './fleet-balance.js?v=355';
// A second fleet tier. Each ship is owned permanently and assembled separately.
export const ASSEMBLED_SHIPS=Object.freeze({
 adminpod:{adminOnly:true,assemblyZone:'pvp',name:'Hoverpod Admin',level:1,cost:0,hp:15,attack:1.6,defense:1,speed:1.7,role:'aurora',color:0x6dc8f0,yaw:Math.PI,description:'Nave de administrador · eventos y visitas · sin recompensas por bajas',recipe:{}},
 azote:{assemblyZone:'pvp',equivalent:'segadora',name:'Azote',level:40,cost:500000,hp:HOME_STATS.azote[0],attack:HOME_STATS.azote[1],defense:HOME_STATS.azote[2],speed:HOME_STATS.azote[3],role:'espectro',color:0xff3939,yaw:Math.PI,description:'Ofensiva PvP · versión de Segadora · −30 % de casco, ataque y velocidad en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100,nucleoNexo:50}},
 egida:{assemblyZone:'pvp',equivalent:'bastion',name:'Égida',level:40,cost:500000,hp:HOME_STATS.egida[0],attack:HOME_STATS.egida[1],defense:HOME_STATS.egida[2],speed:HOME_STATS.egida[3],role:'titan',color:0xa66fe8,yaw:Math.PI,description:'Defensiva PvP · versión de Bastión · −30 % de casco, ataque y velocidad en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100,nucleoNexo:50}},
 vertigo:{assemblyZone:'pvp',equivalent:'centella',name:'Vértigo',level:40,cost:500000,hp:HOME_STATS.vertigo[0],attack:HOME_STATS.vertigo[1],defense:HOME_STATS.vertigo[2],speed:HOME_STATS.vertigo[3],role:'aurora',color:0x4b9aff,yaw:Math.PI,description:'Ágil PvP · versión de Centella · −30 % de casco, ataque y velocidad en PvE',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100,nucleoNexo:50}},
 obsidian:{assemblyZone:'pvp',name:'Obsidian',level:40,cost:1000000,hp:HOME_STATS.obsidian[0],attack:HOME_STATS.obsidian[1],defense:HOME_STATS.obsidian[2],speed:HOME_STATS.obsidian[3],role:'aurora',color:0x38e6cd,yaw:0,description:'Ancestral · superior en casco, ataque y velocidad en PvP',recipe:{chatarra:3000,aleacion:900,nucleo:240,reliquia:60,nucleo_demolicion:200,bobina_anclaje:200,cristal_punteria:200,nucleoNexo:750}},
 segadora:{name:'Segadora',level:40,cost:500000,hp:HOME_STATS.segadora[0],attack:HOME_STATS.segadora[1],defense:HOME_STATS.segadora[2],speed:HOME_STATS.segadora[3],role:'espectro',color:0xff3939,yaw:-Math.PI/2,description:'Ofensiva · daño superior, resistencia y movilidad moderadas',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 bastion:{name:'Bastión',level:40,cost:500000,hp:HOME_STATS.bastion[0],attack:HOME_STATS.bastion[1],defense:HOME_STATS.bastion[2],speed:HOME_STATS.bastion[3],role:'titan',color:0x398aff,yaw:Math.PI,description:'Defensiva · casco superior',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 centella:{name:'Centella',level:40,cost:500000,hp:HOME_STATS.centella[0],attack:HOME_STATS.centella[1],defense:HOME_STATS.centella[2],speed:HOME_STATS.centella[3],role:'aurora',color:0x4beaff,yaw:Math.PI,description:'Ágil · velocidad superior',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}}
});
export function canAssembleShip(player,id,zone='pve'){
 const ship=ASSEMBLED_SHIPS[id];
 return !!ship&&!ship.adminOnly&&(ship.assemblyZone||'pve')===zone&&!player.ownedShips?.[id]&&Number(player.level)>=ship.level&&Number(player.gold)>=ship.cost&&Object.entries(ship.recipe).every(([key,amount])=>Number(player.loot?.[key]||0)>=amount);
}
export function assembleShip(player,id,zone='pve'){
 if(!canAssembleShip(player,id,zone))return false;
 const ship=ASSEMBLED_SHIPS[id];player.gold-=ship.cost;
 for(const [key,amount]of Object.entries(ship.recipe))player.loot[key]-=amount;
 player.ownedShips||={};player.ownedShips[id]=true;return true;
}
export const shipRole=id=>id==='agilbasica'?'aurora':ASSEMBLED_SHIPS[id]?.role||id;
