import {PVP_MODES} from '../pvp/pvp-teams.mjs';
export const SEARCH_MS=120000,NOTICE_MS=10000,PRESENCE_MS=25000;
export function packTeams(groups,mode){
 const rules=PVP_MODES[mode];if(!rules)return null;
 const teams=rules.freeForAll?Array.from({length:20},()=>[]):[[],[]],selected=[];
 for(const group of groups){
  const candidates=teams.map((members,i)=>({members,i})).filter(t=>t.members.length+group.members.length<=rules.teamSize).sort((a,b)=>a.members.length-b.members.length||a.i-b.i);
  if(!candidates.length)continue;const team=candidates[0];
  const slots=group.members.map((member,index)=>({accountId:member.id,name:member.name,slot:rules.freeForAll?team.i:(team.members.length+index)*2+team.i}));team.members.push(...slots);selected.push(group);
 }
 return {selected,roster:teams.flat(),full:teams.reduce((sum,t)=>sum+t.length,0)===rules.capacity};
}
export function arenaPlacementPoints(place){return Number.isInteger(place)&&place>=1&&place<=20?[100,70,55,45,40,35,30,25,20,15,10,8,6,4,2,0,0,0,0,0][place-1]:0}
export function matchPoints(mode,place,won,eligible=true){if(!eligible)return 0;return mode==='arena20'?arenaPlacementPoints(place):won?50:0}

export function matchAward(mode,row,result){
 const eligible=!!result.combatStartedAt&&row.participated&&result.reason!=='abandoned';
 const won=!!result.winnerTeam&&result.winnerTeam===row.team;
 return {points:matchPoints(mode,row.place,won,eligible),wins:eligible&&won?1:0};
}
