export function forward(yaw,pitch){return [-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)]}
export function movement(yaw,pitch,throttle,strafe){const f=forward(yaw,pitch),right=[Math.cos(yaw),0,-Math.sin(yaw)],scale=Math.max(1,Math.hypot(throttle,strafe));return f.map((v,i)=>(v*throttle+right[i]*strafe)/scale)}
export function beamHit(a,b,direction,range,radius){const delta=b.map((v,i)=>v-a[i]),along=delta.reduce((sum,v,i)=>sum+v*direction[i],0);return Math.hypot(...delta)<=range&&along>=0&&Math.hypot(...delta.map((v,i)=>v-along*direction[i]))<=radius}
