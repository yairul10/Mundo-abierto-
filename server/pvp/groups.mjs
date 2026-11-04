const GROUP_LIMIT=4;
const INVITE_MS=30000;
const REWARD_RADIUS=1500;
export const groupFor=(world,id)=>world.groups?.find(group=>group.members.includes(id));

export function updateGroups(world,now){
 const online=new Set(world.players.filter(p=>p.connected).map(p=>p.id));
 world.groups=(world.groups||[]).map(group=>({...group,members:group.members.filter(id=>online.has(id))})).filter(group=>group.members.length>1);
 world.groupInvites=(world.groupInvites||[]).filter(invite=>invite.expiresAt>now&&online.has(invite.from)&&online.has(invite.to));
}

export function groupAction(world,pilot,message,now){
 updateGroups(world,now);
 const own=groupFor(world,pilot.id);
 if(message.type==='groupLeave'){
  if(own){own.members=own.members.filter(id=>id!==pilot.id);updateGroups(world,now)}
  world.groupInvites=world.groupInvites.filter(i=>i.from!==pilot.id&&i.to!==pilot.id);
  return null;
 }
 if(message.type==='groupInvite'){
  const target=world.players.find(p=>p.id===message.target&&p.connected);
  if(!target||target.id===pilot.id||groupFor(world,target.id))return 'group_unavailable';
  if(own&&own.members.length>=GROUP_LIMIT)return 'group_full';
  if(world.groupInvites.some(i=>i.from===pilot.id))return 'group_pending';
  world.groupInvites.push({id:crypto.randomUUID(),from:pilot.id,to:target.id,expiresAt:now+INVITE_MS});
  return null;
 }
 const invite=world.groupInvites.find(i=>i.id===message.id&&i.to===pilot.id);
 if(!invite)return 'group_unavailable';
 world.groupInvites=world.groupInvites.filter(i=>i!==invite);
 if(message.accept!==true)return null;
 if(own)return 'group_unavailable';
 const group=groupFor(world,invite.from);
 if(group?.members.length>=GROUP_LIMIT)return 'group_full';
 if(group)group.members.push(pilot.id);
 else world.groups.push({id:crypto.randomUUID(),members:[invite.from,pilot.id]});
 world.groupInvites=world.groupInvites.filter(i=>i.to!==pilot.id);
 return null;
}

export function splitGroupRewards(world,enemy,receipts,eligible){
 for(const group of world.groups||[]){
  const members=group.members.filter(id=>{
   const pilot=world.players.find(p=>p.id===id);
   return pilot&&eligible(pilot)&&enemy.contributions[id]>0&&Math.hypot(...pilot.pos.map((v,i)=>v-enemy.pos[i]))<=REWARD_RADIUS;
  }).sort();
  if(members.length<2)continue;
  const shares=members.map(id=>receipts.find(r=>r.playerId===id)||{
   id:enemy.instanceId+':'+id,bossId:enemy.instanceId,playerId:id,
   damage:enemy.contributions[id],totalDamage:Object.values(enemy.contributions).reduce((sum,value)=>sum+value,0)
  });
  for(const key of ['amount','xp']){
   const total=shares.reduce((sum,r)=>sum+(r[key]||0),0);
   shares.forEach((r,i)=>{r[key]=Math.floor(total/shares.length)+Number(i<total%shares.length)});
  }
  for(const receipt of shares)if(!receipts.includes(receipt)&&(receipt.amount||receipt.xp)){
   if(['colossusPro','granTitanPro'].includes(enemy.kind))receipt.enemyKind=enemy.kind;
   world.bossRewards.push(receipt);
  }
 }
}
