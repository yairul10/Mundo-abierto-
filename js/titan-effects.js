// Lightweight, self-contained projectile visuals. Local +Y is the flight axis.
export function disposeTitanVisual(root){
 const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m)});
 root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
export function createTitanEffects(T,sparkCount=()=>10){
 const metal=()=>new T.MeshStandardMaterial({color:0x8b99a4,metalness:.78,roughness:.4});
 const dark=()=>new T.MeshStandardMaterial({color:0x283747,metalness:.72,roughness:.5});
 const glow=(color=0xffa531,opacity=1)=>new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
 function add(root,geometry,material,y=0){const mesh=new T.Mesh(geometry,material);mesh.position.y=y;root.add(mesh);return mesh}
 function band(root,radius,y,material){const ring=add(root,new T.TorusGeometry(radius,1.2,5,16),material,y);ring.rotation.x=Math.PI/2;return ring}
 function spear(){
  const root=new T.Group(),steel=metal(),armor=dark(),energy=glow();
  add(root,new T.CylinderGeometry(2.8,3.8,46,8),steel);
  add(root,new T.ConeGeometry(7,24,6),steel,34);
  add(root,new T.CylinderGeometry(1.4,1.4,43,6),energy);
  band(root,4.6,21,armor);band(root,4.6,-21,energy);
  for(let i=0;i<4;i++){const fin=add(root,new T.BoxGeometry(1.5,13,8),armor,-15);fin.rotation.y=i*Math.PI/2;fin.position.x=Math.sin(i*Math.PI/2)*5;fin.position.z=Math.cos(i*Math.PI/2)*5}
  const trail=add(root,new T.ConeGeometry(4.8,58,8),glow(0xff7d25,.38),-51);trail.rotation.z=Math.PI;
  const core=add(root,new T.ConeGeometry(1.8,43,6),glow(0xffe9ad,.8),-44);core.rotation.z=Math.PI;
  root.userData.trail=trail;root.userData.core=core;return root;
 }
 function bomb(){
  const root=new T.Group(),steel=metal(),armor=dark(),energy=glow(0xff6934);
  add(root,new T.CylinderGeometry(10,12,24,10),armor);
  add(root,new T.ConeGeometry(10,12,10),steel,18);
  band(root,11,9,steel);band(root,12,-9,steel);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,fin=add(root,new T.BoxGeometry(2,14,9),steel,-7);fin.rotation.y=a;fin.position.x=Math.sin(a)*13;fin.position.z=Math.cos(a)*13;
   const strip=add(root,new T.BoxGeometry(2.4,13,1.3),energy);strip.rotation.y=a;strip.position.x=Math.sin(a)*11;strip.position.z=Math.cos(a)*11}
  add(root,new T.SphereGeometry(4,8,6),glow(0xffd582),25);
  const core=add(root,new T.SphereGeometry(5,8,6),energy,-15);
  const trail=add(root,new T.ConeGeometry(5,27,8),glow(0xff8336,.48),-30);trail.rotation.z=Math.PI;
  root.userData.core=core;root.userData.trail=trail;return root;
 }
 function marker(){
  const root=new T.Group(),rim=new T.Mesh(new T.RingGeometry(146,150,64),glow(0xffa531,.44));root.add(rim);
  const progress=new T.Mesh(new T.RingGeometry(137,141,64),glow(0xffad42,.65));progress.position.z=.2;root.add(progress);
  // A faint silhouette conveys the affected area without a wireframe cage.
  const fill=new T.Mesh(new T.CircleGeometry(146,40),glow(0xff5b29,.018));root.add(fill);
  const ticks=new T.Group();for(let i=0;i<4;i++){const tick=new T.Mesh(new T.PlaneGeometry(3,15),glow(0xffc36e,.8)),a=i*Math.PI/2;tick.position.set(Math.sin(a)*148,Math.cos(a)*148,.5);tick.rotation.z=-a;ticks.add(tick)}root.add(ticks);
  const center=new T.Mesh(new T.RingGeometry(7,9,20),glow(0xffa958,.65));root.add(center);
  root.userData={rim,progress,fill,ticks,center};return root;
 }
 function animateProjectile(root,age,bomb=false){
  const pulse=.85+.15*Math.sin(age*22);root.userData.trail.scale.set(pulse,1+(pulse-1)*.6,pulse);root.userData.core.scale.setScalar(pulse);
  if(bomb)root.rotateY((age-(root.userData.lastAge||0))*1.2);root.userData.lastAge=age;
 }
 function animateMarker(root,age,camera){
  root.quaternion.copy(camera.quaternion);const u=root.userData,progress=Math.max(0,Math.min(1,age/3.5)),urgent=age>2.7;
  u.progress.geometry.setDrawRange(0,Math.max(1,Math.ceil(progress*64))*6);
  u.rim.material.color.setHex(urgent?0xff473b:0xffa531);u.progress.material.color.copy(u.rim.material.color);
  u.rim.material.opacity=(urgent?.55:.32)+.12*Math.sin(age*(urgent?16:6));u.center.scale.setScalar(.85+.25*Math.sin(age*7));u.ticks.rotation.z=age*.15;
 }
 function blast(position){
  const root=new T.Group();root.position.copy(position);
  const shell=new T.Mesh(new T.SphereGeometry(1,16,10),glow(0xff732c,.16));root.add(shell);
  const wave=new T.Mesh(new T.RingGeometry(.93,1,48),glow(0xffbc65,.8));root.add(wave);
  const core=new T.Mesh(new T.SphereGeometry(1,10,8),glow(0xffe1a0,.8));root.add(core);
  const sparks=new T.Group();const count=sparkCount();for(let i=0;i<count;i++){const a=i*2.39996,y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),spark=new T.Mesh(new T.ConeGeometry(1.5,13,4),glow(0xffae5b,.9)),dir=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);spark.userData.direction=dir;spark.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);sparks.add(spark)}root.add(sparks);
  root.userData={shell,wave,core,sparks};return root;
 }
 function animateBlast(root,age,camera){
  const t=Math.min(1,age/.65),u=root.userData,r=150*(1-(1-t)**2);u.shell.scale.setScalar(Math.max(1,r));u.shell.material.opacity=.15*(1-t)**2;u.wave.quaternion.copy(camera.quaternion);u.wave.scale.setScalar(Math.max(1,r));u.wave.material.opacity=.75*(1-t);u.core.scale.setScalar(5+26*t);u.core.material.opacity=.8*(1-t)**3;
  for(const spark of u.sparks.children){spark.position.copy(spark.userData.direction).multiplyScalar(18+130*t);spark.material.opacity=.9*(1-t);spark.scale.y=1+t}
 }
 return {spear,bomb,marker,blast,animateProjectile,animateMarker,animateBlast,dispose:disposeTitanVisual};
}
