import {readFileSync,copyFileSync,mkdirSync,cpSync,statSync} from 'node:fs';
import {resolve,dirname,join,relative,sep} from 'node:path';
// Preserve original artwork in git; omit superseded assets from Android.
export const EXCLUDED_ASSETS=new Set([
 'assets/loading-cosmos-legacy.png','assets/cosmos-start-background.webp',
 'assets/models/catapulta_chatarra.glb','assets/models/scifiportal.glb',
 'assets/models/spacecruiser_optimizado.glb'
]);
export function copyGameAssets(root,out){
 for(const name of ['js','css','assets','version.json'])cpSync(join(root,name),join(out,name),{
  recursive:true,filter:source=>!EXCLUDED_ASSETS.has(relative(root,source).split(sep).join('/'))&&!relative(root,source).split(sep).some(part=>part.startsWith('.'))
 });
}
export function copyThreeRuntime(source,destination){
 const copied=new Set();let bytes=0;
 function visit(file){
  const path=resolve(source,file),key=relative(source,path).split(sep).join('/');
  if(key.startsWith('../'))throw Error('Dependencia fuera del motor: '+file);
  if(copied.has(key))return;
  const code=readFileSync(path,'utf8');copied.add(key);
  const target=join(destination,key);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);bytes+=statSync(path).size;
  const imports=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  for(const match of imports.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g)){
   const dependency=match[1];
   if(dependency==='three'){visit('build/three.module.js');continue}
   if(dependency.startsWith('three/addons/')){visit('examples/jsm/'+dependency.slice(13));continue}
   if(!dependency.startsWith('.'))throw Error('Dependencia del motor no resuelta: '+dependency);
   visit(relative(source,resolve(dirname(path),dependency)));
  }
 }
 visit('build/three.module.js');visit('examples/jsm/loaders/GLTFLoader.js');
 mkdirSync(destination,{recursive:true});copyFileSync(join(source,'LICENSE'),join(destination,'LICENSE'));
 return {files:[...copied],bytes};
}
