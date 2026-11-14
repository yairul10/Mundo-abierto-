export function mountPvpZones(T,scene){
 const root=new T.Group();scene.add(root);
 for(const [radius,color]of [[650,0x72dfff],[3275,0x71f5a4],[5900,0xff6c79]]){
  for(const y of [0]){const points=Array.from({length:192},(_,i)=>{const a=i/192*Math.PI*2;return new T.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius)});root.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.12})))}
  const wall=new T.Mesh(new T.CylinderGeometry(radius,radius,2200,128,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.018,side:T.DoubleSide,depthWrite:false}));wall.position.y=0;root.add(wall);
 }
 return root;
}


export function mountPvpArena(T,scene){
 const root=new T.Group();scene.add(root);
 for(const y of [-900,0,900]){const points=Array.from({length:128},(_,i)=>{const a=i/128*Math.PI*2;return new T.Vector3(Math.cos(a)*2200,y,Math.sin(a)*2200)});root.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:y?0x8368f5:0x54dfff,transparent:true,opacity:y?.12:.35})))}
 const wall=new T.Mesh(new T.CylinderGeometry(2200,2200,1800,96,1,true),new T.MeshBasicMaterial({color:0x6864e6,transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false}));root.add(wall);return root;
}
