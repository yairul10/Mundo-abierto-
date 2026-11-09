function patchFields(previous,patch){
 const next={...previous,...patch.set};
 for(const key of patch.remove)delete next[key];
 return next;
}
function patchEntities(previous,patch){
 const items=new Map(previous.map(item=>[item.id,item]));
 for(const id of patch.remove)items.delete(id);
 for(const item of patch.upsert){
  if(item.full)items.set(item.id,item.full);
  else {
   if(!items.has(item.id))throw Error('Missing snapshot entity');
   items.set(item.id,patchFields(items.get(item.id),item));
  }
 }
 return patch.order.map(id=>{if(!items.has(id))throw Error('Missing snapshot entity');return items.get(id)});
}
// Each connection starts with a full world; WebSocket delivers subsequent frames in order.
export function restoreWorldSnapshot(message,previous){
 if(message.type!=='worldDelta')return message;
 if(!previous)throw Error('Missing initial world snapshot');
 return {...patchFields(previous,message),type:'world',players:patchEntities(previous.players,message.players),enemies:patchEntities(previous.enemies,message.enemies)};
}
