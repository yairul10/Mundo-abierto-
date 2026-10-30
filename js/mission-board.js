// One persistent board: automatic progress, level unlocks and one-time rewards.
export function createMissionBoard(catalog,quests={}){
 const state=quests.board&&typeof quests.board==='object'?quests.board:{version:1,completed:[],progress:{},flags:{}};
 const known=new Set(catalog.map(m=>m.id));
 state.completed=[...new Set((Array.isArray(state.completed)?state.completed:[]).filter(id=>known.has(id)))];
 state.progress=state.progress&&typeof state.progress==='object'?state.progress:{};state.flags=state.flags&&typeof state.flags==='object'?state.flags:{};
 if(!quests.board){
  for(const m of catalog){
   if(m.legacySector){const c=quests[m.legacySector]||{};
    if(m.legacyIndex<(Number(c.index)||0))state.completed.push(m.id);
    else if(m.legacyIndex===(Number(c.index)||0)){state.progress[m.id]=[Number(c.progress)||0];state.flags[m.id]={docked:!!c.docked,edgeVisited:!!c.edgeVisited}}
   }else if(m.legacyContract){const c=quests.contracts||{};
    if(c.completed?.includes(m.legacyContract))state.completed.push(m.id);
    if(c.active===m.legacyContract)state.progress[m.id]=Array.isArray(c.progress)?c.progress:[];
   }
  }
 }
 state.completed=[...new Set(state.completed)];quests.board=state;
 for(const m of catalog)state.progress[m.id]=m.objectives.map((o,i)=>Math.max(0,Math.min(o.goal,Math.floor(Number(state.progress[m.id]?.[i])||0))));
 function remaining(level){for(const m of catalog.filter(m=>m.realm==='pvp'))if(quests.pvpMissions?.completed?.includes(m.id)){if(!state.completed.includes(m.id))state.completed.push(m.id);state.progress[m.id]=m.objectives.map(o=>o.goal)}return catalog.filter(m=>level>=m.level&&!state.completed.includes(m.id)).sort((a,b)=>a.level-b.level)}
 function event(type,sector,level,inventory={}){
  const awards=[];
  for(const m of remaining(level).filter(m=>m.realm!=='pvp')){
   const flags=state.flags[m.id]||(state.flags[m.id]={}),progress=state.progress[m.id];
   m.objectives.forEach((o,i)=>{
    if(o.sector&&o.sector!==sector)return;
    if(o.event==='drone'){progress[i]=Math.max(progress[i],Math.min(o.goal,inventory.drones||0));return}
    if(o.event==='missileUpgrade'){progress[i]=Math.max(progress[i],inventory.missiles>0?1:0);return}
    if(o.event==='baseUpgrade'){if(type==='dock'){flags.docked=true;progress[i]=Math.max(progress[i],1)}if(type==='upgrade'&&flags.docked)progress[i]=2;return}
    if(o.event==='edgeReturn'){if(type==='edgeNear'){flags.edgeVisited=true;progress[i]=1}if(type==='baseReturn'&&flags.edgeVisited)progress[i]=2;return}
    if(o.event===type)progress[i]=Math.min(o.goal,progress[i]+1);
   });
   if(m.objectives.every((o,i)=>progress[i]>=o.goal)){state.completed.push(m.id);awards.push(m)}
  }
  return awards;
 }
 return {state,remaining,event,nextLevel:level=>Math.min(...catalog.filter(m=>m.level>level&&!state.completed.includes(m.id)).map(m=>m.level))};
}
export const CEMETERY_MISSIONS=[
 {id:'cemetery-arrival',level:40,title:'Explora el Cementerio',reward:12000,xp:2500,objectives:[{event:'travelGraveyard',sector:'graveyard',goal:1,label:'Viaja al Cementerio de Naves'}]},
 {id:'cemetery-refuge',level:40,title:'Estación Recuperación',reward:15000,xp:3000,objectives:[{event:'dock',sector:'graveyard',goal:1,label:'Aterriza en la estación Recuperación'}]},
 {id:'cemetery-supply',level:40,title:'Recupera los restos',reward:30000,xp:6000,objectives:[{event:'loot',sector:'graveyard',goal:40,label:'Cajas recogidas en el Cementerio'}]},
 {id:'cemetery-edge',level:42,title:'Fronteras del Cementerio',reward:25000,xp:5000,objectives:[{event:'edgeReturn',sector:'graveyard',goal:2,label:'Visita el borde y regresa a la base'}]},
 {id:'cemetery-catapult',level:40,title:'Desarma la artillería',reward:200000,xp:30000,objectives:[{event:'catapult',sector:'graveyard',goal:80,label:'Catapultas destruidas'}]},
 {id:'cemetery-harpoon',level:45,title:'Rompe el bloqueo',reward:250000,xp:40000,objectives:[{event:'harpooner',sector:'graveyard',goal:100,label:'Arponeros destruidos'}]},
 {id:'cemetery-stalker',level:50,title:'Silencia a los Acechadores',reward:250000,xp:40000,objectives:[{event:'stalker',sector:'graveyard',goal:80,label:'Acechadores destruidos'}]},
 {id:'cemetery-fleet',level:55,title:'Financia tu nueva flota',reward:500000,xp:80000,objectives:[{event:'catapult',sector:'graveyard',goal:150,label:'Catapultas'},{event:'harpooner',sector:'graveyard',goal:150,label:'Arponeros'},{event:'stalker',sector:'graveyard',goal:100,label:'Acechadores'}]},
 {id:'cemetery-titans',level:60,title:'Dominio sobre los Titanes',reward:300000,xp:100000,objectives:[{event:'granTitan',sector:'graveyard',goal:5,label:'Grandes Titanes destruidos'}]}
];
