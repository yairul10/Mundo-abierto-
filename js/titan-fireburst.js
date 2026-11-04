// Local VFX only. Fragment clones share the Cemetery's geometries and materials.
export function createTitanFireburst(T,scene,fragments){
 const bursts=[];
 let texture;
 function fireTexture(){
  if(texture)return texture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='lighter';
  const lobes=[[49,64,38],[78,48,29],[80,79,30],[35,45,19],[57,88,21],[94,61,17],[61,35,17]];
  for(const [x,y,r] of lobes){
   const g=ctx.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,'rgba(255,246,206,.95)');
   g.addColorStop(.25,'rgba(255,173,61,.78)');
   g.addColorStop(.55,'rgba(239,75,14,.55)');
   g.addColorStop(.8,'rgba(158,30,5,.23)');
   g.addColorStop(1,'rgba(100,14,2,0)');
   ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  return texture;
 }
 function remove(burst){
  burst.root.removeFromParent();
  for(const flame of burst.flames)flame.mesh.material.dispose();
 }
 function spawn(position,radius,{hull=null,count=0}={}){
  if(bursts.length>=12)remove(bursts.shift());
  const root=new T.Group();root.position.copy(position);scene.add(root);
  const flames=(hull?[[0,0,-.8],[-.32,.18,.45],[.28,-.1,1.18]]:[[0,0,0]]).map(([x,y,z],i)=>{
   const material=new T.SpriteMaterial({map:fireTexture(),transparent:true,depthWrite:false,toneMapped:false,rotation:Math.random()*Math.PI*2});
   const mesh=new T.Sprite(material);
   mesh.position.set(x*radius,y*radius,z*radius);
   if(hull)mesh.position.applyQuaternion(hull.quaternion);
   mesh.visible=i===0;mesh.scale.setScalar(radius*.85);root.add(mesh);
   return {mesh,delay:i*.12,size:radius*(i===2?2.9:2.25)};
  });
  const debris=Array.from({length:count},(_,i)=>{
   const mesh=fragments(i);mesh.scale.multiplyScalar(.44+i%3*.12);
   const angle=i*2.39996,velocity=new T.Vector3(Math.cos(angle),i%2?.28:-.38,Math.sin(angle)).multiplyScalar(105+i*21);
   mesh.position.copy(flames[i%flames.length].mesh.position);
   mesh.visible=false;root.add(mesh);
   return {mesh,velocity,delay:flames[i%flames.length].delay};
  });
  bursts.push({root,flames,debris,age:0,duration:hull?1.65:count>0?1.22:.78});
 }
 function update(dt){
  for(let i=bursts.length-1;i>=0;i--){
   const burst=bursts[i];burst.age+=dt;
   if(burst.age>=burst.duration){remove(burst);bursts.splice(i,1);continue}
   for(const {mesh,delay,size} of burst.flames){
    const t=(burst.age-delay)/.72;mesh.visible=t>=0&&t<1;
    if(!mesh.visible)continue;
    mesh.scale.setScalar(size*(.38+.62*(1-(1-t)**3)));
    mesh.material.opacity=1-Math.max(0,(t-.18)/.82)**1.45;
   }
   for(const {mesh,velocity,delay} of burst.debris){
    const elapsed=Math.min(dt,burst.age-delay);
    if(elapsed<=0)continue;
    mesh.visible=true;mesh.position.addScaledVector(velocity,elapsed);
    mesh.rotation.x+=elapsed*1.8;mesh.rotation.z+=elapsed*(velocity.x>0?2.1:-2.1);
   }
  }
 }
 function clear(){for(const burst of bursts)remove(burst);bursts.length=0}
 return {spawn,update,clear};
}
