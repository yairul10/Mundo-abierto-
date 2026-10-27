// Cosmos Legacy Google Play Games identity endpoint.
// Deploy as a separate Cloudflare Worker with D1 DB, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and SESSION_SIGNING_KEY bindings.
// Do not deploy over the existing guest backup Worker without routing review.
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const origins=new Set(['https://yairul10.github.io','https://localhost','capacitor://localhost']);
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))}
async function createSession(secret,playerId){const payload=b64(encoder.encode(JSON.stringify({sub:playerId,exp:Math.floor(Date.now()/1000)+86400})));return payload+'.'+b64(await hmac(secret,payload))}
async function sessionPlayer(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');const parts=token.split('.');if(parts.length!==2||parts[0].length>2048)return null;try{const signature=await hmac(env.SESSION_SIGNING_KEY,parts[0]);const actual=unb64(parts[1]);if(actual.length!==signature.length||!(await crypto.subtle.verify('HMAC',await crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SIGNING_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']),actual,encoder.encode(parts[0]))))return null;const data=JSON.parse(new TextDecoder().decode(unb64(parts[0])));if(!data.sub||!Number.isSafeInteger(data.exp)||data.exp<=Date.now()/1000)return null;return data.sub}catch{return null}}
const reply=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{...headers,...(origins.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('origin')||'';
  if(request.method==='OPTIONS'&&origins.has(origin))return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,PUT,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization','vary':'Origin'}});
  if(origin&&!origins.has(origin))return reply({error:'origin_not_allowed'},403);
  const pathname=new URL(request.url).pathname;
  if(!['/v1/play-games/session','/v1/play-games/save','/v1/play-games/me'].includes(pathname))return reply({error:'not_found'},404,origin);
  if(!env.DB||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.SESSION_SIGNING_KEY)return reply({error:'not_configured'},503,origin);
  if(Number(request.headers.get('content-length')||0)>65536)return reply({error:'too_large'},413,origin);
  if(pathname==='/v1/play-games/me'){
   if(request.method!=='GET')return reply({error:'method_not_allowed'},405,origin);
   const playerId=await sessionPlayer(request,env);
   return playerId?reply({authenticated:true,playerId},200,origin):reply({error:'unauthorized'},401,origin);
  }
  if(pathname==='/v1/play-games/save'){
   if(!['GET','PUT'].includes(request.method))return reply({error:'method_not_allowed'},405,origin);
   const playerId=await sessionPlayer(request,env);
   if(!playerId)return reply({error:'unauthorized'},401,origin);
   try{
    if(request.method==='GET'){
     const saved=await env.DB.prepare('SELECT payload,revision,updated_at FROM player_saves WHERE player_id=?').bind(playerId).first();
     return reply({save:saved?{progress:JSON.parse(saved.payload),revision:saved.revision,updatedAt:saved.updated_at}:null},200,origin);
    }
    const raw=await request.text();if(encoder.encode(raw).length>65536)return reply({error:'too_large'},413,origin);
    const input=JSON.parse(raw);
    if(!Number.isSafeInteger(input.revision)||input.revision<0||!input.progress||typeof input.progress!=='object'||Array.isArray(input.progress))return reply({error:'invalid_save'},400,origin);
    const payload=JSON.stringify(input.progress);
    const current=await env.DB.prepare('SELECT revision FROM player_saves WHERE player_id=?').bind(playerId).first();
    if((current?.revision??0)!==input.revision)return reply({error:'revision_conflict',currentRevision:current?.revision??0},409,origin);
    const result=await env.DB.prepare('INSERT INTO player_saves(player_id,save_version,revision,payload,updated_at) VALUES(?,1,1,?,CURRENT_TIMESTAMP) ON CONFLICT(player_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,updated_at=CURRENT_TIMESTAMP WHERE revision=?').bind(playerId,payload,input.revision).run();
    if(result.meta?.changes!==1)return reply({error:'revision_conflict'},409,origin);
    return reply({stored:true,revision:input.revision+1},200,origin);
   }catch{return reply({error:'save_failed'},503,origin)}
  }
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405,origin);
  let input;try{const raw=await request.text();if(raw.length>8192)throw Error('too_large');input=JSON.parse(raw)}catch{return reply({error:'invalid_json'},400,origin)}
  if(typeof input?.code!=='string'||input.code.length<8||input.code.length>4096)return reply({error:'invalid_code'},400,origin);
  try{
   const form=new URLSearchParams({code:input.code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,grant_type:'authorization_code'});
   const exchange=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});
   if(!exchange.ok)return reply({error:'google_authorization_failed'},401,origin);
   const tokens=await exchange.json();
   if(!tokens.access_token)return reply({error:'google_authorization_failed'},401,origin);
   const players=await fetch('https://games.googleapis.com/games/v1/players/me',{headers:{authorization:'Bearer '+tokens.access_token}});
   if(!players.ok)return reply({error:'google_player_unavailable'},401,origin);
   const profile=await players.json();
   const subject=profile.playerId;
   if(typeof subject!=='string'||subject.length<1||subject.length>256)return reply({error:'invalid_player'},401,origin);
   const known=await env.DB.prepare('SELECT player_id FROM player_identities WHERE provider=? AND provider_subject=?').bind('google_play_games',subject).first();
   let playerId=known?.player_id;
   if(!playerId){
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO players(id,display_name) VALUES(?,?)').bind(id,String(profile.displayName||'').slice(0,100)).run();
    await env.DB.prepare('INSERT OR IGNORE INTO player_identities(provider,provider_subject,player_id) VALUES(?,?,?)').bind('google_play_games',subject,id).run();
    const linked=await env.DB.prepare('SELECT player_id FROM player_identities WHERE provider=? AND provider_subject=?').bind('google_play_games',subject).first();
    playerId=linked?.player_id;
   }
   if(!playerId)return reply({error:'identity_unavailable'},503,origin);
   // A short-lived signed session authorizes save access; never trust client-supplied player IDs.
   const grants=(await env.DB.prepare('SELECT ship_id FROM account_ship_grants WHERE player_id=?').bind(playerId).all()).results.map(r=>r.ship_id);
   return reply({authenticated:true,grants,displayName:String(profile.displayName||'').slice(0,100),playerId,sessionToken:await createSession(env.SESSION_SIGNING_KEY,playerId),expiresIn:86400},200,origin);
  }catch{return reply({error:'service_unavailable'},503,origin)}
 }
};
