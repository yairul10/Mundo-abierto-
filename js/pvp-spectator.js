export function spectatorPilots(state,me){
 if(!state?.match||!me||me.hp>0||state.match.status==='finished')return [];
 const alive=state.players.filter(p=>p.id!==me.id&&p.hp>0&&!p.exiting);
 const allies=alive.filter(p=>p.team===me.team);
 return state.match.freeForAll||!allies.length?alive:allies;
}
export function spectatorPilot(state,me,selected){const pilots=spectatorPilots(state,me);return pilots.find(p=>p.id===selected)||pilots[0]||null}
export function nextSpectatorPilot(state,me,selected,step=1){const pilots=spectatorPilots(state,me),index=pilots.findIndex(p=>p.id===selected);return pilots.length?pilots[((index<0?0:index)+step+pilots.length)%pilots.length].id:null}
export function arenaDeathMessage(match){return match?.status==='finished'?'Tu nave fue destruida. La partida terminó.':'Tu nave fue destruida. Puedes observar el combate o volver a tu mapa.'}
