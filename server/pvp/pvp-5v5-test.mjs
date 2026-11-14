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
 if(url.pathname==='/__fixture')return Response.json(await env.ROOMS.getByName(pvpRoomName('normal',url.searchParams.get('room'),'5v5')).fixture(url.searchParams.get('op'),url.searchParams.get('id')));
`);
const options={modules,compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:r=>fixtureIdentity.fetch(r)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
let mf=new Miniflare(options);const sockets=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
const key=n=>n.toString(16).padStart(32,'0')+'d'.repeat(32),headers=n=>({'Content-Type':'application/json',Authorization:'Bearer fixture-'+key(n)});
async function enter(n,choice,mode='5v5'){const r=await mf.dispatchFetch('https://test/arena/join',{method:'POST',headers:headers(n),body:JSON.stringify({guestKey:key(n),name:'Pilot '+n,clientVersion:5,realm:'normal',arena:{...choice,mode},shipId:'aurora',skills:['fury','paralyze'],roster:{aurora:{maxHp:1000,maxEnergy:100,attack:100,defense:0,speed:220,level:60}}})});return {status:r.status,...await r.json()}}
async function socket(t){const r=await mf.dispatchFetch('https://test/arena/socket?realm=normal&mode='+t.arena.mode+'&room='+t.arena.code,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+t.token}});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.accept();ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));sockets.push(ws);return {ws,messages}}
async function fixture(code,op,id=''){const r=await mf.dispatchFetch('https://test/__fixture?room='+code+'&op='+op+'&id='+id);assert.equal(r.status,200);return r.json()}
try{
 const publicTickets=[];for(let n=1;n<=11;n++)publicTickets.push(await enter(n,{action:'find'}));
 for(const t of publicTickets)assert.equal(t.status,200);
 assert.deepEqual(Object.values(Object.groupBy(publicTickets,t=>t.arena.code)).map(x=>x.length).sort((a,b)=>a-b),[1,10]);
 const host=await enter(30,{action:'create'}),tickets=[host];
 for(let n=31;n<=39;n++)tickets.push(await enter(n,{action:'join',code:host.arena.code}));
 assert.equal((await enter(40,{action:'join',code:host.arena.code})).error,'world_full');
 assert.equal((await enter(41,{action:'join',code:host.arena.code},'2v2')).error,'room_not_found');
 const peers=[];for(const t of tickets)peers.push(await socket(t));await delay(150);
 for(const p of peers.slice(0,9))p.ws.send(JSON.stringify({type:'ready',ready:true}));
 await delay(150);let snap=await fixture(host.arena.code,'inspect');assert.equal(snap.match.status,'waiting');
 peers[9].ws.send(JSON.stringify({type:'ready',ready:true}));await delay(150);
 snap=await fixture(host.arena.code,'start');assert.equal(snap.match.status,'active');assert.equal(snap.match.capacity,10);
 assert.equal(snap.players.filter(p=>p.team==='a').length,5);
 for(const t of tickets.filter((_,i)=>i%2===1).slice(0,4))snap=await fixture(host.arena.code,'kill',t.playerId);
 assert.equal(snap.match.status,'active');
 snap=await fixture(host.arena.code,'kill',tickets[9].playerId);
 assert.equal(snap.match.winnerTeam,'a');assert.equal(snap.receiptCount,0);
 const practice=await enter(50,{action:'bot'}),peer=await socket(practice);await delay(120);
 peer.ws.send(JSON.stringify({type:'ready',ready:true}));await delay(120);
 snap=await fixture(practice.arena.code,'start');assert.equal(snap.players.filter(p=>p.isBot).length,9);
 assert.equal(snap.players.filter(p=>p.isBot&&p.team==='a').length,4);
 await delay(1500);snap=await fixture(practice.arena.code,'inspect');assert.equal(snap.match.status,'active');
 console.log('PASS 5v5 Workers/WebSockets/SQLite: 10+1 public matching, mode isolation, ten ready checks, team elimination and nine practice bots.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
