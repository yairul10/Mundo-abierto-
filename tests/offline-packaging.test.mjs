import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';
import {copyGameAssets,copyThreeRuntime,EXCLUDED_ASSETS} from '../mobile/test-app/package-assets.mjs';
const base=mkdtempSync(join(tmpdir(),'cosmos-bundle-'));
const put=(p,text)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,text)};
try{
 const source=join(base,'three'),out=join(base,'runtime');
 put(join(source,'build/three.module.js'),"export {x} from './three.core.js';\n");put(join(source,'build/three.core.js'),'export const x=1;');
 put(join(source,'examples/jsm/loaders/GLTFLoader.js'),"import {x} from 'three';\nimport {f} from '../utils/BufferGeometryUtils.js';\n/* import 'unused/example.js'; */\nconsole.log(\"converting from 'srgb-linear'\");");
 put(join(source,'examples/jsm/utils/BufferGeometryUtils.js'),"import {x} from 'three';\nexport const f=x;");put(join(source,'examples/jsm/Unused.js'),'unused');put(join(source,'LICENSE'),'MIT');
 const runtime=copyThreeRuntime(source,out);assert.equal(runtime.files.length,4);assert(!existsSync(join(out,'examples/jsm/Unused.js')));assert.equal(readFileSync(join(out,'build/three.core.js'),'utf8'),'export const x=1;');
 const root=join(base,'game'),bundle=join(base,'bundle');for(const f of EXCLUDED_ASSETS)put(join(root,f),'source');
 put(join(root,'assets/models/active.glb'),'active');put(join(root,'js/game.js'),'game');put(join(root,'css/game.css'),'css');put(join(root,'version.json'),'{}');
 copyGameAssets(root,bundle);for(const f of EXCLUDED_ASSETS){assert(existsSync(join(root,f)));assert(!existsSync(join(bundle,f)))}assert(existsSync(join(bundle,'assets/models/active.glb')));
 console.log('PASS: dependency closure, re-exports, bare imports, comment/string false positives, source preservation and asset exclusions');
}finally{rmSync(base,{recursive:true,force:true})}
