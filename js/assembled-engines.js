// Nozzle centers in the ship's normalized flight frame (forward = -Z).
export const ASSEMBLED_ENGINE_LAYOUTS=Object.freeze({
 titan:{color:0xff9a20,core:0xffd66b,radius:6.7,nozzles:[
  {position:[-19,-3,60],radius:6.7},
  {position:[19,-3,60],radius:6.7},
  {position:[0,9,49],radius:2.3}
 ]},
 espectro:{color:0xff493b,core:0xffc19b,radius:3.5,positions:[[-22,0,43],[22,0,43]]},
 obsidian:{color:0x26e6cf,core:0xc4fff5,radius:2.7,positions:[[-10,-2,51],[10,-2,51]]},
 segadora:{color:0xff493b,core:0xffb28b,radius:4.4,nozzles:[
  {position:[-12.5,5.5,43],direction:[0,0,1],radius:3.6},
  {position:[12.5,5.5,43],direction:[0,0,1],radius:3.6}
 ]},
 bastion:{color:0x398aff,core:0xb3ddff,radius:5.5,positions:[[-26.5,-3.2,56],[26.5,-3.2,56]]},
 centella:{color:0x37dfff,core:0xc1fbff,radius:3.8,positions:[[-25,2,42],[25,2,42]]}
});
export function attachAssembledEngines(THREE,visual,id){
 const layout=ASSEMBLED_ENGINE_LAYOUTS[id];if(!layout)return;
 visual.userData.engineFlames=[];
 const nozzles=layout.nozzles||layout.positions.map(position=>({position}));
 for(const nozzle of nozzles){
  const radius=nozzle.radius??layout.radius;
  const engine=new THREE.Group();engine.position.set(...nozzle.position);
  if(nozzle.direction)engine.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...nozzle.direction).normalize());
  const core=new THREE.Mesh(new THREE.CircleGeometry(radius*.55,20),new THREE.MeshBasicMaterial({color:layout.core,toneMapped:false}));core.position.z=.2;
  const glow=new THREE.Mesh(new THREE.CircleGeometry(radius*1.25,24),new THREE.MeshBasicMaterial({color:layout.color,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.z=.3;
  const geometry=new THREE.ConeGeometry(radius*.7,32,12,1,true);geometry.translate(0,16,0);
  const flame=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:layout.color,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
  flame.rotation.x=Math.PI/2;flame.position.z=.35;flame.visible=false;
  engine.add(core,glow,flame);visual.add(engine);visual.userData.engineFlames.push(flame);
 }
}
