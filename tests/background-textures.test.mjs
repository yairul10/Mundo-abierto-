import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundSize,createBackgroundTextures} from '../js/background-textures.js';
test('background caps preserve aspect ratio and restore original detail',()=>{
 const image={width:3072,height:1536};
 for(const [level,width] of [['verylow',768],['low',1024],['medium',1536],['high',3072]])assert.deepEqual(backgroundSize(image,level),{width,height:width/2});
 assert.deepEqual(backgroundSize(image,'high',1536),{width:1536,height:768});
 assert.deepEqual(backgroundSize({width:512,height:256},'low'),{width:512,height:256});
});
test('quality switches replace and dispose GPU textures once and keep full-size source',()=>{
 const all=[];class Texture{constructor(image){this.image=image;this.disposed=0;all.push(this)}dispose(){this.disposed++}}
 let level='low',shown;const canvas=()=>({getContext:()=>({drawImage(){}})});
 const manager=createBackgroundTextures({CanvasTexture:Texture,EquirectangularReflectionMapping:1,SRGBColorSpace:2},{level:()=>level,createCanvas:canvas});
 const original=new Texture({width:2048,height:1024});manager.register(original,t=>shown=t);
 assert.equal(original.disposed,1);assert.equal(shown.image.width,1024);assert.equal(shown.image.height,512);
 manager.refresh();assert.equal(all.length,2);
 const low=shown;level='high';manager.refresh();assert.equal(low.disposed,1);assert.equal(shown.image.width,2048);
 level='verylow';manager.refresh();assert.equal(shown.image.width,768);
 assert.ok(all.slice(0,-1).every(t=>t.disposed===1));assert.equal(shown.disposed,0);
});
test('canvas failure preserves the working image and seam-prepared panoramas rebuild',()=>{
 let shown,level='low',disposed=0;const source={image:{width:2048,height:1024},dispose(){disposed++}};
 const manager=createBackgroundTextures({},{level:()=>level,createCanvas:()=>({getContext:()=>null})});
 manager.register(source,t=>shown=t);assert.equal(shown,source);assert.equal(disposed,0);
 const calls=[];manager.register(source,t=>shown=t,{maxWidth:1536,prepare:(_image,width,height)=>{calls.push([width,height]);return {dispose(){}}}});
 level='high';manager.refresh();assert.deepEqual(calls,[[1024,512],[1536,768]]);
});
