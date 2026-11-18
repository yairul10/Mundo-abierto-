// Catálogo declarativo de apariencias de la mascota (independiente de los 8 drones de apoyo).
// Los modelos deben existir en assets/models/ antes de habilitar su carga en game3d.js.
export const PET_DESIGNS=Object.freeze([
 Object.freeze({id:'obsidian',name:'Dron Obsidian',model:'assets/models/pet-obsidian.glb',level:1,mission:null,default:true}),
 Object.freeze({id:'blue',name:'Dron Azul',model:'assets/models/pet-blue.glb',level:110,mission:Object.freeze({id:'pet-blue-titan-nexo',enemy:'titanNexo',goal:20}),default:false}),
 Object.freeze({id:'red',name:'Dron Rojo',model:'assets/models/pet-red.glb',level:115,mission:Object.freeze({id:'pet-red-titan-nexo',enemy:'titanNexo',goal:20}),default:false})
]);
export const DEFAULT_PET_DESIGN='obsidian';
export function getPetDesign(id){return PET_DESIGNS.find(design=>design.id===id)||PET_DESIGNS[0]}
