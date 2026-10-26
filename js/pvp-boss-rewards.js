// Persist the credits and receipt IDs together before acknowledging the server.
export function applyBossReceipts(source,receipts){
 const pilot=JSON.parse(JSON.stringify(source)),seen=new Set(Array.isArray(pilot.pvpBossReceipts)?pilot.pvpBossReceipts:[]),ids=[];let added=0;
 for(const r of Array.isArray(receipts)?receipts:[]){
  if(!r||typeof r.id!=='string'||r.id.length>100||!Number.isSafeInteger(r.amount)||r.amount<=0||r.amount>1100000)continue;
  const materials=r.materials||{};if(typeof materials!=='object'||Array.isArray(materials)||Object.entries(materials).some(([key,value])=>!['chatarra','aleacion','nucleo','reliquia'].includes(key)||!Number.isSafeInteger(value)||value<0||value>10000))continue;
  ids.push(r.id);if(seen.has(r.id))continue;seen.add(r.id);added+=r.amount;for(const [key,value]of Object.entries(materials)){pilot.loot||={};pilot.loot[key]=(Number(pilot.loot[key])||0)+value;}
 }
 pilot.gold=(Number.isFinite(pilot.gold)?pilot.gold:0)+added;pilot.pvpBossReceipts=[...seen];return {pilot,ids,added};
}
export function saveBossReceipts(storage,key,source,receipts,serialize=p=>p){
 const result=applyBossReceipts(source,receipts);if(!result.ids.length)return result;
 // A failed write must leave the in-memory pilot unchanged and return no ACK.
 storage.setItem(key,JSON.stringify(serialize(result.pilot)));return result;
}
