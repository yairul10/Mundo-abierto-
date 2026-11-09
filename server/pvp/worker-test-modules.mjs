import {readFileSync} from 'node:fs';
import {relative} from 'node:path';
import {fileURLToPath} from 'node:url';
// Load the real import graph, including shared browser/server rules outside this folder.
export function workerTestModules(){
 const root=fileURLToPath(new URL('../../',import.meta.url)),modules=[],seen=new Set();
 function visit(url){
  if(seen.has(url.href))return;seen.add(url.href);
  const contents=readFileSync(url,'utf8');
  modules.push({type:'ESModule',path:relative(root,fileURLToPath(url)),contents});
  for(const match of contents.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))visit(new URL(match[1],url));
 }
 visit(new URL('./worker.mjs',import.meta.url));return modules;
}
