import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const files=['worker.mjs','combat.mjs','shared-world.mjs','world-rules.mjs'];
const mf=new Miniflare(convertV4MiniflareOptions({modules:files.map(path=>({type:'ESModule',path,contents:readFileSync(new URL('./'+path,import.meta.url),'utf8')})),compatibilityDate:'2026-10-11',compatibilityFlags:['nodejs_compat'],durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}}));
const post=async(path,data)=>{const r=await mf.dispatchFetch('https://arena.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}};
const pause=ms=>new Promise(r=>setTimeout(r,ms)),connections=[];
async function connect(ticket){const r=await mf.dispatchFetch('https://arena.test/world/socket',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-world-v1,'+ticket}});if(r.status!==101)return {status:r.status};const ws=r.webSocket;ws.accept();const messages=[];ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));connections.push(ws);return {status:r.status,ws,messages}}
async function waitFor(c,predicate){const end=Date.now()+3500;while(Date.now()<end){const found=c.messages.findLast(predicate);if(found)return found;await pause(10)}throw Error('Missing socket message: '+JSON.stringify(c.messages.at(-1)))}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
try{
 const h=await mf.dispatchFetch('https://arena.test/health');assert.equal((await h.json()).version,'0.3.0');
 assert.equal((await mf.dispatchFetch('https://arena.test/health',{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await post('/rooms',{})).status,410);assert.equal((await post('/matchmake',{})).status,410);
 assert.equal((await post('/world/join',{guestKey:'bad'})).status,409);
 const a=(await post('/world/join',{guestKey:'a'.repeat(64),name:'Piloto A',shipId:'aurora',profile:{attack:99999}})).body;
 const b=(await post('/world/join',{guestKey:'b'.repeat(64),name:'Piloto B',shipId:'aurora'})).body;
 const c=(await post('/world/join',{guestKey:'c'.repeat(64),name:'Neutral',shipId:'segadora'})).body;
 assert.notEqual(a.playerId,b.playerId);assert.equal((await connect('invalid')).status,403);
 const x=await connect(a.token),y=await connect(b.token),z=await connect(c.token);assert.equal(x.status,101);assert.equal((await connect(a.token)).status,409);
 let state=await waitFor(x,m=>m.type==='world'&&m.players.length===3);assert.equal(state.players.find(p=>p.id===a.playerId).profile.attack,88);assert(!JSON.stringify(state).includes(a.token));assert(!JSON.stringify(state).includes('a'.repeat(64)));
 assert.equal((await post('/world/join',{guestKey:'a'.repeat(64)})).body.error,'already_connected');
 send(x,{type:'invite',target:b.playerId});assert.equal((await waitFor(x,m=>m.type==='error')).error,'safe_zone');
 const initialX=state.players.find(p=>p.id===a.playerId).pos[0];
 send(x,{type:'input',seq:0,move:[999,0,0],pos:[800,0,0]});send(x,{type:'ping',time:1});await waitFor(x,m=>m.type==='pong'&&m.echo===1);state=x.messages.findLast(m=>m.type==='world');assert.equal(state.players.find(p=>p.id===a.playerId).pos[0],initialX);
 // Both fly out of the base using server-integrated movement, never client positions.
 for(let seq=1;seq<=52;seq++){await pause(100);send(x,{type:'input',seq,move:[1,0,0],aim:[0,0]});send(y,{type:'input',seq,move:[.8,0,.6],aim:[0,0]})}
 state=await waitFor(x,m=>m.type==='world'&&m.players.find(p=>p.id===a.playerId).pos[0]>650);
 assert(Math.hypot(...state.players.find(p=>p.id===b.playerId).pos)>650);
 send(x,{type:'invite',target:b.playerId});state=await waitFor(y,m=>m.type==='world'&&m.invites.length===1);const invitation=state.invites[0];
 send(z,{type:'reply',id:invitation.id,accept:true});await waitFor(z,m=>m.type==='error'&&m.error==='invite_expired');
 send(y,{type:'reply',id:invitation.id,accept:true});state=await waitFor(x,m=>m.type==='world'&&m.duels.length===1);const hp=state.players.find(p=>p.id===b.playerId).hp;
 send(x,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:[1,0,0]}]});send(x,{type:'ping',time:2});await waitFor(x,m=>m.type==='pong'&&m.echo===2);assert.equal(x.messages.findLast(m=>m.type==='world').players.find(p=>p.id===b.playerId).hp,hp);
 await pause(3100);state=x.messages.findLast(m=>m.type==='world');const p=state.players.find(p=>p.id===a.playerId),q=state.players.find(p=>p.id===b.playerId),delta=q.pos.map((v,i)=>v-p.pos[i]),len=Math.hypot(...delta);
 send(x,{type:'volley',weapon:'laser',shots:[{offset:[0,0,0],direction:delta.map(v=>v/len)}],damage:99999});
 for(let i=0;i<25;i++){await pause(30);send(y,{type:'ping',time:100+i})}
 state=await waitFor(y,m=>m.type==='world'&&m.players.find(p=>p.id===b.playerId).hp<hp);assert.equal(state.players.find(p=>p.id===c.playerId).hp,state.players.find(p=>p.id===c.playerId).profile.maxHp);
 send(z,{type:'ship',shipId:'bastion'});state=await waitFor(z,m=>m.type==='world'&&m.players.find(p=>p.id===c.playerId).profile.shipId==='bastion');assert.equal(state.players.find(p=>p.id===c.playerId).hp,1225);
 x.ws.close();state=await waitFor(y,m=>m.type==='world'&&m.duels.length===0&&m.events.some(e=>e.reason==='disconnect'));assert.equal(state.players.find(p=>p.id===b.playerId).hp,hp);
 const again=(await post('/world/join',{guestKey:'a'.repeat(64),name:'Regreso'})).body;assert.equal(again.playerId,a.playerId);assert.notEqual(again.token,a.token);
 console.log('Passed: retired prototype, guest identity, three players in one world, authentication, server movement/loadouts, invitation consent/countdown, authoritative damage, neutral immunity, base ship switch, disconnect and return identity.');
}finally{for(const ws of connections)try{ws.close()}catch{}await mf.dispose()}
