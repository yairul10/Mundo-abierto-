import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compatiblePvpClient,pvpVersionConfig} from './client-version.mjs';
test('missing/obsolete/invalid PvP protocols are refused; compatible content builds remain accepted',()=>{
 for(const clientVersion of [undefined,null,'1',0,-1,1.5])assert.equal(compatiblePvpClient({clientVersion},{}),false);
 assert(compatiblePvpClient({clientVersion:1},{}));assert(!compatiblePvpClient({clientVersion:1},{PVP_MIN_CLIENT_VERSION:'2'}));assert(compatiblePvpClient({clientVersion:2},{PVP_MIN_CLIENT_VERSION:'2'}));assert.equal(pvpVersionConfig({PVP_MIN_CLIENT_VERSION:'bad'}).minPvpClientVersion,1);
});
test('obsolete clients receive explicit 426 before Google auth or room entry',async()=>{
 const source=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8').replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {}').replace("import {SharedWorld} from './shared-world.mjs';",'class SharedWorld {}').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,import.meta.url).href}'`);
 const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const env={API_LIMIT:{limit:async()=>({success:true})},ROOMS:{getByName(){throw Error('must not enter room')}}};
 const r=await worker.fetch(new Request('https://test/world/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestKey:'a'.repeat(64)})}),env);
 assert.equal(r.status,426);assert.equal((await r.json()).error,'update_required');
 const config=await (await worker.fetch(new Request('https://test/game-config'),env)).json();assert.equal(config.minPvpClientVersion,1);
});
