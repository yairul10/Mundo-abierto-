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
export function matchPoints(mode,place,won,eligible=true){if(!eligible)return 0;return mode==='arena20'?(place===1&&won?50:Math.max(0,20-place)):won?50:0}
