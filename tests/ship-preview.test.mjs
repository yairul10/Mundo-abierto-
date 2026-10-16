import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {SHIP_PREVIEWS,shipThumbnail,disposePreviewModel,fitPreviewModel} from '../js/ship-preview-catalog.js';
assert.deepEqual(Object.keys(SHIP_PREVIEWS),['aurora','titan','espectro','segadora','bastion','centella']);
for(const [id,ship] of Object.entries(SHIP_PREVIEWS)){
 assert.ok(existsSync(new URL('../assets/models/'+ship.model,import.meta.url)));
 assert.ok(existsSync(new URL('../assets/ship-previews/'+id+'.webp',import.meta.url)));
 assert.match(shipThumbnail(id),new RegExp(id+'\\.webp\\?v=252'));
 assert.ok(Number.isFinite(ship.yaw));
}
assert.equal(shipThumbnail('invalid'),'');assert.equal(SHIP_PREVIEWS.segadora.yaw,-Math.PI);
let disposed=0;const resource=()=>({dispose(){disposed++}}),texture={...resource(),isTexture:true},geometry=resource(),material={...resource(),map:texture,normalMap:texture};
disposePreviewModel({traverse(fn){fn({geometry,material});fn({geometry,material:[material]})}});assert.equal(disposed,3,'Shared GPU resources disposed once');disposePreviewModel(null);
class Vector3 {constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}}
class Group {constructor(){this.children=[];this.scale={setScalar:n=>this.factor=n};this.rotation={}}add(o){this.children.push(o)}}
class Box3 {setFromObject(o){this.o=o;return this}getSize(){return new Vector3(20,10,40)}getCenter(){return new Vector3(100,-20,50)}}
const source={position:new Vector3()},turn=fitPreviewModel({Vector3,Group,Box3},source,'segadora'),centered=turn.children[0];
assert.equal(centered.children[0],source);assert.equal(centered.factor,3/40);assert.equal(centered.rotation.y,-Math.PI);
assert.deepEqual(source.position,new Vector3(-100,20,-50),'Centering must happen inside the normalized parent');
const preview=readFileSync(new URL('../js/assembly-3d-preview.js',import.meta.url),'utf8');
assert.match(preview,/if\(cancelled\)\{disposePreviewModel\(gltf.scene\);return\}/);assert.match(preview,/1000\/30/);
console.log('Six current models/thumbnails, canonical orientation, scaled centering and unique GPU cleanup passed.');
