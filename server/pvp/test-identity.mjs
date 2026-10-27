// Local integration fixtures only. This file is never imported by the deployed Worker.
export const fixtureIdentity={async fetch(request){
 const token=(request.headers.get('Authorization')||'').replace('Bearer fixture-','');
 if(!/^[a-f0-9]{64}$/.test(token))return Response.json({error:'unauthorized'},{status:401});
 const part=token.slice(0,32),playerId=[part.slice(0,8),part.slice(8,12),part.slice(12,16),part.slice(16,20),part.slice(20)].join('-');
 return Response.json({authenticated:true,playerId});
}};
export function authenticateFixtureRequests(mf){
 const original=mf.dispatchFetch.bind(mf);
 mf.dispatchFetch=(url,options={})=>{
  if(new URL(url).pathname==='/world/join'&&typeof options.body==='string'){
   const body=JSON.parse(options.body);options={...options,body:JSON.stringify({...body,clientVersion:3}),headers:{...options.headers,Authorization:'Bearer fixture-'+(body.guestKey||'')}};
  }
  return original(url,options);
 };return mf;
}
