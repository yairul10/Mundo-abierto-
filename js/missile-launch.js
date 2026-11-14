const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Shared by players and practice bots: a fan launch followed by normal guidance.
// The target stays the ship's current position; this does not add aim error.
export function missileLaunches(origin,forward,target,count,random=Math.random){
 let right=unit(cross(forward,[0,1,0]));if(Math.hypot(...right)<.1)right=[1,0,0];
 const up=unit(cross(right,forward)),out=[];
 for(let i=0;i<count;i++){
  const angle=(i*2.399963229728653+random()*.95)%(Math.PI*2),spread=.95+random()*.85,lateral=Math.cos(angle),vertical=Math.sin(angle);
  const ahead=30+random()*35,side=lateral*(45+random()*55),height=vertical*(35+random()*65);
  const offset=forward.map((v,j)=>v*ahead+right[j]*side+up[j]*height);
  const toward=unit(target.map((v,j)=>v-origin[j]-offset[j])),push=.28+random()*.45;
  const direction=unit(toward.map((v,j)=>v*.32+right[j]*lateral*spread+up[j]*vertical*spread*.85+forward[j]*push));
  out.push({offset,direction,speed:440+random()*410,delay:.42+random()*.8});
 }
 return out;
}
