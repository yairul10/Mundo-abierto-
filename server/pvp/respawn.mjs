export function requestRespawn(s,p,m){
 if(!p.death||m.deathId!==p.death.id)return 'not_dead';
 if(!['aurora','pvp'].includes(m.destination))return 'invalid_destination';
 if(p.death.bill)return null;
 const gold=Number(m.balance);if(!Number.isSafeInteger(gold)||gold<0||gold>Number.MAX_SAFE_INTEGER-10000)return 'invalid_balance';
 if(m.destination==='pvp'&&gold<5000)return 'insufficient_credits';
 p.death.bill={id:'respawn:'+p.death.id,deathId:p.death.id,destination:m.destination,cost:m.destination==='pvp'?5000:Math.min(gold,1000)};
 s.recoveries[p.id]=p.death;s.critical=true;return null;
}
export function confirmRespawn(s,p,id,reset){
 const bill=p.death?.bill;if(!bill||bill.id!==id)return null;
 delete s.recoveries[p.id];p.death=null;reset(p,true);p.lastRespawn=bill;p.exiting=bill.destination==='aurora';s.critical=true;return bill;
}
