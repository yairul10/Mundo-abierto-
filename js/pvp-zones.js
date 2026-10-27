export function mountPvpZones(T,scene){
 const root=new T.Group();scene.add(root);
 for(const [radius,color]of [[650,0x72dfff],[1800,0x71f5a4],[2950,0xff6c79]]){
  for(const y of [0,180]){const points=Array.from({length:192},(_,i)=>{const a=i/192*Math.PI*2;return new T.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius)});root.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.55})))}
  const wall=new T.Mesh(new T.CylinderGeometry(radius,radius,350,96,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.025,side:T.DoubleSide,depthWrite:false}));wall.position.y=100;root.add(wall);
 }
 return root;
}
