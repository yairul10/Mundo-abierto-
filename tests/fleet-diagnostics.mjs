import {fileURLToPath} from 'node:url';
// Diagnostic scenarios, not a prediction of win rates in moving multiplayer combat.
import {writeFileSync} from 'node:fs';
import {fleetMultipliers,LEGACY_STATS} from '../js/fleet-balance.js';
import {SHIP_PREVIEWS} from '../js/ship-preview-catalog.js';
import {enemyBalance} from '../js/enemy-balance.js';
import {titanScale} from '../js/gran-titan.js';
import {makeCombatPlayer,ability,volley,stepCombat,defenseDamage} from '../server/pvp/combat.mjs';
const names=id=>SHIP_PREVIEWS[id].name;
function pilot(id,level,environment,legacy=false){
 const m=legacy?Object.fromEntries(['hp','attack','defense','speed'].map((k,i)=>[k,LEGACY_STATS[id][i]])):fleetMultipliers(id,environment),p={id,connected:true,pos:[0,0,0]};
 makeCombatPlayer(p,{shipId:id,maxHp:Math.round((100+(level-1)*10)*m.hp)*(environment==='pvp'?20:1),maxEnergy:100+(level-1)*5,attack:Math.round((10+(level-1)*2)*m.attack),defense:Math.round((5+level-1)*m.defense),speed:220*m.speed});
 return p;
}
function salvo(p,target,now,drones,random){
 const laser=()=>({offset:[0,0,0],direction:[0,0,1],crit:random()<.15});
 const s={players:[p,target],bullets:[]};
 const shots=volley(s,p,{weapon:'laser',target:target.id,shots:[laser(),laser(),...Array.from({length:drones},()=>({...laser(),kind:'drone'}))]},now)||[];
 const missiles=volley(s,p,{weapon:'missile',target:target.id,shots:[laser()]},now)||[];
 return [...shots,...missiles];
}
function randomGenerator(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
export function duel(a,b,{level=40,abilities=true,drones=0,accuracy=1,seed=1,cooldownMode='current'}={}){
 const p=pilot(a,level,'pvp'),q=pilot(b,level,'pvp'),random=randomGenerator(seed);
 q.pos=[0,0,600];p.profile.droneCount=q.profile.droneCount=drones;
 const s={status:'active',players:[p,q],bullets:[],simTime:10000};
 for(let now=10050;now<=610000;now+=50){
  stepCombat(s,now);
  if(abilities)for(const pilot of [p,q]){
   if(now<(pilot.diagnosticReadyAt||0))continue;
   if(ability(pilot,now)){
    const agile=!['titan','bastion','egida','espectro','segadora','azote'].includes(pilot.profile.shipId);
    if(cooldownMode==='fiveAfterEnd')pilot.diagnosticReadyAt=pilot.abilityUntil+5000;
    else if(cooldownMode==='declared'||cooldownMode==='declaredPlusFive')pilot.diagnosticReadyAt=now+(agile?20000:25000)+(cooldownMode==='declaredPlusFive'?5000:0);
   }
  }
  // Simultaneous landed damage, before deciding a winner; no movement or flight delay.
  const outgoing=[salvo(p,q,now,drones,random),salvo(q,p,now,drones,random)];
  const damage=outgoing.map((shots,i)=>shots.reduce((sum,b)=>sum+(random()<accuracy?defenseDamage(i?p:q,b.damage,now,random):0),0));
  p.hp-=damage[1];q.hp-=damage[0];
  if(p.hp<=0||q.hp<=0)return {winner:p.hp<=0&&q.hp<=0?'draw':p.hp>0?a:b,seconds:(now-10000)/1000};
 }
 return {winner:'timeout',seconds:600};
}
function enemyScenario(id,type,{level=40,pro=false,drones=0,accuracy=1,incomingAccuracy=1,legacy=false}={}){
 const p=pilot(id,level,'pve',legacy),scale=1+Math.max(0,Math.min(105,level)-40)*.02;
 const e=type==='carrier'?{hp:Math.round(40000*Math.min(2.5,1+Math.max(0,level-30)*.02)),damage:150*Math.min(2.5,1+Math.max(0,level-30)*.02),interval:5}:type==='granTitan'?{hp:80000*titanScale(level),damage:320*scale,interval:8}:{...enemyBalance(type,level,pro?4:1),interval:type==='catapult'?6:type==='harpooner'?1:3};
 const target={id:'enemy',connected:true,pos:[0,0,600],hp:e.hp},s={status:'active',players:[p],bullets:[],simTime:10000};
 p.profile.droneCount=drones;let damage=0,nextHit=10000+e.interval*1000,kill=null,dead=null;
 const random=randomGenerator(123);
 for(let now=10050;now<=910000;now+=50){
  stepCombat(s,now);ability(p,now);
  damage+=salvo(p,target,now,drones,random).reduce((sum,b)=>sum+b.damage*accuracy,0);
  if(now>=nextHit){p.hp-=defenseDamage(p,e.damage,now,()=>1)*incomingAccuracy;p.lastHit=now;nextHit+=e.interval*1000;}
  if(dead===null&&p.hp<=0)dead=(now-10000)/1000;
  if(damage>=e.hp){kill=(now-10000)/1000;break}
 }
 return {ship:id,legacy,enemy:type,level,pro,drones,accuracy,incomingAccuracy,enemyHp:e.hp,secondsToDamageBudget:kill,secondsToDeath:dead,canFinishBeforeDeath:kill!==null&&(dead===null||kill<=dead)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
const duelRows=[];
for(const group of [['titan','espectro','agilbasica'],['bastion','segadora','centella'],['egida','azote','vertigo'],['obsidian','egida','azote','vertigo']]){
 for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  if(group[0]==='obsidian'&&i>0)continue;
  for(const abilities of [false,true])for(const drones of [0,8]){
   const results=Array.from({length:30},(_,seed)=>duel(group[i],group[j],{abilities,drones,accuracy:.7,seed:seed+1}));
   duelRows.push({a:group[i],b:group[j],abilities,drones,winsA:results.filter(r=>r.winner===group[i]).length,winsB:results.filter(r=>r.winner===group[j]).length,draws:results.filter(r=>r.winner==='draw').length,timeouts:results.filter(r=>r.winner==='timeout').length,meanSeconds:results.reduce((s,r)=>s+r.seconds,0)/results.length});
  }
 }
}
const enemyRows=[];
for(const id of ['titan','espectro','agilbasica','bastion','segadora','centella'])for(const level of [40,105])for(const type of ['catapult','harpooner','stalker','carrier','granTitan'])for(const drones of [0,8])for(const legacy of [false,true]){
 enemyRows.push(enemyScenario(id,type,{level,drones,legacy}));
 if(!['carrier','granTitan'].includes(type))enemyRows.push(enemyScenario(id,type,{level,drones,pro:true,legacy}));
}
const report={assumptions:{duels:'Reglas reales del servidor para habilidades, disparos, mitigación y energía. Naves quietas, probabilidad independiente de impacto del 70 %, dos láseres principales y un misil por lanzamiento, 30 semillas por caso. Nivel 40. Sin habilidades PvP adicionales, robot, formaciones, potenciadores ni mejoras. Sin vuelo de proyectiles ni maniobras. Las habilidades se activan al estar disponibles con energía suficiente; no se inventa una recarga que el código no aplica.',enemies:'Estadísticas base por nivel, sin mejoras, en niveles 40 y 105; 100 % de impactos salientes y entrantes. Patrones entrantes simplificados: una bomba de Catapulta/6 s, daño de Arponero/1 s, un disparo de Acechador/3 s, un misil de Coloso/5 s y una lanza de Gran Titán/8 s. Sin refuerzos, superposición de áreas, bombas del Titán, regeneración enemiga ni movimiento. El cálculo de daño continúa tras la muerte hipotética del jugador para comparar presupuestos; no representa una victoria completa.'},duels:duelRows,enemies:enemyRows};
writeFileSync(new URL('../docs/fleet-diagnostics.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
const lines=['# Diagnóstico de progresión de naves','', 'Escenarios sintéticos; no representan tasas de victoria reales. Fortaleza: Titán reduce 40 %; Bastión reduce 50 %; Égida reduce 60 %. Las otras habilidades y los enemigos se conservan.','', '## Resultado', '', 'La progresión y las conversiones son consistentes, pero el equilibrio no queda aprobado: las defensivas conservan una ventaja grande en los duelos estáticos con habilidades ensayados y Égida vence a Obsidian. Los resultados por pareja, equipamiento y semilla se registran en las tablas siguientes. La movilidad no se representa en estos casos. Tras bajar Fortaleza a 40 % en Titán, 50 % en Bastión y 60 % en Égida, la ventaja defensiva persiste en estos casos; además, las recargas declaradas no se hacen cumplir en la activación actual. No se publican estos cambios en main ni se despliega el servidor.', '', 'Cadete conserva el ID histórico aurora y Aurora conserva el ID agilbasica. Se mantienen modelos, compras, materiales, mejoras base y porcentaje de casco; no se crean naves duplicadas.','', '## Duelos estáticos PvP — nivel 40, 70 % de impactos, 30 semillas por caso','', '| Pareja | Habilidades | Drones | Victorias izquierda | Victorias derecha | Empates / límite |','|---|---|---:|---:|---:|---:|'];
for(const r of duelRows)lines.push(`| ${names(r.a)} / ${names(r.b)} | ${r.abilities?'Sí':'No'} | ${r.drones} | ${r.winsA} | ${r.winsB} | ${r.draws+r.timeouts} |`);
lines.push('','## Comparación de daño PvE — nivel 40, sin drones, un misil por lanzamiento','', '| Nave | Enemigo | Antes (s) | Propuesta (s) | Cambio |','|---|---|---:|---:|---:|');
for(const id of ['bastion','segadora','centella'])for(const enemy of ['carrier','granTitan']){
 const current=enemyRows.find(r=>r.ship===id&&r.enemy===enemy&&r.level===40&&!r.legacy&&!r.drones);
 const old=enemyRows.find(r=>r.ship===id&&r.enemy===enemy&&r.level===40&&r.legacy&&!r.drones);
 lines.push(`| ${names(id)} | ${enemy==='carrier'?'Coloso':'Gran Titán'} | ${old.secondsToDamageBudget?.toFixed(1)} | ${current.secondsToDamageBudget?.toFixed(1)} | ${((current.secondsToDamageBudget/old.secondsToDamageBudget-1)*100).toFixed(1)} % |`);
}
lines.push('','## Límites','',report.assumptions.duels,'',report.assumptions.enemies,'','Los tiempos contra enemigos son presupuestos de daño con patrones simplificados. No certifican que se pueda derrotar a un jefe ni incluyen el valor de la velocidad. No se modificaron enemigos. Fortaleza se ajustó a 40 % en Titán, 50 % en Bastión y 60 % en Égida; duración, energía y las demás habilidades permanecen intactas.','');
writeFileSync(new URL('../docs/fleet-diagnostics.md',import.meta.url),lines.join('\n'));
console.log(JSON.stringify({duelScenarios:duelRows.length,duels:duelRows.length*30,enemyScenarios:enemyRows.length,withAbilitiesAnd8Drones:duelRows.filter(r=>r.abilities&&r.drones===8)},null,2));

}
