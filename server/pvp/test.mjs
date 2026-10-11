import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:new URL('./worker.mjs',import.meta.url).pathname,compatibilityDate:'2026-10-11',compatibilityFlags:['nodejs_compat'],durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}}));
const post=async(path,data)=>{const r=await mf.dispatchFetch('https://arena.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const connections=[];
async function connect(room,ticket){const r=await mf.dispatchFetch('https://arena.test/rooms/'+room+'/socket',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-v1,'+ticket}});if(r.status!==101)return {status:r.status};const ws=r.webSocket;ws.accept();const messages=[];ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));connections.push(ws);return {status:r.status,ws,messages}}
async function waitFor(c,predicate){const end=Date.now()+2500;while(Date.now()<end){const found=c.messages.findLast(predicate);if(found)return found;await pause(10)}throw Error('Missing expected socket message')}
try{
 const h=await mf.dispatchFetch('https://arena.test/health');assert.equal((await h.json()).game,'mundo-abierto');
 const denied=await mf.dispatchFetch('https://arena.test/health',{headers:{Origin:'https://evil.example'}});assert.equal(denied.status,403);
 const a=(await post('/rooms',{name:'Piloto A'})).body;assert.match(a.room,/^\d{6}$/);
 const b=(await post('/rooms/'+a.room+'/join',{name:'Piloto B'})).body;
 assert.equal((await post('/rooms/'+a.room+'/join',{name:'Intruso'})).body.error,'room_full');
 assert.equal((await connect(a.room,'invalid')).status,403);
 const x=await connect(a.room,a.token),y=await connect(a.room,b.token);
 assert.equal(x.status,101);assert.equal(y.status,101);assert.equal((await connect(a.room,a.token)).status,409);
 const initial=await waitFor(x,m=>m.type==='state'&&m.status==='active');assert.equal(initial.players.length,2);assert(!JSON.stringify(initial).includes(a.token));
 x.ws.send(JSON.stringify({type:'fire',direction:[0,0,-1],damage:99999,hp:99999}));
 const hit=await waitFor(y,m=>m.type==='state'&&m.players.some(p=>p.id===b.playerId&&p.hp===580));assert.equal(hit.players.find(p=>p.id===a.playerId).hp,600);
 x.ws.send(JSON.stringify({type:'input',seq:0,move:[99999,0,0],pos:[99999,0,0]}));x.ws.send(JSON.stringify({type:'ping',time:1}));await waitFor(x,m=>m.type==='pong'&&m.echo===1);
 x.ws.send(JSON.stringify({type:'input',seq:1,move:[1,0,0]}));const moved=await waitFor(x,m=>m.type==='state'&&m.players.find(p=>p.id===a.playerId).pos[0]>0);assert(moved.players.find(p=>p.id===a.playerId).pos[0]<=33.01);
 x.ws.send(JSON.stringify({type:'leave'}));const finish=await waitFor(y,m=>m.type==='state'&&m.status==='finished');assert.equal(finish.winner,b.playerId);
 const q1=(await post('/matchmake',{name:'Cola A',region:'sa'})).body,q2=(await post('/matchmake',{name:'Cola B',region:'sa'})).body;assert.equal(q1.room,q2.room);assert.equal(q2.matched,true);assert.notEqual(q1.token,q2.token);
 console.log('Passed: health, origins, 2-player rooms, tickets, duplicate connection, server damage, movement bounds, forfeit and matchmaking');
}finally{for(const ws of connections){try{ws.close()}catch{}}await mf.dispose()}
