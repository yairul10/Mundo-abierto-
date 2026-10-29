// Titles follow the current server-confirmed kills leaderboard, not offline XP.
export const PVP_RANKS=Object.freeze([
 {id:'emperor',name:'Emperador',max:1},
 {id:'general',name:'General',max:3},
 {id:'colonel',name:'Coronel',max:10},
 {id:'lieutenant',name:'Teniente',max:25},
 {id:'commander',name:'Comandante',max:50},
 {id:'captain',name:'Capitán',max:100},
 {id:'sublieutenant',name:'Subteniente',max:Infinity},
 {id:'cadet',name:'Cadete',max:Infinity}
]);
export function pvpRank(stats){
 const {kills=0,position=0}=stats||{};
 if(!(Number(kills)>0)||!Number.isSafeInteger(Number(position))||Number(position)<1)return PVP_RANKS[7];
 return PVP_RANKS.find(r=>position<=r.max);
}
export function rankBadge(stats){
 const rank=pvpRank(stats),badge=document.createElement('span'),i=PVP_RANKS.indexOf(rank);
 badge.className='pvp-rank-badge';badge.setAttribute('role','img');badge.setAttribute('aria-label',rank.name);badge.title=rank.name;
 badge.style.backgroundImage='url("'+new URL('../assets/pvp-ranks/insignias.webp',import.meta.url).href+'")';
 badge.style.backgroundPosition=((i%4)*100/3)+'% '+(i<4?0:100)+'%';return badge;
}
// Avoid rebuilding DOM and reloading images on every world tick.
export function rankedName(element,name,stats,{title=false}={}){
 const rank=pvpRank(stats),stamp=JSON.stringify([name,rank.id,title]);if(element.dataset.rankStamp===stamp)return;
 element.dataset.rankStamp=stamp;element.replaceChildren(rankBadge(stats),document.createTextNode((title?rank.name+' · ':'')+name));
}
