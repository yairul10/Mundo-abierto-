// PvE recovery stays offline and never creates a PvP transfer.
export function pveRecoveryCost(current,gold){return current?1000:Math.min(100,Math.max(0,Math.floor(Number(gold)||0)))}
export function settlePveRecovery(storage,key,{current,sector,arrival}){
 if(!['aurora','belt','ember','graveyard'].includes(sector)||!arrival||!['x','y','z'].every(k=>Number.isFinite(arrival[k])))throw Error('Destino de rescate inválido.');
 const raw=storage.getItem(key);if(!raw)throw Error('No se encontró tu partida local.');
 const pilot=JSON.parse(raw),gold=Math.max(0,Math.floor(Number(pilot.gold)||0)),cost=pveRecoveryCost(current,gold);
 if(gold<cost)throw Error('No hay créditos suficientes para este rescate.');
 const restored={...pilot,gold:gold-cost,hp:pilot.maxHp,energy:pilot.maxEnergy,sector:current?sector:'aurora',...arrival};
 storage.setItem(key,JSON.stringify(restored));return restored;
}
