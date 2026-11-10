// Local ambient effect only: never emits damage, projectiles or network messages.
export function createCloudLightning(T,scene,uniforms,random=Math.random){
 const root=new T.Group();root.name='Relámpagos entre nubes';root.visible=false;scene.add(root);
 const core=new T.MeshBasicMaterial({color:0xe4ecff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 const glow=new T.MeshBasicMaterial({color:0x788dff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 let wait=3+random()*4,age=0,duration=.5,active=false;
 function clear(){for(const child of [...root.children]){root.remove(child);child.geometry.dispose()}root.visible=false}
 function tube(points,radius,material){const curve=new T.CatmullRomCurve3(points);const mesh=new T.Mesh(new T.TubeGeometry(curve,points.length*3,radius,3,false),material);root.add(mesh)}
 function strike(){
  clear();active=true;age=0;duration=.38+random()*.24;
  const violet=random()<.5;uniforms.lightningColor.value.set(violet?0xaa62ff:0x4c8dff);glow.color.copy(uniforms.lightningColor.value);
  const eye=uniforms.eye.value,direction=-uniforms.cameraWorld.value.elements[10]||-1;
  const z=Math.max(-11900,Math.min(850,eye.z+direction*(1700+random()*1100)));
  const angle=(random()<.5?0:Math.PI)+(random()-.5)*1.05,turn=(random()-.5)*.65,radius=1480+random()*240,points=[];
  for(let i=0;i<13;i++){const t=i/12,a=angle+turn*(t-.5),r=radius+(random()-.5)*75;points.push(new T.Vector3(Math.cos(a)*r,120+Math.sin(a)*r,z+(t-.5)*850+(random()-.5)*75))}
  uniforms.lightningPosition.value.copy(points[6]);tube(points,2.2,core);tube(points,10,glow);
  const branch=[points[7].clone()];for(let i=1;i<=4;i++)branch.push(points[7].clone().add(new T.Vector3((random()-.5)*150,-i*45+(random()-.5)*65,i*95)));
  tube(branch,1.3,core);tube(branch,6,glow);root.visible=true;
 }
 return {
  update(dt){
   dt=Math.max(0,Math.min(.1,Number(dt)||0));uniforms.lightningPower.value=0;
   if(!active){wait-=dt;if(wait<=0)strike()}
   if(!active)return;
   age+=dt;if(age>=duration){active=false;wait=6+random()*10;clear();return}
   const envelope=1-age/duration,pulse=age<.055?1:age<.115?.22:age<.20?.82:.40;
   uniforms.lightningPower.value=envelope*pulse;core.opacity=envelope*pulse*.85;glow.opacity=envelope*pulse*.13;
  },
  dispose(){clear();scene.remove(root);core.dispose();glow.dispose();uniforms.lightningPower.value=0}
 };
}
