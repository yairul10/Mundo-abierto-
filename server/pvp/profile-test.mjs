import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const mf=new Miniflare(convertV4MiniflareOptions({modules:[{type:'ESModule',path:'worker.mjs',contents:readFileSync(new URL('./worker.mjs',import.meta.url),'utf8')},{type:'ESModule',path:'combat.mjs',contents:readFileSync(new URL('./combat.mjs',import.meta.url),'utf8')}],compatibilityDate:'2026-10-11',compatibilityFlags:['nodejs_compat'],durableObjects:{ROOMS:{className:'ArenaRoom',useSQLite:true},LOBBIES:{className:'ArenaLobby',useSQLite:true}},ratelimits:{API_LIMIT:{namespace_id:'310026',simple:{limit:100,period:60}}}}));
const post=async(path,data)=>{const r=await mf.dispatchFetch('https://arena.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const connections=[];
async function connect(room,ticket){const r=await mf.dispatchFetch('https://arena.test/rooms/'+room+'/socket',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'mundo-v1,'+ticket}});if(r.status!==101)return {status:r.status};const ws=r.webSocket;ws.accept();const messages=[];ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));connections.push(ws);return {status:r.status,ws,messages}}
async function waitFor(c,predicate){const end=Date.now()+2500;while(Date.now()<end){const found=c.messages.findLast(predicate);if(found)return found;await pause(10)}throw Error('Missing expected socket message')}
try{
 const profileA={hp:400,maxHp:500,energy:80,maxEnergy:100,attack:80,defense:20,speed:100,shipId:'aurora',level:10,droneCount:2,upgrades:{missiles:2}};
 const profileB={...profileA,hp:200,maxHp:300,defense:0,attack:10};
 const a=(await post('/rooms',{name:'A',profile:profileA})).body,b=(await post('/rooms/'+a.room+'/join',{name:'B',profile:profileB})).body;
 const x=await connect(a.room,a.token),y=await connect(a.room,b.token);
 const initial=await waitFor(x,m=>m.type==='state'&&m.status==='active');const own=initial.players.find(p=>p.id===a.playerId);assert.equal(own.hp,400);assert.equal(own.profile.attack,80);assert.equal(own.profile.speed,100);assert.equal(initial.players.find(p=>p.id===b.playerId).profile.maxHp,300);
 x.ws.send(JSON.stringify({type:'volley',weapon:'laser',shots:[{offset:[0,0,-58],direction:[0,0,-1]},{offset:[0,0,-58],direction:[0,0,-1]}]}));
 await waitFor(y,m=>m.type==='volley'&&m.shots.length===2);
 for(let i=0;i<20;i++){await pause(50);x.ws.send(JSON.stringify({type:'input',seq:i,move:[0,0,0],aim:[0,0],firing:false}));}
 const hit=await waitFor(y,m=>m.type==='state'&&m.players.find(p=>p.id===b.playerId).hp===120);assert.equal(hit.players.find(p=>p.id===a.playerId).hp,400);
 x.ws.send(JSON.stringify({type:'input',seq:21,move:[1,0,0],aim:[.4,.2],firing:false}));const moved=await waitFor(x,m=>m.type==='state'&&m.players.find(p=>p.id===a.playerId).seq===21);assert(moved.players.find(p=>p.id===a.playerId).pos[0]<=15.01);assert.deepEqual(moved.players.find(p=>p.id===a.playerId).aim,[.4,.2]);
 x.ws.send(JSON.stringify({type:'leave'}));assert.equal((await waitFor(y,m=>m.type==='state'&&m.status==='finished')).winner,b.playerId);
 console.log('PASS full server: local profiles, distinct hull/damage, server projectile impacts, speed, orientation and forfeit');
}finally{for(const ws of connections){try{ws.close()}catch{}}await mf.dispose()}
