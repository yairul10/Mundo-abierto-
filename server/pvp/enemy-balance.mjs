// Six ordinary enemy baselines. Rewards retain the existing level scaling.
export const ENEMY_BASELINES=Object.freeze({
 raider:{hp:70,damage:10,gold:20,xp:36},
 sentinel:{hp:140,damage:20,gold:48,xp:80},
 destroyer:{hp:280,damage:35,gold:100,xp:160},
 catapult:{hp:3000,damage:300,gold:880,xp:1320},
 harpooner:{hp:5000,damage:50,gold:1280,xp:1800},
 stalker:{hp:4000,damage:250,gold:1800,xp:2200}
});
export const PVE_PRO_MULTIPLIER=4;
export const PVP_PRO_MULTIPLIER=PVE_PRO_MULTIPLIER*2;
export function enemyBalance(type,level=105,multiplier=1){
 const b=ENEMY_BASELINES[type];if(!b)return null;
 const n=Math.max(1,Math.floor(Number(level)||1)),advanced=['catapult','harpooner','stalker'].includes(type),stats=advanced?Math.min(2.5,1+Math.max(0,n-40)*.02):Math.min(5,1+(n-1)*.1),reward=Math.min(2.5,1+(n-1)*.035);
 return {hp:Math.round(b.hp*stats)*multiplier,damage:Math.round(b.damage*(advanced?stats:1)*multiplier*1000)/1000,gold:Math.round(b.gold*reward)*multiplier,xp:Math.round(b.xp*reward)*multiplier};
}
