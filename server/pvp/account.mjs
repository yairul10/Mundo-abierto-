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
