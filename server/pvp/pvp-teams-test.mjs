// Local runtime tests inject fixture routes only into this isolated Worker.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerTestModules} from './worker-test-modules.mjs';
import {fixtureIdentity} from './test-identity.mjs';
const {Miniflare}=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'cosmos-teams-')),modules=workerTestModules(),entry=modules.find(m=>m.path.endsWith('/worker.mjs'));
entry.contents=entry.contents.replace('export class ArenaRoom extends SharedWorld {}',`export class ArenaRoom extends SharedWorld {
 fixture(op,id){this.stopSimulation();const s=this.worldLoad(),now=Date.now();
 if(op==='start')s.pvpMatch.startsAt=now-1;
 if(op==='injure'){const p=s.players.find(p=>p.id===id);p.hp=1234;p.skillReadyAt.fury=now+30000;}
 if(op==='kill')s.players.find(p=>p.id===id).hp=0;
 this.advanceRoom(s,now);this.worldSave(s,true);this.lastBroadcast=0;this.worldBroadcast(s);return {...this.worldSnapshot(s),receiptCount:this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM boss_rewards').toArray()[0].n};
 }}
`);
entry.contents=entry.contents.replace("const url=new URL(request.url),origin=request.headers.get('Origin')||'';",`const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 if(url.pathname==='/__fixture')return Response.json(await env.ROOMS.getByName(pvpRoomName('normal',url.searchParams.get('room'),'2v2')).fixture(url.searchParams.get('op'),url.searchParams.get('id')));
`);
const options={modules,compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:r=>fixtureIdentity.fetch(r)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);const sockets=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
const key=n=>n.toString(16).padStart(32,'0')+'d'.repeat(32),headers=n=>({'Content-Type':'application/json',Authorization:'Bearer fixture-'+key(n)});
async function enter(n,choice,mode='2v2'){const r=await mf.dispatchFetch('https://test/arena/join',{method:'POST',headers:headers(n),body:JSON.stringify({guestKey:key(n),name:'Pilot '+n,clientVersion:5,realm:'normal',arena:{...choice,mode},shipId:'aurora',skills:['fury','paralyze'],roster:{aurora:{maxHp:1000,maxEnergy:100,attack:100,defense:0,speed:220,level:60}}})});return {status:r.status,...await r.json()}}
async function socket(t){const r=await mf.dispatchFetch('https://test/arena/socket?realm=normal&mode='+t.arena.mode+'&room='+t.arena.code,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+t.token}});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.accept();ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));sockets.push(ws);return {ws,messages}}
async function fixture(code,op,id=''){const r=await mf.dispatchFetch('https://test/__fixture?room='+code+'&op='+op+'&id='+id);assert.equal(r.status,200);return r.json()}
try{
 assert.equal((await enter(1,{action:'find'},'6v6')).error,'invalid_mode');
 const publicTickets=await Promise.all([1,2,3,4,5].map(n=>enter(n,{action:'find'})));for(const t of publicTickets)assert.equal(t.status,200);assert.deepEqual(Object.values(Object.groupBy(publicTickets,t=>t.arena.code)).map(x=>x.length).sort(),[1,4]);
 const host=await enter(10,{action:'create'}),others=[];for(const n of [11,12,13])others.push(await enter(n,{action:'join',code:host.arena.code}));const tickets=[host,...others];
 assert.equal((await enter(14,{action:'join',code:host.arena.code})).error,'world_full');assert.equal((await enter(15,{action:'join',code:host.arena.code},'1v1')).error,'room_not_found');
 const peers=[];for(const t of tickets)peers.push(await socket(t));await delay(120);
 peers[0].ws.send(JSON.stringify({type:'teamSwap',players:[tickets[1].playerId,tickets[2].playerId]}));await delay(120);let snap=await fixture(host.arena.code,'inspect');assert.deepEqual(snap.players.map(p=>p.team),['a','a','b','b']);
 for(const peer of peers.slice(0,3))peer.ws.send(JSON.stringify({type:'ready',ready:true}));await delay(120);snap=await fixture(host.arena.code,'inspect');assert.equal(snap.match.status,'waiting');
 peers[3].ws.send(JSON.stringify({type:'ready',ready:true}));await delay(100);snap=await fixture(host.arena.code,'start');assert.equal(snap.match.status,'active');assert.equal(snap.rules.capacity,4);
 snap=await fixture(host.arena.code,'injure',host.playerId);snap=await fixture(host.arena.code,'kill',tickets[2].playerId);assert.equal(snap.match.status,'active');assert.equal(snap.players[2].eliminated,true);assert.equal(snap.receiptCount,0);
 for(const peer of peers)peer.ws.close();await delay(100);await mf.dispose();mf=new Miniflare(options);
 for(let i=0;i<tickets.length;i++){const t=await enter(10+i,{action:'resume',code:host.arena.code});assert.equal(t.status,200);await socket(t)}await delay(120);
 snap=await fixture(host.arena.code,'inspect');assert.deepEqual(snap.players.map(p=>p.team),['a','a','b','b']);assert.equal(snap.players[0].hp,1234);assert.ok(snap.players[0].skillReadyAt.fury>Date.now());assert.equal(snap.players[2].hp,0);assert.equal(snap.players[2].eliminated,true);assert.equal(snap.match.status,'active');
 snap=await fixture(host.arena.code,'kill',tickets[3].playerId);assert.equal(snap.match.status,'finished');assert.equal(snap.match.winnerTeam,'a');assert.equal(snap.receiptCount,0);
 const practice=await enter(20,{action:'bot'}),p=await socket(practice);await delay(100);p.ws.send(JSON.stringify({type:'ready',ready:true}));await delay(100);snap=await fixture(practice.arena.code,'start');assert.equal(snap.players.filter(p=>p.isBot).length,3);assert.deepEqual(snap.players.map(p=>p.team),['a','b','a','b']);p.ws.send(JSON.stringify({type:'ping',time:Date.now()}));await delay(3500);snap=await fixture(practice.arena.code,'inspect');assert.equal(snap.match.status,'active');assert.ok(new Set(p.messages.filter(m=>m.type==='volley'&&m.owner.startsWith('bot-')).map(m=>m.owner)).size>=2);
 console.log('PASS real Workers RPC/WebSockets/SQLite: 4+1 public matching, mode isolation, four ready checks, host team swaps, persistent teams/hull/cooldowns/elimination across restart, team victory without rewards and 2v2 practice with three bots.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
