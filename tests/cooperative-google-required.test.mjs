import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('cooperative entry requires native Google Play in both servers, including old guest-test links',async()=>{
 const previous=globalThis.window;
 try{
  const code=readFileSync(new URL('../js/pvp-account.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  const {pvpAccountToken}=await import('data:text/javascript;base64,'+Buffer.from('const isNativePlayGames=()=>false;\n'+code).toString('base64'));
  for(const mode of ['normal','test']){globalThis.window={MUNDO_PLAY_MODE:{mode}};await assert.rejects(pvpAccountToken(),/Google Play Games/)}
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
});
