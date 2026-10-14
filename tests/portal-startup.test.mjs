import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const labelSource=source.slice(source.indexOf('function makeStonePortalLabel(){'),source.indexOf('const primaryPortalLabel='));
const cloneSource=source.slice(source.indexOf('function clonePortalVisual(){'),source.indexOf('let secondaryPortal='));
const ctx=new Proxy({}, {get:()=>()=>{}});
const document={createElement:()=>({getContext:()=>ctx})};
class Sprite{constructor(material){this.material=material;this.userData={};this.scale={set(){}};this.position={set(){}}}}
const THREE={CanvasTexture:class{},Sprite,SpriteMaterial:class{},SRGBColorSpace:'srgb'};
const makeStonePortalLabel=new Function('THREE','document','portalNames',labelSource+';return makeStonePortalLabel;')(THREE,document,{belt:'CINTURÓN PERDIDO'});
const originalLabel=makeStonePortalLabel();
const portalMesh={userData:{},clone(){
 const label={name:originalLabel.name,userData:JSON.parse(JSON.stringify(originalLabel.userData))};
 return {children:[label],getObjectByName(name){return this.children.find(x=>x.name===name)},remove(item){this.children=this.children.filter(x=>x!==item)},add(item){this.children.push(item)},traverse(fn){this.children.forEach(fn)}};
}};
const clonePortalVisual=new Function('portalMesh','makeStonePortalLabel','configurePortalEmission',cloneSource+';return clonePortalVisual;')(portalMesh,makeStonePortalLabel,()=>{});
const secondary=clonePortalVisual().getObjectByName('stoneDestinationLabel');
assert.equal(typeof secondary.userData.drawDestination,'function');
assert.doesNotThrow(()=>secondary.userData.drawDestination('belt'));
assert.notEqual(secondary.material,originalLabel.material);
console.log('Portal startup: secondary label callable before model load, independent texture.');
