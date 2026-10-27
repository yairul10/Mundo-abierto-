import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const position=()=>({copy(){return this},multiplyScalar(){return this},add(){return this}});
class Group{constructor(){this.children=[];this.userData={};this.position=position();this.scale={setScalar(){}};this.visible=true}add(v){this.children.push(v)}traverse(fn){fn(this);for(const c of this.children)c.traverse?.(fn)}}
const template={clone(){const g=new Group();g.isMesh=true;return g}},enemies=[];
const ensureText=source.slice(source.indexOf('function ensureAcechadorVisual(e){'),source.indexOf("deferredModelLoad(modelLoader,'./assets/models/acechador_"));
const ensure=new Function('THREE','acechadorTemplate','acechadorScale','acechadorCenter',ensureText+';return ensureAcechadorVisual')({Group},template,1,position());
const normal={type:'stalker',mesh:new Group()};normal.mesh.add({visible:true});ensure(normal);assert.ok(normal.mesh.userData.acechadorModel);assert.equal(normal.mesh.children[0].visible,false);const length=normal.mesh.children.length;ensure(normal);assert.equal(normal.mesh.children.length,length,'Reused enemies must not duplicate GLBs');
const start=source.indexOf('function spawnTitanWave(){'),end=source.indexOf('function updateGranTitan',start);
const spawn=new Function('enemies','THREE','graveyard','ship','TYPES','scene','enemyMaxHp','titanRig','assembleCatapultParts','assembleHarpoonParts','ensureAcechadorVisual',source.slice(start,end)+';return spawnTitanWave')(enemies,{Vector3:class{copy(){return this}},Group},{enemyVisual:()=>new Group()},()=>new Group(),{stalker:{color:0}}, {add(){}},()=>4000,{muzzle:()=>position()},()=>{},()=>{},ensure);
spawn();const add=enemies.find(e=>e.type==='stalker');assert.ok(add.mesh.userData.acechadorModel,'Titan-created stalker receives the GLB immediately');const model=add.mesh.userData.acechadorModel;add.dead=1;spawn();assert.equal(add.mesh.userData.acechadorModel,model,'Reused Titan add keeps its GLB');
assert.match(source,/rejoinScrapPair\(e\);ensureAcechadorVisual\(e\)/);
console.log('Acechador: initial template, Titan spawn/reuse, no duplicate models and normal respawn hook passed.');
