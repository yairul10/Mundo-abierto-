// Measure local displacement instead of estimating it from send intervals.
// Keep the acknowledged sample so duplicate world broadcasts are harmless.
export function createMovementPrediction(){
 let travel=[0,0,0],samples=new Map([[-1,[0,0,0]]]),stamp='';
 return {
  frame(move,distance){for(let i=0;i<3;i++)travel[i]+=move[i]*distance},
  sent(seq){samples.set(seq,[...travel])},
  reset(seq=-1){travel=[0,0,0];samples=new Map([[seq,[0,0,0]]]);stamp=''},
  acknowledge(seq,pos){
   const next=seq+':'+pos.join(','),base=samples.get(seq),fresh=next!==stamp&&!!base;
   if(!base)return {fresh:false,offset:[0,0,0]};
   stamp=next;for(const key of samples.keys())if(key<seq)samples.delete(key);
   return {fresh,offset:travel.map((v,i)=>v-base[i])};
  }
 };
}
// Consume an error once, at frame rate, rather than pulling back on every packet.
export function correctionStep(error,speed,dt){
 const length=Math.hypot(...error);if(!length)return [0,0,0];
 const amount=Math.min(length*(1-Math.exp(-8*Math.max(0,dt))),Math.max(0,speed)*Math.max(0,dt)*.35);
 return error.map(v=>v*amount/length);
}
