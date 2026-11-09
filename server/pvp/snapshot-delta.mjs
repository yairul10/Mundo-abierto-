// Compare serialized values: worldSnapshot contains references mutated by the next tick.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function changes(current,previous){
 const set={},remove=[];
 for(const key of Object.keys(current))if(!same(current[key],previous[key]))set[key]=current[key];
 for(const key of Object.keys(previous))if(!Object.hasOwn(current,key))remove.push(key);
 return {set,remove};
}
function entities(current,previous){
 const before=new Map(previous.map(item=>[item.id,item])),ids=new Set(current.map(item=>item.id)),upsert=[];
 for(const item of current){
  const old=before.get(item.id);
  if(!old){upsert.push({id:item.id,full:item});continue;}
  const patch=changes(item,old);
  if(Object.keys(patch.set).length||patch.remove.length)upsert.push({id:item.id,...patch});
 }
 return {upsert,remove:previous.filter(item=>!ids.has(item.id)).map(item=>item.id),order:current.map(item=>item.id)};
}
export function snapshotFrames(snapshot,previous){
 const full=JSON.stringify(snapshot),state=JSON.parse(full);
 if(!previous)return {state,full,delta:null};
 const {players,enemies,...rest}=state,{players:oldPlayers,enemies:oldEnemies,...oldRest}=previous;
 const patch=changes(rest,oldRest);
 const delta=JSON.stringify({type:'worldDelta',...patch,players:entities(players,oldPlayers),enemies:entities(enemies,oldEnemies)});
 return {state,full,delta:delta.length<full.length?delta:null};
}
