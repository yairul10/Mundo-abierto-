import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shipThumbnail,SHIP_PREVIEWS} from '../js/ship-preview-catalog.js';
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../js/hangar-ui.js',import.meta.url),'utf8');
const render=game.slice(game.indexOf('function renderShips(){'),game.indexOf('ensureShipBaseStats();',game.indexOf('function renderShips(){')));
const selected=[],cards=['aurora','titan'].map(id=>({dataset:{shopSelect:id},classList:{toggle(_name,on){if(on)selected.push(id)}}}));
const fleet={innerHTML:'',dataset:{},querySelectorAll:selector=>selector==='[data-shop-select]'?cards:[]},player={shipId:'segadora',ownedShips:{aurora:true,segadora:true},level:50,gold:1000000};
const types={aurora:{name:'Aurora',level:1,cost:0},titan:{name:'Titán',level:15,cost:200000},espectro:{name:'Espectro',level:25,cost:200000},segadora:{name:'Segadora',recipe:{}}};
let previewed=null;const info={innerHTML:''},label={},status={},hero={scrollIntoView(){}},nodes={hangarShipFleet:fleet,shopShips:{},shopShipInfo:info,shopShipPreviewName:label,shopShipPreviewStatus:status,shopShipHero:hero};
new Function('$','SHIP_TYPES','player','shipThumbnail','renderSpecialUpgrades','canUseShop','renderShipInfo','bindShipInfo','hangarUI','selectedShopShip',render+';renderShips()')(id=>nodes[id]||{},types,player,shipThumbnail,()=>{},()=>true,id=>'ficha:'+id,()=>{},{previewShip:id=>{previewed=id}},null);
assert.equal((fleet.innerHTML.match(/<img /g)||[]).length,1,'One 3D preview fallback image');assert.match(fleet.innerHTML,/segadora\.webp/);for(const id of ['aurora','titan','espectro'])assert.match(fleet.innerHTML,new RegExp('data-ship="'+id+'"'));
cards[1].onclick({target:{closest:()=>null}});assert.equal(info.innerHTML,'ficha:titan');assert.equal(previewed,'titan');assert.equal(label.textContent,'Titán');assert.equal(selected.at(-1),'titan');
previewed=null;cards[0].onclick({target:{closest:()=>({})}});assert.equal(previewed,null,'Clicking Comprar does not select or trigger the preview');
const preview=ui.slice(ui.indexOf(' function previewShip('),ui.indexOf('\n return {render',ui.indexOf(' function previewShip(')));
let seen=null;const host={dataset:{}},previewNodes={shopShipPreview:host,shopShipPreviewName:{},shopShipPreviewStatus:{}};
const run=new Function('player','SHIP_PREVIEWS','view','category','$','startAssemblyPreview','shopShip',preview+';return previewShip')(player,SHIP_PREVIEWS,'shop','ships',id=>previewNodes[id],(_host,id)=>{seen=id},player.shipId);
for(const id of Object.keys(SHIP_PREVIEWS)){run(id);assert.equal(seen,id,'The selected ship gets the 3D preview')}
assert.match(ui,/if\(view==='assembly'\)void startAssemblyPreview\(\$\('shipAssembly3d'\),id\)/);
console.log('Shop: one equipped model, no 2D catalog images, purchases preserved and assembly previews unchanged.');
