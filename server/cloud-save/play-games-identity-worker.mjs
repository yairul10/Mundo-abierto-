// Cosmos Legacy Google Play Games identity endpoint.
// Deploy as a separate Cloudflare Worker with D1 DB, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET bindings.
// Do not deploy over the existing guest backup Worker without routing review.
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const origins=new Set(['https://yairul10.github.io','https://localhost','capacitor://localhost']);
const reply=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{...headers,...(origins.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('origin')||'';
  if(request.method==='OPTIONS'&&origins.has(origin))return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'Content-Type','vary':'Origin'}});
  if(origin&&!origins.has(origin))return reply({error:'origin_not_allowed'},403);
  if(new URL(request.url).pathname!=='/v1/play-games/session'||request.method!=='POST')return reply({error:'not_found'},404,origin);
  if(!env.DB||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)return reply({error:'not_configured'},503,origin);
  if(Number(request.headers.get('content-length')||0)>8192)return reply({error:'too_large'},413,origin);
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
   // Return identity only; save access must require a server-issued authenticated session.
   return reply({authenticated:true,displayName:String(profile.displayName||'').slice(0,100),playerId},200,origin);
  }catch{return reply({error:'service_unavailable'},503,origin)}
 }
};
