import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const shared=readFileSync(new URL('../js/shared-session.js',import.meta.url),'utf8');
const start=shared.indexOf(' const active=()=>'),end=shared.indexOf(' const skillUI=',start),code=shared.slice(start,end);
const me={id:'me',hp:100,protected:false,hangar:false,zone:'pve'},other={id:'other',hp:100,zone:'pve'},npc={id:'npc',hp:100,zone:'pve'},state={players:[me,other],enemies:[npc]},ws={readyState:1};
const gates=new Function('me','state','ws','WebSocket','performance','lastReceived','selected','bridge','clockOffset',code+';return {active,canFight,canTarget,targetId}')(me,state,ws,{OPEN:1},{now:()=>100},100,'other',{},0);
assert(gates.canFight());assert(!gates.canTarget('other'));assert(gates.canTarget('npc'));me.zone=other.zone='hostile';assert(gates.canTarget('other'));assert(!gates.canTarget('npc'));me.zone='base';assert(!gates.canFight());
me.duelId=other.duelId='duel';me.duelStartsAt=Date.now()-1;assert(gates.canFight());assert(gates.canTarget('other'));assert(!gates.canTarget('npc'));other.duelId=null;assert(!gates.canTarget('other'));me.death={id:'death'};assert(!gates.canFight());
console.log('Client targeting: PvE NPCs, hostile pilots, private duels inside base and dead pilots.');
