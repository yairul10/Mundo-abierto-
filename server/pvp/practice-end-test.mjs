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
 const practice=await enter(50,{action:'bot'}),peer=await socket(practice);await delay(120);
 peer.ws.send(JSON.stringify({type:'ready',ready:true}));await delay(120);
 let snap=await fixture(practice.arena.code,'start');assert.equal(snap.match.status,'active');
 snap=await fixture(practice.arena.code,'kill',practice.playerId);
 assert.equal(snap.match.status,'finished');assert.equal(snap.match.simulated,true);assert.equal(snap.receiptCount,0);
 snap=await fixture(practice.arena.code,'inspect');assert.equal(snap.match.status,'finished');assert.equal(snap.match.simulated,true);
 console.log('PASS real practice death: immediate simulated result persists in SQLite with zero rewards.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
