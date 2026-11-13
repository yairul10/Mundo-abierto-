// Local runtime test only. Fixture methods/routes are injected into an isolated Worker.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from './worker-test-modules.mjs';
import {fixtureIdentity} from './test-identity.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'cosmos-expeditions-'));
const modules=workerTestModules();const entry=modules.find(m=>m.path.endsWith('/worker.mjs'));
entry.contents=entry.contents.replace('export class ArenaRoom extends SharedWorld {}',`export class ArenaRoom extends SharedWorld {
 fixture(method,id){this.stopSimulation();const s=this.worldLoad();const p=s.players.find(p=>p.id===id),now=Date.now();
 if(method==='die')p.hp=0;
 if(method==='kill'){const b=s.arenaEnemies.find(b=>b.kind==='colossusPro'&&b.hp>0);b.contributions={[id]:b.maxHp};b.hp=0}
 if(method==='complete')for(const b of s.arenaEnemies){b.contributions={[id]:b.maxHp};b.hp=0}
 if(method==='later'){for(const b of s.arenaEnemies)b.respawnAt=0}
 this.advanceRoom(s,now);this.worldSave(s,true);for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();a.lastRewardsAt=0;ws.serializeAttachment(a)}this.lastBroadcast=0;this.worldBroadcast(s);return this.worldSnapshot(s);
 }}
`);
entry.contents=entry.contents.replace("const url=new URL(request.url),origin=request.headers.get('Origin')||'';",`const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 if(url.pathname==='/__fixture')return Response.json(await env.ROOMS.getByName(roomName(url.searchParams.get('realm'),url.searchParams.get('room'))).fixture(url.searchParams.get('op'),url.searchParams.get('id')));
`);
const options={modules,compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:r=>fixtureIdentity.fetch(r)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);const sockets=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
const key=n=>n.toString(16).padStart(32,'0')+'b'.repeat(32),headers=n=>({'Content-Type':'application/json',Authorization:'Bearer fixture-'+key(n)});
async function enter(n,coop,realm='normal'){const r=await mf.dispatchFetch('https://test/world/join',{method:'POST',headers:headers(n),body:JSON.stringify({guestKey:key(n),name:'Pilot '+n,clientVersion:5,realm,coop,shipId:'aurora',roster:{aurora:{maxHp:1000,maxEnergy:100,attack:100,defense:0,speed:220,level:60}}})});return {status:r.status,...await r.json()}}
async function socket(ticket,realm='normal'){const r=await mf.dispatchFetch('https://test/world/socket?realm='+realm+'&room='+ticket.room.code,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+ticket.token}});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.accept();ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));sockets.push(ws);return {ws,messages}}
async function fixture(room,op,id,realm='normal'){const r=await mf.dispatchFetch('https://test/__fixture?room='+room+'&op='+op+'&id='+id+'&realm='+realm);assert.equal(r.status,200);return r.json()}
try{
 const common=await Promise.all(Array.from({length:6},(_,i)=>enter(i+1,{action:'common'})));for(const t of common)assert.equal(t.status,200);
 const sizes=Object.values(Object.groupBy(common,t=>t.room.code)).map(t=>t.length).sort();assert.deepEqual(sizes,[1,5]);
 const priv=await enter(20,{action:'create'});assert.equal(priv.status,200);assert.equal(priv.room.visibility,'private');assert.notEqual(priv.room.code,common[0].room.code);
 const friend=await enter(21,{action:'join',code:priv.room.code});assert.equal(friend.status,200);assert.equal(friend.room.code,priv.room.code);
 assert.equal((await enter(22,{action:'join',code:'ABCDEF'})).error,'room_not_found');
 const otherRealm=await enter(23,{action:'common'},'test');assert.notEqual(otherRealm.room.code,priv.room.code);
 const a=await socket(priv),b=await socket(friend);await delay(100);
 let snap=await fixture(priv.room.code,'kill',priv.playerId);assert.equal(snap.groups[0].members.length,2);assert.equal(snap.enemies.filter(e=>e.kind==='colossusPro'&&e.hp<=0).length,1);
 await delay(1200);const reward=a.messages.filter(m=>m.type==='bossRewards').at(-1)?.receipts,buddy=b.messages.filter(m=>m.type==='bossRewards').at(-1)?.receipts;
 assert.ok(reward?.length);assert.ok(buddy?.length);assert.equal(reward[0].amount,buddy[0].amount);assert.equal(reward[0].xp,buddy[0].xp);
 snap=await fixture(priv.room.code,'die',priv.playerId);assert.equal(snap.players.find(p=>p.id===priv.playerId).livesRemaining,1);assert.ok(snap.players.find(p=>p.id===priv.playerId).hp>0);
 snap=await fixture(priv.room.code,'die',priv.playerId);assert.equal(snap.players.find(p=>p.id===priv.playerId).livesRemaining,0);assert.equal(snap.players.find(p=>p.id===priv.playerId).coopEliminated,true);
 const again=await fixture(priv.room.code,'later',friend.playerId);assert.equal(again.players.find(p=>p.id===priv.playerId).coopDeaths,2);assert.equal(again.enemies.filter(e=>e.kind==='colossusPro'&&e.hp<=0).length,1);
 a.ws.close();b.ws.close();await delay(100);await mf.dispose();mf=new Miniflare(options);
 const resumed=await enter(21,{action:'resume',code:priv.room.code});assert.equal(resumed.status,200);const restored=await socket(resumed);snap=await fixture(priv.room.code,'later',friend.playerId);assert.equal(snap.enemies.filter(e=>e.kind==='colossusPro'&&e.hp<=0).length,1);
 assert.equal((await enter(20,{action:'resume',code:priv.room.code})).error,'lives_exhausted');
 snap=await fixture(priv.room.code,'complete',friend.playerId);assert.equal(snap.room.status,'completed');assert.ok(snap.enemies.every(e=>e.hp<=0));
 assert.equal((await enter(24,{action:'join',code:priv.room.code})).error,'room_finished');
 // Pending rewards from an earlier room can be saved and acknowledged after changing room.
 const next=await enter(21,{action:'create'});assert.ok(next.pendingRooms.some(r=>r.code===priv.room.code));
 const pending=next.pendingRooms.find(r=>r.code===priv.room.code),claim=await mf.dispatchFetch('https://test/world/rewards',{method:'POST',headers:headers(21),body:JSON.stringify({room:priv.room.code,realm:'normal',ids:pending.receipts.map(r=>r.id)})});assert.equal(claim.status,200);assert.deepEqual((await claim.json()).receipts,[]);
 console.log('PASS real Workers RPC + WebSockets + SQLite: concurrent common fill, 5-player cap, private code isolation, realms, equal rewards, two lives, restart persistence, no respawn, completion and cross-room reward recovery.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
