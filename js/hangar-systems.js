export const RECIPE=Object.freeze({credits:20000,chatarra:200,aleacion:70,nucleo:25,reliquia:8});
export const FORMATIONS=Object.freeze([
 {id:'fan',name:'Abanico',icon:'↗',color:'#78dbff',benefit:'Gratis · Formación inicial',description:'Parejas abiertas a ambos lados de la nave.'},
 {id:'shield',name:'Escudo giratorio',icon:'◉',color:'#66dfff',benefit:'−15 % de daño recibido',description:'Un dron central y los demás girando delante de la nave.'},
 {id:'spear',name:'Punta de lanza',icon:'△',color:'#ffc76c',benefit:'+20 % de daño de drones',description:'Una V estrecha que concentra la escolta delante de la nave.'},
 {id:'fortress',name:'Fortaleza',icon:'◎',color:'#88afff',benefit:'+15 % de vida máxima',description:'Los drones rodean la nave y giran a su alrededor.'},
 {id:'hunter',name:'Cazadora',icon:'◇',color:'#c095ff',benefit:'+15 % de alcance de drones',description:'Un rombo que rodea la nave.'},
 {id:'drive',name:'Propulsora',icon:'⌁',color:'#65edff',benefit:'+12 % de velocidad',description:'Cuatro parejas alrededor de la nave con movimiento en arcos.'},
 {id:'recovery',name:'Recuperación',icon:'✧',color:'#84ffaf',benefit:'+25 % de reparación del robot',description:'Dos arcos de drones a los costados del casco. Requiere robot reparador para la ventaja.'}
]);
export const BOOSTERS=Object.freeze([
 {id:'damage',name:'Potencia de combate',icon:'⚡',price:10000,benefit:'+15 % de daño',seconds:900},
 {id:'resistance',name:'Protección reforzada',icon:'🛡',price:10000,benefit:'−15 % de daño recibido',seconds:900},
 {id:'xp',name:'Aprendizaje acelerado',icon:'⭐',price:15000,benefit:'+25 % de XP',seconds:900}
]);
export const SELL_PRICES=Object.freeze({chatarra:15,aleacion:45,nucleo:120,reliquia:400});
const count=v=>Math.max(0,Math.floor(Number(v)||0));
export function normalizeHangar(p){
 p.formations=Object.fromEntries(FORMATIONS.filter(f=>f.id==='fan'||p.formations?.[f.id]===true).map(f=>[f.id,true]));
 p.droneFormation=p.formations[p.droneFormation]?p.droneFormation:'fan';
 p.boosters=Object.fromEntries(BOOSTERS.map(b=>[b.id,Math.max(0,Math.min(86400,Number(p.boosters?.[b.id])||0))]));
}
export function formationBonus(p,offline=true){
 const id=offline&&count(p.droneCount)>0&&p.formations?.[p.droneFormation]?p.droneFormation:'fan';
 return {hp:id==='fortress'?1.15:1,damage:id==='spear'?1.2:1,resistance:id==='shield'?.85:1,range:id==='hunter'?1.15:1,speed:id==='drive'?1.12:1,repair:id==='recovery'?1.25:1};
}
export function canAssemble(p,id){return id!=='fan'&&FORMATIONS.some(f=>f.id===id)&&!p.formations?.[id]&&count(p.gold)>=RECIPE.credits&&Object.entries(RECIPE).every(([k,v])=>k==='credits'||count(p.loot?.[k])>=v)}
export function assemble(p,id){
 if(!canAssemble(p,id))return false;
 p.gold-=RECIPE.credits;for(const [k,v]of Object.entries(RECIPE))if(k!=='credits')p.loot[k]-=v;
 p.formations[id]=true;return true;
}
export function sellMaterial(p,id,quantity){
 const n=Number(quantity);if(!SELL_PRICES[id]||!Number.isSafeInteger(n)||n<1||count(p.loot?.[id])<n)return false;
 p.loot[id]-=n;p.gold=count(p.gold)+n*SELL_PRICES[id];return true;
}
export function buyBooster(p,id){
 const b=BOOSTERS.find(x=>x.id===id);if(!b||count(p.gold)<b.price||p.boosters[id]+b.seconds>86400)return false;
 p.gold-=b.price;p.boosters[id]+=b.seconds;return true;
}
export function boosterBonus(p,id,offline=true){return offline&&p.boosters?.[id]>0?(id==='damage'?1.15:id==='resistance'?.85:1.25):1}
export function tickBoosters(p,dt,paused){if(paused||!Number.isFinite(dt)||dt<=0)return false;let expired=false;for(const b of BOOSTERS){const old=p.boosters[b.id];p.boosters[b.id]=Math.max(0,old-dt);if(old>0&&!p.boosters[b.id])expired=true}return expired}
// Offsets in the ship's right / forward / up basis. No new models or assets needed.
export function formationOffset(id,i,count,time=0){
 const side=i%2===0?-1:1,pair=Math.floor(i/2),n=Math.max(1,count),angle=time*.42+i*Math.PI*2/n;
 if(id==='shield'){
  if(i===0)return [0,125,12];const a=time*.65+(i-1)*Math.PI*2/Math.max(1,n-1);return [Math.cos(a)*66,125,12+Math.sin(a)*66];
 }
 if(id==='spear')return [side*(40+pair*40),235-pair*42,14];
 if(id==='fortress')return [Math.cos(angle)*170,Math.sin(angle)*170,24+Math.sin(angle)*9];
 if(id==='hunter'){
  const t=i*4/n,edge=Math.floor(t),a=t-edge,points=[[0,230],[190,0],[0,-180],[-190,0],[0,230]];
  return [points[edge][0]*(1-a)+points[edge+1][0]*a,points[edge][1]*(1-a)+points[edge+1][1]*a,18];
 }
 if(id==='drive'){
  const a=pair*Math.PI/2+Math.PI/4,arc=side*.16+Math.sin(time*.75+pair)*.2,r=175+side*18;
  return [Math.cos(a+arc)*r,Math.sin(a+arc)*r,18+Math.sin(time*1.2+pair)*5];
 }
 if(id==='recovery'){const a=(pair-1.5)*.35;return [side*(85+Math.cos(a)*45),Math.sin(a)*185,22+Math.sin(time*1.5+i)*3]}
 return [side*[78,135,195,250][pair],[125,165,190,210][pair],14+Math.sin(time*2+i)*4];
}
