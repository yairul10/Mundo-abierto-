import {effectBudget} from './effect-budget.js?v=440';
// Local ambient effect only: never emits damage, projectiles or network messages.
export function createCloudLightning(T,scene,uniforms,random=Math.random,{budget=()=>effectBudget('high')}={}){
 const root=new T.Group();root.name='Relámpagos entre nubes';root.visible=false;scene.add(root);
 const core=new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 const glow=new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 let wait=1+random()*2,age=0,duration=1.6,active=false,chainLeft=0,path=[];
 function clear(){for(const child of [...root.children]){root.remove(child);child.geometry.dispose()}root.visible=false}
 function tube(points,radius,material){
  const curve=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(curve,points.length*budget().lightningSegments,radius,3,false),positions=geometry.attributes.position,colors=new Float32Array(positions.count*3);
  const blue=new T.Color(0x438aff),violet=new T.Color(0xb34dff),color=new T.Color();
  for(let i=0;i<positions.count;i++){const blend=.5+.5*Math.sin(positions.getZ(i)*.003+positions.getX(i)*.0017);color.copy(blue).lerp(violet,blend);colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b}
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setDrawRange(0,0);root.add(new T.Mesh(geometry,material));
 }
 function strike(chained=false){
  clear();active=true;age=0;duration=1.2+random()*.8;
  if(!chained)chainLeft=random()<.55?1+Math.floor(random()*2):0;
  uniforms.lightningColor.value.set(0x438aff);uniforms.lightningColor2.value.set(0xb34dff);
  const eye=uniforms.eye.value,direction=-uniforms.cameraWorld.value.elements[10]||-1;
  const z=Math.max(-11500,Math.min(750,eye.z+direction*(1700+random()*1100)));
  const angle=(random()<.5?0:Math.PI)+(random()-.5)*1.05,turn=(random()<.5?-1:1)*(.7+random()*.6),radius=1480+random()*240,length=1800+random()*800,points=[];
  for(let i=0;i<23;i++){const t=i/22,a=angle+turn*(t-.5),r=radius+(random()-.5)*100;points.push(new T.Vector3(Math.cos(a)*r,120+Math.sin(a)*r,Math.max(-12400,Math.min(1150,z+(t-.5)*length+(random()-.5)*100))))}
  path=points;uniforms.lightningPosition.value.copy(points[0]);tube(points,2.5,core);tube(points,11,glow);
  for(const start of [9,16]){const branch=[points[start].clone()];for(let i=1;i<=5;i++)branch.push(points[start].clone().add(new T.Vector3((random()-.5)*220,-i*65+(random()-.5)*90,i*120)));tube(branch,1.4,core);tube(branch,7,glow)}
  // Some discharges also run along the opposite cloud bank.
  if(random()<.4){const second=points.map((p,i)=>new T.Vector3(-p.x,p.y+Math.sin(i*.6)*110,p.z-230));tube(second,1.8,core);tube(second,8,glow)}
  root.visible=true;
 }
 return {
  update(dt){
   dt=Math.max(0,Math.min(.1,Number(dt)||0));uniforms.lightningPower.value=0;
   if(!active){wait-=dt;if(wait<=0){const chained=chainLeft>0;if(chained)chainLeft--;strike(chained)}}
   if(!active)return;
   age+=dt;if(age>=duration){active=false;wait=chainLeft>0?.22+random()*.33:2+random()*3;clear();return}
   const reveal=Math.min(1,age/.65),tail=Math.min(1,(duration-age)/.45),envelope=Math.min(1,age/.08)*tail,pulse=.65+.35*Math.pow(Math.sin(age*9),2);
   for(const mesh of root.children){const count=mesh.geometry.index.count;mesh.geometry.setDrawRange(0,Math.floor(count*reveal/3)*3)}
   const travel=Math.min(.999,age/(duration*.78))*(path.length-1),index=Math.floor(travel);uniforms.lightningPosition.value.lerpVectors(path[index],path[Math.min(path.length-1,index+1)],travel-index);
   uniforms.lightningPower.value=envelope*pulse*.85;core.opacity=envelope*pulse*.82;glow.opacity=envelope*pulse*.12;
  },
  dispose(){clear();scene.remove(root);core.dispose();glow.dispose();uniforms.lightningPower.value=0}
 };
}

