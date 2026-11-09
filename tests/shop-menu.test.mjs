import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const nav=html.slice(html.indexOf('id="hangarSections"'),html.indexOf('</nav>',html.indexOf('id="hangarSections"')));
assert(nav.includes('data-hangar-view="equipment"'));
assert(nav.includes('data-hangar-view="assembly"'));
assert(!nav.includes('data-hangar-view="shop"'));
assert.equal((html.match(/id="hangarShopView"/g)||[]).length,1,'one store preserves the existing handlers');
assert(html.indexOf('id="shopPanel"')<html.indexOf('id="hangarShopView"'));
assert(html.includes('id="shopPurchases"'));
// Sale rendering replaces shopSell.innerHTML; the confirmation must survive it.
assert(html.indexOf('id="saleConfirm"')>html.indexOf('</fieldset>'));
assert(html.includes('<div id="shopSell" class="hidden"></div>'));


const nodes=new Map();
function node(id){
 if(!nodes.has(id)){
  const classes=new Set(id==='shopPanel'?['hidden']:[]);
  nodes.set(id,{onclick:null,focused:false,handlers:{},focus(){this.focused=true},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value)},addEventListener(type,handler){this.handlers[type]=handler}});
 }
 return nodes.get(id);
}
let view='home',refreshes=0,stopped=0;
const context={$:node,fireHeld:true,resetDockControls(){},hangarRefresh(){refreshes++},hangarUI:{show(next){view=next},stopPreview(){stopped++}}};
vm.createContext(context);
const start=game.indexOf('function closeShop(){'),end=game.indexOf("document.addEventListener('pointerdown'",start);
vm.runInContext(game.slice(start,end),context);
node('menuShop').onclick();assert.equal(view,'shop');assert.equal(refreshes,1);assert.equal(context.fireHeld,false);assert(!node('shopPanel').classList.contains('hidden'));
node('closeShop').onclick();assert.equal(view,'home');assert.equal(stopped,1);assert(node('shopPanel').classList.contains('hidden'));assert(node('menuShop').focused);
node('menuShop').onclick();let prevented=false;
node('shopPanel').handlers.keydown({key:'Escape',preventDefault(){prevented=true},stopPropagation(){}});
assert(prevented);assert(node('shopPanel').classList.contains('hidden'));
console.log('Shop menu: relocated store, two landing services, open/back and Escape passed.');

node('menuShop').onclick();
node('shopPanel').handlers.pointerdown({target:node('closeShop'),preventDefault(){},stopPropagation(){}});
assert(!node('shopPanel').classList.contains('hidden'),'inside touches keep the store open');
node('shopPanel').handlers.pointerdown({target:node('shopPanel'),preventDefault(){},stopPropagation(){}});
assert(node('shopPanel').classList.contains('hidden'),'backdrop closes the store');
// A missing secondary dialog must never trap the player in the shop.
context.$=id=>id==='saleConfirm'?null:node(id);
node('menuShop').onclick();node('closeShop').onclick();
assert(node('shopPanel').classList.contains('hidden'));
