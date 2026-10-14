// A second fleet tier. Each ship is owned permanently and assembled separately.
export const ASSEMBLED_SHIPS=Object.freeze({
 segadora:{name:'Segadora',level:40,cost:350000,hp:1.1,attack:1.85,defense:.95,speed:1.05,role:'espectro',color:0xff3939,yaw:-Math.PI/2,description:'Ofensiva · daño superior, resistencia y movilidad moderadas',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 bastion:{name:'Bastión',level:40,cost:350000,hp:2.5,attack:1,defense:2,speed:.85,role:'titan',color:0x398aff,yaw:Math.PI,description:'Defensiva · casco y escudo superiores, menor daño y velocidad',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}},
 centella:{name:'Centella',level:40,cost:350000,hp:.95,attack:1.1,defense:.85,speed:1.85,role:'aurora',color:0x4beaff,yaw:Math.PI,description:'Ágil · velocidad superior, menor daño y resistencia',recipe:{chatarra:1500,aleacion:450,nucleo:120,reliquia:30,nucleo_demolicion:100,bobina_anclaje:100,cristal_punteria:100}}
});
export function canAssembleShip(player,id){
 const ship=ASSEMBLED_SHIPS[id];
 return !!ship&&!player.ownedShips?.[id]&&Number(player.level)>=ship.level&&Number(player.gold)>=ship.cost&&Object.entries(ship.recipe).every(([key,amount])=>Number(player.loot?.[key]||0)>=amount);
}
export function assembleShip(player,id){
 if(!canAssembleShip(player,id))return false;
 const ship=ASSEMBLED_SHIPS[id];player.gold-=ship.cost;
 for(const [key,amount]of Object.entries(ship.recipe))player.loot[key]-=amount;
 player.ownedShips||={};player.ownedShips[id]=true;return true;
}
export const shipRole=id=>ASSEMBLED_SHIPS[id]?.role||id;
