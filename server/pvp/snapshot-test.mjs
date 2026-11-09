import {workerTestModules} from './worker-test-modules.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureIdentity} from './test-identity.mjs';
import {restoreWorldSnapshot} from '../../js/world-snapshot.js';
const MF=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const persist=mkdtempSync(join(tmpdir(),'cosmos-delta-'));
const options={modules:workerTestModules(),compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:r=>fixtureIdentity.fetch(r)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
const create=()=>new MF.Miniflare(MF.convertV4MiniflareOptions?MF.convertV4MiniflareOptions(options):options);
let mf=create();const sockets=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(predicate){const end=Date.now()+5000;while(Date.now()<end){if(predicate())return;await pause(20)}throw Error('Snapshot timeout')}
async function connect(realm,key,delta){
 const response=await mf.dispatchFetch('https://arena.test/world/join',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-'+key.repeat(64)},body:JSON.stringify({realm,clientVersion:5,snapshotDelta:delta?1:0,roster:{aurora:{maxHp:1000,maxEnergy:500,attack:100,defense:0,speed:1000,level:100}},shipId:'aurora'})});
 assert.equal(response.status,200);const ticket=await response.json();
 const upgrade=await mf.dispatchFetch('https://arena.test/world/socket?realm='+realm,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+ticket.token}});assert.equal(upgrade.status,101);
 const ws=upgrade.webSocket;ws.accept();sockets.push(ws);const c={ws,id:ticket.playerId,frames:[],states:[],state:null,error:null};
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(!['world','worldDelta'].includes(m.type))return;try{c.state=restoreWorldSnapshot(m,c.state);c.states.push(c.state);c.frames.push(m)}catch(error){c.error=error}});
 await wait(()=>c.state);return c;
}
try{
 for(const [realm,key,other] of [['normal','a','b'],['test','c','d']]){
  const delta=await connect(realm,key,true),full=await connect(realm,other,false);
  await wait(()=>delta.frames.some(m=>m.type==='worldDelta')&&delta.state.players.length===2&&full.states.some(s=>delta.states.some(d=>d.serverTime===s.serverTime&&d.players.length===2)));
  assert.equal(delta.frames[0].type,'world');assert(full.frames.every(m=>m.type==='world'));assert.equal(delta.error,null);
  const common=full.states.find(s=>delta.states.some(d=>d.serverTime===s.serverTime&&d.players.length===2));
  assert.deepEqual(delta.states.find(s=>s.serverTime===common.serverTime),common);
  delta.ws.send(JSON.stringify({type:'input',seq:1,move:[1,0,0],aim:[0,0],firing:false}));
  await wait(()=>delta.state.players.find(p=>p.id===delta.id).seq===1);
  delta.ws.send(JSON.stringify({type:'leave'}));full.ws.send(JSON.stringify({type:'leave'}));await pause(150);delta.ws.close();full.ws.close();
 }
 await mf.dispose();mf=create();const reconnected=await connect('normal','a',true);
 assert.equal(reconnected.frames[0].type,'world');await wait(()=>reconnected.frames.some(m=>m.type==='worldDelta'));assert.equal(reconnected.error,null);
 console.log('PASS real WebSockets: opt-in deltas and full clients agree in both realms; movement, leave, reconnect and SQLite reconstruction.');
}finally{for(const ws of sockets)try{ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
