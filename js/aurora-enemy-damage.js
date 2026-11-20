export function auroraEnemyDamage(amount,{sector,level,enemy,pvp=false}){
 const beginner=Number.isFinite(Number(level))&&Number(level)>=1&&Number(level)<=10;
 const ordinary=enemy&&!enemy.pro&&!enemy.bossAdd&&!enemy.titanAdd&&(enemy.type==='scout'||enemy.type==='raider');
 return !pvp&&sector==='aurora'&&beginner&&ordinary?amount*.3:amount;
}
