import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shipThumbnail,SHIP_PREVIEWS} from '../js/ship-preview-catalog.js';
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../js/hangar-ui.js',import.meta.url),'utf8');
const render=game.slice(game.indexOf('function renderShips(){'),game.indexOf('ensureShipBaseStats();',game.indexOf('function renderShips(){')));
const fleet={innerHTML:'',querySelectorAll:()=>[]},player={shipId:'segadora',ownedShips:{aurora:true,segadora:true},level:50,gold:1000000};
const types={aurora:{name:'Aurora',level:1,cost:0},titan:{name:'Titán',level:15,cost:200000},espectro:{name:'Espectro',level:25,cost:200000},segadora:{name:'Segadora',recipe:{}}};
new Function('$','SHIP_TYPES','player','shipThumbnail','renderSpecialUpgrades',render+';renderShips()')(id=>id==='hangarShipFleet'?fleet:{},types,player,shipThumbnail,()=>{});
assert.equal((fleet.innerHTML.match(/<img /g)||[]).length,1,'Only the equipped ship gets a preview fallback image');assert.match(fleet.innerHTML,/segadora\.webp/);assert.doesNotMatch(fleet.innerHTML,/data-preview-ship/);for(const id of ['aurora','titan','espectro'])assert.match(fleet.innerHTML,new RegExp('data-ship="'+id+'"'));
const preview=ui.slice(ui.indexOf(' function previewShip(){'),ui.indexOf('\n return {render',ui.indexOf(' function previewShip(){')));
let seen=null;const run=new Function('player','SHIP_PREVIEWS','view','category','$','startAssemblyPreview',preview+';return previewShip') (player,SHIP_PREVIEWS,'shop','ships',()=>({}),(_host,id)=>{seen=id});
for(const id of Object.keys(SHIP_PREVIEWS)){player.shipId=id;run('aurora');assert.equal(seen,id,'Shop follows equipped ship, including assembled ships')}
assert.match(ui,/if\(view==='assembly'\)void startAssemblyPreview\(\$\('shipAssembly3d'\),id\)/);
console.log('Shop: one equipped model, no 2D catalog images, purchases preserved and assembly previews unchanged.');
