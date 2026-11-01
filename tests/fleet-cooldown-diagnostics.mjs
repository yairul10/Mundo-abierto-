// Counterfactual cooldowns are imposed by the harness, not by the live game.
import {writeFileSync} from 'node:fs';
import {duel} from './fleet-diagnostics.mjs';
const modes=['current','fiveAfterEnd','declared','declaredPlusFive','all25'];
const labels={all25:'25 s para todas desde activación',current:'Sin recarga aplicada (actual)',fiveAfterEnd:'5 s después de terminar',declared:'25/25/20 s desde activación',declaredPlusFive:'30/30/25 s desde activación'};
const pairs=[['titan','espectro'],['titan','agilbasica'],['espectro','agilbasica'],['bastion','segadora'],['bastion','centella'],['segadora','centella'],['egida','azote'],['egida','vertigo'],['azote','vertigo'],['obsidian','egida'],['obsidian','azote'],['obsidian','vertigo']];
const rows=[];
for(const cooldownMode of modes)for(const drones of [0,8])for(const [a,b] of pairs){
 const results=Array.from({length:30},(_,seed)=>duel(a,b,{level:40,abilities:true,drones,accuracy:.7,seed:seed+1,cooldownMode}));
 rows.push({cooldownMode,a,b,drones,winsA:results.filter(r=>r.winner===a).length,winsB:results.filter(r=>r.winner===b).length,draws:results.filter(r=>r.winner==='draw').length,timeouts:results.filter(r=>r.winner==='timeout').length,meanSeconds:results.reduce((s,r)=>s+r.seconds,0)/results.length});
}
const assumptions='Solo simulación: no cambia las recargas del cliente ni del servidor. Naves quietas, nivel 40 sin mejoras, precisión independiente del 70 %, 30 semillas emparejadas por caso, 0 u 8 drones, un misil por lanzamiento. Habilidades actuales: Fortaleza 40 % Titán, 50 % Bastión y 60 % Égida. Las recargas 25/25/20 y 30/30/25 y 25/25/25 se cuentan desde la activación. La alternativa literal de 5 s se cuenta desde el fin del efecto. No se representan movimiento, alcance táctico, habilidades PvP adicionales, robot ni formaciones. Los resultados no son tasas de victoria de jugadores reales.';
writeFileSync(new URL('../docs/fleet-cooldown-diagnostics.json',import.meta.url),JSON.stringify({assumptions,duels:rows.length*30,rows},null,2)+'\n');
const names={titan:'Titán',espectro:'Espectro',agilbasica:'Aurora',bastion:'Bastión',segadora:'Segadora',centella:'Centella',egida:'Égida',azote:'Azote',vertigo:'Vértigo',obsidian:'Obsidian'};
const lines=['# Comparación de recargas de habilidades','',assumptions,'','Se ejecutan 3.600 duelos sintéticos: 5 opciones × 12 parejas × 2 equipamientos × 30 semillas.','', '| Recarga | Pareja | Drones | Victorias izquierda | Victorias derecha | Empates / límite |','|---|---|---:|---:|---:|---:|'];
for(const r of rows)lines.push(`| ${labels[r.cooldownMode]} | ${names[r.a]} / ${names[r.b]} | ${r.drones} | ${r.winsA} | ${r.winsB} | ${r.draws+r.timeouts} |`);
writeFileSync(new URL('../docs/fleet-cooldown-diagnostics.md',import.meta.url),lines.join('\n')+'\n');
console.log(JSON.stringify({duels:rows.length*30,selected:rows.filter(r=>r.drones===8&&['bastion','obsidian'].includes(r.a))},null,2));
