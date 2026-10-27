import {fixtureIdentity,authenticateFixtureRequests} from './test-identity.mjs';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const MF=await import(process.env.COSMOS_MINIFLARE||'miniflare');
const modules=['worker.mjs','client-version.mjs','account.mjs','chat.mjs','chat-language.mjs','combat.mjs','shared-world.mjs','world-rules.mjs','test-config.mjs','skills.mjs','cooperative-boss.mjs','arena-enemies.mjs'].map(path=>({type:'ESModule',path,contents:readFileSync(new URL('./'+path,import.meta.url),'utf8')}));
const persist=mkdtempSync(join(tmpdir(),'cosmos-parity-')),options={modules,compatibilityDate:process.env.COSMOS_COMPAT_DATE||'2026-10-11',compatibilityFlags:['nodejs_compat'],serviceBindings:{PLAY_IDENTITY:request=>fixtureIdentity.fetch(request)},durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},durableObjectsPersist:persist,ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
const create=()=>authenticateFixtureRequests(new MF.Miniflare(MF.convertV4MiniflareOptions?MF.convertV4MiniflareOptions(options):options));
let mf=create();const connections=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
const roster={aurora:{maxHp:100000,maxEnergy:500,attack:1000,defense:500,speed:5000,level:105}};
async function connect(realm,key){
 const r=await mf.dispatchFetch('https://arena.test/world/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({realm,guestKey:key,roster})});assert.equal(r.status,200);const ticket=await r.json();
 const res=await mf.dispatchFetch('https://arena.test/world/socket?realm='+realm,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+ticket.token}});assert.equal(res.status,101);const ws=res.webSocket;ws.accept();const c={ws,id:ticket.playerId,realm,key,seq:0,messages:[]};ws.addEventListener('message',e=>c.messages.push(JSON.parse(e.data)));connections.push(c);return c;
}
const last=c=>c.messages.findLast(m=>m.type==='world');
async function wait(c,predicate,timeout=7000){const end=Date.now()+timeout;while(Date.now()<end){const s=last(c);if(s&&predicate(s))return s;await pause(15)}throw Error('Missing '+c.realm+' state')}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
const enemy=(s,realm)=>realm==='test'?s.enemies[0]:s.boss;
try{
 const pilots=[];
 for(const [realm,key] of [['normal','a'.repeat(64)],['test','b'.repeat(64)]]){
  const c=await connect(realm,key);pilots.push(c);let s=await wait(c,s=>s.players.length===1);assert.equal(s.rules.capacity,24);assert.equal(s.enemies.length,realm==='test'?4:0);
  const pos=[...enemy(s,realm).pos],at=s.serverTime;
  // No ping/input is sent: both realms must keep publishing and patrolling.
  s=await wait(c,s=>s.serverTime>=at+350);assert.notDeepEqual(enemy(s,realm).pos,pos,realm+' patrol must advance while the client is silent');
  for(let i=0;i<35;i++){
   s=last(c);const p=s.players.find(p=>p.id===c.id),b=enemy(s,realm),goal=b.pos.map((v,j)=>v+(j===2?500:0)),d=goal.map((v,j)=>v-p.pos[j]),len=Math.hypot(...d);
   if(len<100)break;send(c,{type:'input',seq:++c.seq,move:d.map(v=>v/(len||1)*Math.min(1,len/750)),aim:[0,0],firing:false});await pause(120);
  }
  s=last(c);const p=s.players.find(p=>p.id===c.id),b=enemy(s,realm),d=b.pos.map((v,i)=>v-p.pos[i]),len=Math.hypot(...d);assert(!p.protected);assert(len<1000);
  c.bossId=b.id;c.instanceId=b.instanceId;c.originalHp=b.hp;
  send(c,{type:'volley',weapon:'laser',targetId:b.id,shots:[{offset:[0,0,0],direction:d.map(v=>v/len)}]});
  s=await wait(c,s=>enemy(s,realm).hp<c.originalHp);c.savedHp=enemy(s,realm).hp;
  send(c,{type:'leave'});await pause(80);c.ws.close();
  // Restart immediately for this realm, before the intentional 3s boss regeneration.
  await mf.dispose();mf=create();
  const re=await connect(c.realm,c.key),restored=await wait(re,s=>s.players.length===1);assert.equal(enemy(restored,c.realm).instanceId,c.instanceId);assert.equal(enemy(restored,c.realm).hp,c.savedHp,'last disconnect flushes boss damage before the five-second checkpoint');
  send(re,{type:'leave'});await pause(80);re.ws.close();
 }
 console.log('PASS normal/test: autonomous 10Hz updates, silent-client patrol, real projectile damage, isolated content, disconnect flush and SQLite restart/reconnect');
}finally{for(const c of connections)try{c.ws.close()}catch{}await mf.dispose();rmSync(persist,{recursive:true,force:true})}
