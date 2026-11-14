// Local runtime fixtures are injected only into this isolated test Worker.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from './worker-test-modules.mjs';
import {fixtureIdentity} from './test-identity.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'cosmos-pvp1v1-')),modules=workerTestModules(),entry=modules.find(m=>m.path.endsWith('/worker.mjs'));
entry.contents=entry.contents.replace('export class ArenaRoom extends SharedWorld {}',`export class ArenaRoom extends SharedWorld {
 fixture(op){this.stopSimulation();const s=this.worldLoad(),now=Date.now();
 if(op==='start')s.pvpMatch.startsAt=now-1;
 if(op==='injure')s.players[0].hp=1234;
 if(op==='kill')s.players[1].hp=0;
 this.advanceRoom(s,now);this.worldSave(s,true);this.lastBroadcast=0;this.worldBroadcast(s);return {...this.worldSnapshot(s),receiptCount:this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM boss_rewards').toArray()[0].n};
 }}
`);
entry.contents=entry.contents.replace("const url=new URL(request.url),origin=request.headers.get('Origin')||'';",`const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 if(url.pathname==='/__fixture')return Response.json(await env.ROOMS.getByName(pvpRoomName('normal',url.searchParams.get('room'))).fixture(url.searchParams.get('op')));
`);
const options={modules,compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:r=>fixtureIdentity.fetch(r)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);const sockets=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
const key=n=>n.toString(16).padStart(32,'0')+'c'.repeat(32),headers=n=>({'Content-Type':'application/json',Authorization:'Bearer fixture-'+key(n)});
async function enter(n,arena,extra={}){const r=await mf.dispatchFetch('https://test/arena/join',{method:'POST',headers:headers(n),body:JSON.stringify({guestKey:key(n),name:'Pilot '+n,clientVersion:5,realm:'normal',arena,shipId:'aurora',skills:['fury','paralyze'],roster:{aurora:{maxHp:1000,maxEnergy:100,attack:100,defense:0,speed:220,level:60}},...extra})});return {status:r.status,...await r.json()}}
async function socket(t,path='/arena/socket'){const r=await mf.dispatchFetch('https://test'+path+'?realm=normal&room='+(t.arena||t.room).code,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+t.token}});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.accept();ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));sockets.push(ws);return {ws,messages}}
async function fixture(code,op){const r=await mf.dispatchFetch('https://test/__fixture?room='+code+'&op='+op);assert.equal(r.status,200);return r.json()}
try{
 const unauth=await mf.dispatchFetch('https://test/arena/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientVersion:5,arena:{action:'find'}})});assert.equal(unauth.status,401);
 const publicTickets=await Promise.all([1,2,3].map(n=>enter(n,{action:'find'})));for(const t of publicTickets)assert.equal(t.status,200);assert.deepEqual(Object.values(Object.groupBy(publicTickets,t=>t.arena.code)).map(x=>x.length).sort(),[1,2]);
 const host=await enter(10,{action:'create'}),friend=await enter(11,{action:'join',code:host.arena.code});assert.equal(host.status,200);assert.equal(friend.status,200);assert.equal((await enter(12,{action:'join',code:host.arena.code})).error,'world_full');
 assert.equal((await enter(13,{action:'create'},{shipId:'adminpod'})).error,'admin_ship_disabled');
 const a=await socket(host),b=await socket(friend);await delay(120);
 a.ws.send(JSON.stringify({type:'ready',ready:true}));b.ws.send(JSON.stringify({type:'ready',ready:true}));await delay(150);
 let snap=await fixture(host.arena.code,'start');assert.equal(snap.match.status,'active');assert.equal(snap.rules.pvpSkills,true);assert.equal(snap.rules.cooperative,false);assert.deepEqual(snap.enemies,[]);
 a.ws.send(JSON.stringify({type:'pvpSkill',skill:'fury'}));await delay(150);snap=await fixture(host.arena.code,'injure');assert.equal(snap.players[0].hp,1234);assert.ok(snap.players[0].skillReadyAt.fury>Date.now());
 a.ws.close();b.ws.close();await delay(100);await mf.dispose();mf=new Miniflare(options);
 const resumed=await enter(10,{action:'resume',code:host.arena.code}),resumedFriend=await enter(11,{action:'resume',code:host.arena.code});assert.equal(resumed.status,200);assert.equal(resumedFriend.status,200);await socket(resumed);await socket(resumedFriend);await delay(120);
 snap=await fixture(host.arena.code,'inspect');assert.equal(snap.players[0].hp,1234);assert.equal(snap.match.status,'active');assert.ok(snap.players[0].skillReadyAt.fury>Date.now());
 snap=await fixture(host.arena.code,'kill');assert.equal(snap.match.status,'finished');assert.equal(snap.match.winner,host.playerId);assert.equal(snap.receiptCount,0);assert.equal((await enter(10,{action:'resume',code:host.arena.code})).error,'match_finished');
 const r=await mf.dispatchFetch('https://test/world/join',{method:'POST',headers:headers(30),body:JSON.stringify({clientVersion:5,realm:'normal',coop:{action:'create'},shipId:'aurora',roster:{aurora:{maxHp:1000,attack:100,speed:220}}})});const coop=await r.json();assert.equal(r.status,200);const c=await socket(coop,'/world/socket');await delay(150);const coopState=c.messages.filter(m=>m.type==='world').at(-1);assert.equal(coopState.rules.cooperative,true);assert.equal(coopState.rules.pvpSkills,false);assert.notEqual(coop.room.code,host.arena.code);
 console.log('PASS Workers RPC/WebSockets/SQLite: public pairing, two-player capacity, private isolation, Google gate, no admin ship, readiness, PvP powers, durable reconnection, one winner, no rewards and unchanged cooperative.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
