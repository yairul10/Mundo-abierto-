import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const files=['worker.mjs','combat.mjs','shared-world.mjs','world-rules.mjs','test-config.mjs','skills.mjs','cooperative-boss.mjs'];
const options={modules:files.map(path=>({type:'ESModule',path,contents:readFileSync(new URL('./'+path,import.meta.url),'utf8')})),compatibilityDate:'2026-10-11',compatibilityFlags:['nodejs_compat'],durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}};
const mf=new Miniflare(convertV4MiniflareOptions(options)),connections=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const post=async(path,data)=>{const r=await mf.dispatchFetch('https://arena.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}};
async function connect(token,realm='normal'){const r=await mf.dispatchFetch('https://arena.test/world/socket?realm='+realm,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+token}});if(r.status!==101)return {status:r.status};const ws=r.webSocket;ws.accept();const c={ws,messages:[],seq:0,status:r.status};ws.addEventListener('message',e=>c.messages.push(JSON.parse(e.data)));connections.push(ws);return c}
const latest=c=>c.messages.findLast(m=>m.type==='world');
async function waitFor(c,predicate,timeout=4000){const end=Date.now()+timeout;while(Date.now()<end){const state=latest(c);if(state&&predicate(state))return state;await pause(10)}throw Error('Missing state '+JSON.stringify(latest(c)))}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
async function moveTo(c,id,goal){for(let i=0;i<20;i++){const state=await waitFor(c,s=>s.players.some(p=>p.id===id)),p=state.players.find(p=>p.id===id),delta=goal.map((v,i)=>v-p.pos[i]),d=Math.hypot(...delta);if(d<8)return;await pause(110);send(c,{type:'input',seq:++c.seq,move:delta.map(v=>v/d*Math.min(1,d/750)),aim:[0,0],firing:false});await pause(30)}throw Error('Movement failed')}
try{
 assert.equal((await (await mf.dispatchFetch('https://arena.test/health')).json()).version,'0.5.6');
 assert.equal((await mf.dispatchFetch('https://arena.test/health',{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await post('/rooms',{})).status,410);assert.equal((await post('/world/join',{guestKey:'bad'})).status,409);
 const roster={aurora:{maxHp:1000,maxEnergy:500,attack:100,defense:0,speed:5000,level:40}};
 const a=(await post('/world/join',{guestKey:'a'.repeat(64),name:'A',roster})).body,b=(await post('/world/join',{guestKey:'b'.repeat(64),name:'B',roster})).body,c=(await post('/world/join',{guestKey:'c'.repeat(64),name:'C',roster})).body;
 const ca=await connect(a.token),cb=await connect(b.token),cc=await connect(c.token);assert.equal(ca.status,101);assert.equal((await connect('invalid')).status,403);
 let state=await waitFor(ca,s=>s.players.length===3);assert.equal(state.rules.radius,3000);assert.equal(state.rules.safeRadius,650);assert.equal(state.rules.openCombat,true);assert(state.players.every(p=>p.protected));assert(state.players.every(p=>p.profile.maxHp===20000));
 const me=()=>latest(ca).players.find(p=>p.id===a.playerId);
 send(ca,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]});await pause(60);assert(!ca.messages.some(m=>m.type==='volley'),'Cannot fire from protected spawn');
 send(ca,{type:'hangar',open:true});await waitFor(ca,s=>s.players.find(p=>p.id===a.playerId).hangar);send(ca,{type:'loadout',shipId:'aurora',roster});await waitFor(ca,s=>!s.players.find(p=>p.id===a.playerId).hangar);
 await moveTo(ca,a.playerId,[900,120,0]);await moveTo(cb,b.playerId,[1050,120,0]);await moveTo(cc,c.playerId,[1500,120,300]);
 await waitFor(ca,s=>s.players.filter(p=>!p.protected).length===3);assert.equal(latest(ca).duels.length,0);
 const pa=me(),pb=latest(ca).players.find(p=>p.id===b.playerId),delta=pb.pos.map((v,i)=>v-pa.pos[i]),d=Math.hypot(...delta);
 send(ca,{type:'volley',weapon:'laser',targetId:b.playerId,shots:[{offset:[0,0,0],direction:delta.map(v=>v/d)}]});await pause(220);send(cb,{type:'ping',time:1});state=await waitFor(ca,s=>s.players.find(p=>p.id===b.playerId).hp<20000);assert.equal(state.players.find(p=>p.id===c.playerId).hp,20000);
 await moveTo(ca,a.playerId,[300,120,0]);state=await waitFor(ca,s=>Math.hypot(...s.players.find(p=>p.id===a.playerId).pos)<650);assert.equal(me().protected,false,'Entering base does not grant immediate protection');
 send(ca,{type:'hangar',open:true});await pause(50);assert(!me().hangar);
 await pause(2500);send(ca,{type:'volley',weapon:'laser',targetId:b.playerId,shots:[{offset:[0,0,0],direction:[1,0,0]}]});await pause(100);assert.equal(me().protected,false,'Shooting during fixed grace remains allowed');
 await pause(2700);send(ca,{type:'ping',time:2});await waitFor(ca,s=>s.players.find(p=>p.id===a.playerId).protected);assert.equal(me().protected,true,'Protection arrives despite the shot during grace');
 assert.equal(Object.hasOwn(me(),'baseEnteredAt'),false,'No entry deadline/countdown is sent to UI');
 send(ca,{type:'hangar',open:true});await waitFor(ca,s=>s.players.find(p=>p.id===a.playerId).hangar);
 const testTicket=(await post('/world/join',{guestKey:'d'.repeat(64),realm:'test',roster})).body,testClient=await connect(testTicket.token,'test');await waitFor(testClient,s=>s.players.length===1);
 const disabled=new Miniflare(convertV4MiniflareOptions({...options,bindings:{TEST_SERVER_ENABLED:'false'}}));try{const r=await disabled.dispatchFetch('https://arena.test/world/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestKey:'f'.repeat(64),realm:'test'})});assert.equal(r.status,403)}finally{await disabled.dispose()}
 // Two real WebSocket pilots attack the same boss with normal validated volleys.
 const raidRoster={aurora:{maxHp:100000,maxEnergy:500,attack:100000,defense:0,speed:5000,level:40}};
 const e=(await post('/world/join',{guestKey:'e'.repeat(64),name:'E',roster:raidRoster})).body,f=(await post('/world/join',{guestKey:'f'.repeat(64),name:'F',roster:raidRoster})).body;
 const ce=await connect(e.token),cf=await connect(f.token);await waitFor(ce,s=>s.players.some(p=>p.id===f.playerId));
 await moveTo(ce,e.playerId,[-450,120,-1800]);await moveTo(cf,f.playerId,[450,120,-1800]);
 const heartbeat=setInterval(()=>{send(ce,{type:'ping',time:Date.now()});send(cf,{type:'ping',time:Date.now()})},100);
 let rewardE,rewardF;
 try{
  const bossId=latest(ce).boss.id,instanceId=latest(ce).boss.instanceId;assert.equal(latest(ce).boss.hp,1000000);assert.equal(latest(cf).boss.instanceId,instanceId);
  for(let i=0;i<8;i++){
   const pe=latest(ce).players.find(p=>p.id===e.playerId),boss=latest(ce).boss,delta=boss.pos.map((v,j)=>v-pe.pos[j]),length=Math.hypot(...delta);
   send(ce,{type:'volley',weapon:'laser',targetId:bossId,shots:Array.from({length:i<7?2:1},(_,n)=>({offset:[0,n?8:-8,0],direction:delta.map(v=>v/length)}))});
   if(i<3){const pf=latest(cf).players.find(p=>p.id===f.playerId),delta=boss.pos.map((v,j)=>v-pf.pos[j]),length=Math.hypot(...delta);send(cf,{type:'volley',weapon:'laser',targetId:bossId,shots:Array.from({length:i<2?2:1},(_,n)=>({offset:[0,n?8:-8,0],direction:delta.map(v=>v/length)}))})}
   const expected=1000000-Math.min(i+1,7)*100000-(i===7?50000:0)-Math.min(i+1,2)*100000-(i>=2?50000:0);await waitFor(ce,s=>s.boss.hp===expected);
   if(i===0){
    const first=await waitFor(ce,s=>s.boss.lastAttack?.targets?.length===2);assert.deepEqual(new Set(first.boss.lastAttack.targets.map(x=>x.targetId)),new Set([e.playerId,f.playerId]));assert(first.boss.lastAttack.targets.every(x=>x.damage===17250));
    const moved=[...first.boss.pos];send(ce,{type:'ping',time:Date.now()});await pause(250);assert.notDeepEqual(latest(ce).boss.pos,moved,'Server patrol moves shared boss');
    const jump=await waitFor(ce,s=>s.boss.lastTeleport?.seq>=1,22000);await waitFor(cf,s=>s.boss.lastTeleport?.seq===jump.boss.lastTeleport.seq);assert.deepEqual(latest(cf).boss.lastTeleport,jump.boss.lastTeleport);assert.equal(jump.boss.hp,expected,'Jump preserves shared damage');assert(Math.hypot(...jump.boss.pos)>650+180);
   }else if(i<7)await pause(700);
  }
  await waitFor(cf,s=>s.boss.hp===0);assert.equal(latest(ce).boss.instanceId,instanceId);assert(latest(ce).boss.respawnAt>Date.now());
  await pause(3200);rewardE=ce.messages.findLast(m=>m.type==='bossRewards')?.receipts[0];rewardF=cf.messages.findLast(m=>m.type==='bossRewards')?.receipts[0];assert.equal(rewardE.amount,750000);assert.equal(rewardF.amount,250000);assert.equal(rewardE.damage,750000);assert.equal(rewardF.damage,250000);
  assert(!ca.messages.some(m=>m.type==='bossRewards'),'Nonparticipants receive no award');
  send(cf,{type:'bossRewardAck',ids:[rewardE.id]});await pause(100);send(ce,{type:'leave'});await pause(100);
 }finally{clearInterval(heartbeat)}
 const reconnect=(await post('/world/join',{guestKey:'e'.repeat(64),roster:raidRoster})).body,ce2=await connect(reconnect.token);await waitFor(ce2,s=>s.players.some(p=>p.id===e.playerId));await pause(100);
 assert.equal(ce2.messages.find(m=>m.type==='bossRewards').receipts[0].id,rewardE.id,'Pending receipt survives reconnect; another pilot cannot claim it');
 send(ce2,{type:'bossRewardAck',ids:[rewardE.id]});await pause(100);const before=ce2.messages.filter(m=>m.type==='bossRewards').length;await pause(3100);send(ce2,{type:'ping',time:Date.now()});await pause(100);assert.equal(ce2.messages.filter(m=>m.type==='bossRewards').length,before,'ACK prevents redelivery');
 console.log('WebSockets boss: shared patrol/teleports, two-target 17.25k attacks, synchronized HP, two-pilot 75/25 damage split, private durable receipts, reconnect replay and authenticated ACK passed.');
 console.log('WebSockets: shared open arena, protected spawn/hangar, free combat, fixed hidden entry delay, ×20 hull, auth and isolated test realm passed.');
}finally{for(const ws of connections)try{ws.close()}catch{}await mf.dispose()}
