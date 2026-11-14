export const WAR_COUNTDOWN=300000,WAR_ACTIVITY=90000,WAR_HEARTBEAT=25000,WAR_TRAVEL=45000;
export const warSize=mode=>mode==='2v2'?2:mode==='5v5'?5:0;
export function activeWarPilot(p,now){return !!p&&p.activeAt>0&&now-p.seenAt<=WAR_HEARTBEAT&&now-p.activeAt<=WAR_ACTIVITY}
export function shuffledTeams(teams,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){const list=[...teams];for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}
export function warAssignment(event,account){const match=event?.matches?.find(m=>m.allowed?.some(p=>p.accountId===account));return match&&match.status==='active'?{eventId:event.id,code:match.code,mode:event.mode}:null}
export function warTimeWinner(players){const score=team=>{const alive=players.filter(p=>p.team===team&&p.hp>0&&!p.exiting);return [alive.length,alive.reduce((n,p)=>n+(p.hp+(p.shield||0))/Math.max(1,p.profile.maxHp+(p.profile.maxShield||0)),0)]};const a=score('a'),b=score('b');return a[0]!==b[0]?(a[0]>b[0]?'a':'b'):Math.abs(a[1]-b[1])>.000001?(a[1]>b[1]?'a':'b'):null}
