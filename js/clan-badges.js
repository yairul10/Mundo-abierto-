export const validClanTag=tag=>typeof tag==='string'&&/^[A-Z0-9]{2,5}$/.test(tag);
export const clanPilotName=(name,tag)=>validClanTag(tag)?'['+tag+'] '+name:name;
export function clanTagNode(tag){if(!validClanTag(tag))return null;const node=document.createElement('span');node.className='clan-tag';node.textContent='['+tag+'] ';return node}
export function renderClanName(node,name,tag){const stamp=JSON.stringify([name,validClanTag(tag)?tag:null]);if(node.dataset.clanStamp===stamp)return;node.dataset.clanStamp=stamp;const badge=clanTagNode(tag);node.replaceChildren(...(badge?[badge]:[]),document.createTextNode(name))}
// Keep identity decorations out of saved names and out of the combat simulation.
export function createClanBadges({getToken,realm='normal',onChange=()=>{},fetcher=fetch,now=()=>Date.now()}){
 let ids=[],lastKey='',nextAt=0,pending=false,generation=0;const badges=new Map();
 const clean=list=>[...new Set(list.filter(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id)))].sort().slice(0,24);
 async function update(list=ids,{force=false}={}){
  ids=clean(list);const key=ids.join(',');if(!ids.length){badges.clear();lastKey='';return}
  if(pending||!force&&key===lastKey&&now()<nextAt)return;pending=true;lastKey=key;nextAt=now()+30000;const wanted=[...ids],version=generation;
  try{const token=await getToken(),response=await fetcher('https://mundo-abierto-pvp.yairul17.workers.dev/clans/badges?realm='+encodeURIComponent(realm),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({ids:wanted}),signal:AbortSignal.timeout(8000),cache:'no-store'});
   if(!response.ok)return;const data=await response.json();if(version!==generation)return;
   for(const id of wanted){const badge=data.badges?.[id];if(validClanTag(badge?.tag))badges.set(id,{tag:badge.tag,name:String(badge.name||'')});else badges.delete(id)}onChange();
  }catch{}finally{pending=false;if(version!==generation)void update(ids,{force:true})}
 }
 function invalidate(){generation++;nextAt=0;void update(ids,{force:true})}
 return {update,invalidate,tag:id=>badges.get(id)?.tag||null,name:id=>badges.get(id)?.name||null};
}
