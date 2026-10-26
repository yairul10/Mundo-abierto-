// Replay exactly the simulated frame time, including movement not sent yet.
export function createInputHistory(){
 let sent=[],duration=0,displacement=[0,0,0];
 const sample=()=>({dt:duration,move:duration?displacement.map(v=>v/duration):[0,0,0]});
 return {
  frame(move,dt){const time=Math.max(0,Math.min(.04,dt));duration+=time;for(let i=0;i<3;i++)displacement[i]+=move[i]*time},
  packet(seq){const input={seq,...sample()};sent.push(input);duration=0;displacement=[0,0,0];return input},
  acknowledge(seq){sent=sent.filter(p=>p.seq>seq)},
  pending(){return [...sent,...(duration?[sample()]:[])]},
  reset(){sent=[];duration=0;displacement=[0,0,0]}
 };
}
