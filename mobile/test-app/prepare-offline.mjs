import {readFileSync,writeFileSync,cpSync,rmSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..'),out=join(here,'www'),three=join(here,'node_modules/three');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const name of ['js','css','assets','version.json'])cpSync(join(root,name),join(out,name),{recursive:true});
mkdirSync(join(out,'vendor/three'),{recursive:true});
for(const name of ['build','examples/jsm','LICENSE'])cpSync(join(three,name),join(out,'vendor/three',name),{recursive:true});
let html=readFileSync(join(root,'index.html'),'utf8');
const cdn=/const threeCdn=new URLSearchParams\(location.search\).get\('threecdn'\)==='backup'[\s\S]*?:'https:\/\/cdn.jsdelivr.net\/npm\/three@0\.180\.0';/;
if(!cdn.test(html))throw new Error('Cambió el arranque del motor; revisar el empaquetado offline');
html=html.replace(cdn,"window.MUNDO_OFFLINE=true;\nconst threeCdn=new URL('./vendor/three',location.href).href;");
html=html.replace("if(!new URLSearchParams(location.search).has('threecdn')","if(!window.MUNDO_OFFLINE && !new URLSearchParams(location.search).has('threecdn')");
html=html.replace("{imports:{three:threeCdn+'/build/three.module.js'}}", "{imports:{three:threeCdn+'/build/three.module.js','three/addons/':threeCdn+'/examples/jsm/'}}");
html=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob: https://mundo-abierto-pvp.jairog940.workers.dev wss://mundo-abierto-pvp.jairog940.workers.dev; worker-src 'self' blob:; object-src 'none'; base-uri 'self'">`);
writeFileSync(join(out,'index.html'),html);
let pvp=readFileSync(join(root,'pvp.html'),'utf8');
if(!cdn.test(pvp))throw new Error('Revisar arranque offline de PvP');
pvp=pvp.replace(cdn,"window.MUNDO_OFFLINE=true;\nconst threeCdn=new URL('./vendor/three',location.href).href;");
pvp=pvp.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob: https://mundo-abierto-pvp.jairog940.workers.dev wss://mundo-abierto-pvp.jairog940.workers.dev; worker-src 'self' blob:; object-src 'none'; base-uri 'self'">`);
writeFileSync(join(out,'pvp.html'),pvp);
const gamePath=join(out,'js/game3d.js');
let game=readFileSync(gamePath,'utf8');
game=game.replace("(window.THREE_CDN||'https://cdn.jsdelivr.net/npm/three@0.180.0')","window.THREE_CDN");
writeFileSync(gamePath,game);
const bundleText=[html,...readdirSync(join(out,'js')).filter(n=>n.endsWith('.js')).map(n=>readFileSync(join(out,'js',n),'utf8')),readFileSync(join(out,'css/game.css'),'utf8')].join('\n');
for(const match of bundleText.matchAll(/(?:\.\/)?assets\/(?:[a-zA-Z0-9_./-]|%20|\([0-9]+\))+/g)){
 if(!existsSync(join(out,decodeURIComponent(match[0]))))throw new Error('Falta recurso: '+match[0]);
}
if(/https?:\/\//.test((html+'\n'+game).replaceAll('https://mundo-abierto-pvp.jairog940.workers.dev','')))throw new Error('Quedaron dependencias remotas en el arranque');
let models=0;
for(const name of readdirSync(join(out,'assets/models')).filter(n=>n.endsWith('.glb'))){
 const bytes=readFileSync(join(out,'assets/models',name));
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 for(const item of [...json.buffers||[],...json.images||[]])if(item.uri&&!item.uri.startsWith('data:'))throw new Error('Dependencia externa en '+name);
 models++;
}
writeFileSync(join(out,'offline-bundle.json'),JSON.stringify({offline:true,three:'0.180.0',models,sourceBuild:JSON.parse(readFileSync(join(root,'version.json'),'utf8')).build},null,2));
console.log('Paquete offline: '+models+' modelos incluidos; arranque y recursos locales.');
