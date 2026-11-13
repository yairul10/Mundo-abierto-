export const EXPEDITION_CAPACITY=5;
export const ROOM_CODE=/^[A-HJ-NP-Z2-9]{6}$/;
export const roomName=(realm,code)=>'coop-'+(realm==='test'?'test':'normal')+'-'+code;
export function roomMembers(s,now=Date.now()){return s.players.filter(p=>!p.coopEliminated&&!p.exiting&&(p.connected||now-p.lastSeen<120000))}
export function expeditionStatus(s,now){return {status:s.room?.status||'active',count:roomMembers(s,now).length,capacity:EXPEDITION_CAPACITY}}
export function advanceExpedition(s,now,reset){
 if(!s.room)return;
 for(const p of s.players){
  if(!p.death||p.coopEliminated||p.coopDeathId===p.death.id)continue;
  p.coopDeathId=p.death.id;p.coopDeaths=(p.coopDeaths||0)+1;delete s.recoveries?.[p.id];
  if(p.coopDeaths>=2){p.coopEliminated=true;p.exiting=true;p.hp=0;p.death=null}
  else {p.death=null;reset(p,true)}
  s.critical=true;
 }
 const members=roomMembers(s,now);s.groups=members.length?[{id:'expedition:'+s.room.code,leader:members[0].id,members:members.map(p=>p.id)}]:[];s.groupInvites=[];
 if(s.room.status==='active'&&s.arenaEnemies?.length&&s.arenaEnemies.every(b=>b.hp<=0)){
  s.room.status='completed';s.room.finishedAt=now;s.critical=true;for(const p of s.players)p.exiting=true;
 }
}
// Divide existing pools; never duplicate credits, XP or integer resources.
export function shareExpeditionRewards(s,b,from){
 const original=s.bossRewards.slice(from).filter(r=>r.bossId===b.instanceId);if(!original.length)return;
 const members=roomMembers(s).filter(p=>p.connected&&p.profile?.shipId!=='adminpod').sort((a,c)=>a.id.localeCompare(c.id));if(!members.length)return;
 const totalDamage=original[0].totalDamage||1,shares=members.map(p=>({id:b.instanceId+':'+p.id,playerId:p.id,bossId:b.instanceId,enemyKind:b.kind==='reinforcement'?b.model:b.kind,damage:b.contributions?.[p.id]||0,totalDamage,amount:0,xp:0,materials:{}}));
 const distribute=(pool,set)=>{const n=shares.length,base=Math.floor(pool/n),remainder=pool%n,start=(s.room.rewardCursor||0)%n;for(let i=0;i<n;i++)set(shares[i],base+((i-start+n)%n<remainder?1:0));s.room.rewardCursor=(start+remainder)%n};
 distribute(original.reduce((n,r)=>n+r.amount,0),(r,n)=>r.amount=n);
 distribute(original.reduce((n,r)=>n+(r.xp||0),0),(r,n)=>r.xp=n);
 const resources={};for(const r of original)for(const [k,v]of Object.entries(r.materials||{}))resources[k]=(resources[k]||0)+v;
 for(const [key,pool]of Object.entries(resources))distribute(pool,(r,n)=>{if(n)r.materials[key]=n});
 s.bossRewards.splice(from,s.bossRewards.length-from,...shares);
}
