// Gran Titán: independent moving doors/launchers and telegraphed attack cycle.
export const TITAN_STATS={hp:80000,damage:320,gold:30000,xp:45000,loot:30};
export function titanScale(level){return 1+Math.max(0,Math.min(105,Math.floor(Number(level)||1))-40)*.02}
export function titanPattern(round){return [-3,-2,-1,0,1,2,3].filter(i=>i!==[-2,-1,1,2][Math.abs(round)%4])}
export function titanBombOffsets(round){const a=round*Math.PI/4;return [{x:0,z:0},...[-1,0,1].map(i=>({x:Math.cos(a+i*2*Math.PI/3)*220,z:Math.sin(a+i*2*Math.PI/3)*220}))]}
export function titanPatrolPoint(angle){return {x:Math.cos(angle)*2800,y:120+Math.sin(angle*2)*90,z:Math.sin(angle)*2800}}
export function createGranTitan(T,scene,{position,source=null}={}){
 const root=new T.Group();root.position.copy(position);root.userData.hitRadius=100;root.userData.hitLength=600;scene.add(root);
 const body=new T.Group();body.scale.setScalar(3);root.add(body);
 const metal=new T.MeshStandardMaterial({color:0x555b63,metalness:.8,roughness:.65}),dark=new T.MeshStandardMaterial({color:0x1b242c,metalness:.6,roughness:.7});
 const glow=new T.MeshBasicMaterial({color:0xff9b35});
 const fallback=new T.Mesh(new T.BoxGeometry(72,48,380),dark);body.add(fallback);
 const ports=[];
 for(const side of [-1,1])for(const [i,z]of [125,62,-20,-110].entries()){
  const y=[-9,-16,-20.361,-16][i],width=[43,41,39,36][i],height=[22,20,15,15][i];
  const hinge=new T.Group();hinge.position.set(side*40,y+height/2,z);body.add(hinge);
  const door=new T.Mesh(new T.BoxGeometry(1,height,width),metal);door.position.y=-height/2;hinge.add(door);
  const slide=new T.Group();slide.position.set(side*20,y,z);body.add(slide);
  const base=new T.Mesh(new T.BoxGeometry(15,2,33),dark);slide.add(base);
  const kind=i%2===0?'spear':'bomb';
  for(const dz of kind==='spear'?[-12,-6,0,6,12]:[-8,8]){
   const barrel=new T.Mesh(new T.CylinderGeometry(kind==='spear'?1.1:2.6,kind==='spear'?1.5:3,17,10),metal);barrel.rotation.z=Math.PI/2;barrel.position.set(0,3,dz);slide.add(barrel);
   const muzzle=new T.Mesh(new T.CircleGeometry(kind==='spear'?1:2.4,12),glow);muzzle.rotation.y=side*Math.PI/2;muzzle.position.set(side*8.6,3,dz);slide.add(muzzle);
  }
  ports.push({side,kind,hinge,slide,z});
 }
 function mount(model){fallback.visible=false;const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3()),s=400/size.z;model.scale.multiplyScalar(s);model.position.sub(c.multiplyScalar(s));model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.metalnessMap=null;m.roughnessMap=null;m.metalness=.5;m.roughness=.72;if(m.normalScale)m.normalScale.set(.35,.35)}}});body.add(model)}
 if(source)mount(source);
 function pose(amount,kind){for(const p of ports){const a=p.kind===kind?amount:0;p.slide.visible=a>.5;p.hinge.rotation.z=p.side*Math.PI/2*Math.min(1,a*2);p.slide.position.x=p.side*(20+35*Math.max(0,(a-.5)*2))}}
 function muzzle(kind,side,index=0){const list=ports.filter(p=>p.kind===kind&&p.side===side),p=list[index%list.length];root.updateMatrixWorld(true);return p.slide.localToWorld(new T.Vector3(side*10,3,0))}
 return {root,ports,mount,pose,muzzle};
}
export function createTitanCycle(){return {time:0,round:0,fired:false,kind:'spear'}}
export function advanceTitanCycle(c,dt,active){if(!active){c.time=0;c.fired=false;return {open:0,fire:false}}c.time+=dt;const fire=!c.fired&&c.time>=2.5;if(fire)c.fired=true;const open=c.time<1?0:c.time<2.5?(c.time-1)/1.5:c.time<4?1:Math.max(0,1-(c.time-4)/1.5);if(c.time>=8){c.time=0;c.fired=false;c.round++;c.kind=c.round%2?'bomb':'spear'}return {open,fire}}
