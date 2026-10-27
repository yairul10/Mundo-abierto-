// Only the identity service verifies Google sessions. Client-supplied player IDs are ignored.
export async function verifiedPvpAccount(request,env){
 const token=request.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]{10,4096}$/.test(token))return {error:'google_required',status:401};
 if(!env.PLAY_IDENTITY)return {error:'identity_unavailable',status:503};
 try{
  const response=await env.PLAY_IDENTITY.fetch(new Request('https://identity.internal/v1/play-games/me',{headers:{Authorization:token},signal:AbortSignal.timeout(8000)}));
  if(response.status===401)return {error:'google_required',status:401};
  if(!response.ok)return {error:'identity_unavailable',status:503};
  const data=await response.json();
  if(!data.authenticated||typeof data.playerId!=='string'||!/^[a-f0-9-]{36}$/i.test(data.playerId))return {error:'identity_unavailable',status:503};
  return {playerId:data.playerId};
 }catch{return {error:'identity_unavailable',status:503}}
}

// Possession of the old secret key links pending receipts once to a verified account.
// The public legacy player ID alone is never sufficient to claim them.
export async function migrateGuestRewards(ctx,guestKey,destination){
 if(typeof guestKey!=='string'||!/^[a-f0-9]{64}$/.test(guestKey))return;
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(guestKey));
 const legacy=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS legacy_account_links(legacy_id TEXT PRIMARY KEY,account_player_id TEXT NOT NULL)');
 ctx.storage.transactionSync(()=>{
  const link=ctx.storage.sql.exec('SELECT account_player_id FROM legacy_account_links WHERE legacy_id=?',legacy).toArray()[0];
  if(link&&link.account_player_id!==destination)return;
  ctx.storage.sql.exec('INSERT OR IGNORE INTO legacy_account_links VALUES(?,?)',legacy,destination);
  ctx.storage.sql.exec('UPDATE boss_rewards SET player_id=? WHERE player_id=? AND claimed=0',destination,legacy);
 });
}
