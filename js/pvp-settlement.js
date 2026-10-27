// Persist the debit and its receipt together before allowing the server to respawn.
export function settleRespawn(storage,key,bill){
 if(!bill||typeof bill.id!=='string'||bill.id.length>100||!['aurora','pvp'].includes(bill.destination)||!Number.isSafeInteger(bill.cost)||bill.cost<0||bill.cost>(bill.destination==='pvp'?5000:1000)||bill.destination==='pvp'&&bill.cost!==5000)throw Error('Recibo de rescate inválido.');
 const raw=storage.getItem(key);if(!raw)throw Error('No se encontró tu partida local.');const pilot=JSON.parse(raw),seen=new Set(pilot.pvpRespawnReceipts||[]);
 if(seen.has(bill.id)){if(pilot.pendingPvpDeath?.id===bill.deathId){delete pilot.pendingPvpDeath;pilot.hp=pilot.maxHp;pilot.energy=pilot.maxEnergy;storage.setItem(key,JSON.stringify(pilot))}return pilot;}
 const gold=Math.max(0,Math.floor(Number(pilot.gold)||0));if(gold<bill.cost)throw Error('No hay créditos suficientes para confirmar este rescate.');
 delete pilot.pendingPvpDeath;pilot.gold=gold-bill.cost;if(bill.transfer===true&&bill.destination==='pvp')pilot.pendingPvpTransfer={id:bill.id,cost:bill.cost};seen.add(bill.id);pilot.pvpRespawnReceipts=[...seen];pilot.hp=pilot.maxHp;pilot.energy=pilot.maxEnergy;
 if(bill.destination==='aurora'){pilot.sector='aurora';pilot.x=0;pilot.y=165;pilot.z=-300;}
 storage.setItem(key,JSON.stringify(pilot));return pilot;
}

export function finishPvpTransfer(storage,key,refund=false){
 const raw=storage.getItem(key);if(!raw)return null;const pilot=JSON.parse(raw),pending=pilot.pendingPvpTransfer;if(!pending)return pilot;
 if(refund){if(pending.cost!==5000||!pilot.pvpRespawnReceipts?.includes(pending.id))throw Error('No se pudo comprobar el traslado pendiente.');pilot.gold=(Number(pilot.gold)||0)+pending.cost;pilot.hp=0;}
 delete pilot.pendingPvpTransfer;storage.setItem(key,JSON.stringify(pilot));return pilot;
}
