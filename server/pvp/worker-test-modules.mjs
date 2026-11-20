import {readFileSync} from 'node:fs';
import {relative} from 'node:path';
import {fileURLToPath} from 'node:url';
// Load the real import graph, including shared browser/server rules outside this folder.
export function workerTestModules(){
 const root=fileURLToPath(new URL('../../',import.meta.url)),modules=[],seen=new Set();
 function visit(url){
  url=new URL(url);url.search='';url.hash='';
  if(seen.has(url.href))return;seen.add(url.href);
  // Browser cache-busting query strings are not part of a Workerd module name.
  const contents=readFileSync(url,'utf8').replace(/((?:from\s*|import\s*)['"]\.{1,2}\/[^'"?]+)\?[^'"]*(['"])/g,'$1$2');
  modules.push({type:'ESModule',path:relative(root,fileURLToPath(url)),contents});
  for(const match of contents.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))visit(new URL(match[1],url));
 }
 visit(new URL('./worker.mjs',import.meta.url));return modules;
}
