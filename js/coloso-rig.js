// Native GLB coordinates: longitudinal X, up Y, lateral Z.
// All four visible bays get independent top hinges and outward launch paths.
export function createColosoRig(THREE,hullSource,doorSource,open=false){
 const root=new THREE.Group();root.name='Coloso modular';root.rotation.y=-Math.PI/2;
 const hull=hullSource.clone(true);hull.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(hull),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const factor=620/size.x;
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Casco Coloso sin dimensiones válidas');
 const frame=new THREE.Group();frame.scale.setScalar(factor);frame.position.copy(center).multiplyScalar(-factor);root.add(frame);frame.add(hull);
 const doorBounds=new THREE.Box3().setFromObject(doorSource),doorSize=doorBounds.getSize(new THREE.Vector3()),doorCenter=doorBounds.getCenter(new THREE.Vector3());
 if(doorSize.x<=0||doorSize.y<=0||doorSize.z<=0)throw new Error('Compuerta Coloso sin dimensiones válidas');
 const panels=[],exits=[],directions=[];
 const dark=new THREE.MeshStandardMaterial({color:0x05090d,roughness:1,metalness:.15});
 const orange=new THREE.MeshBasicMaterial({color:0xff8a20,toneMapped:false});
 for(const side of [-1,1])for(const x of [-.66,.84]){
  const width=.96,height=.35,top=.20;
  const socket=new THREE.Group();socket.position.set(x,top,side*.55);if(side<0)socket.rotation.y=Math.PI;frame.add(socket);
  // Recess covers the baked opening; moving panel sits outside the hull.
  const interior=new THREE.Mesh(new THREE.BoxGeometry(width,height,.035),dark);interior.position.set(0,-height/2,.002);socket.add(interior);
  const hinge=new THREE.Group();hinge.position.z=.025;socket.add(hinge);
  const fit=new THREE.Group();fit.scale.set(width/doorSize.x,height/doorSize.y,.035/doorSize.z);hinge.add(fit);
  const panel=doorSource.clone(true);panel.position.set(-doorCenter.x,-doorBounds.max.y,-doorCenter.z);fit.add(panel);
  hinge.rotation.x=open?-1.35:0;panels.push({hinge,axis:'x',openAngle:-1.35});
  for(const y of [0,-height]){const strip=new THREE.Mesh(new THREE.BoxGeometry(width+.04,.013,.025),orange);strip.position.set(0,y,.045);socket.add(strip)}
  for(const edge of [-1,1]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.015,height,.025),orange);strip.position.set(edge*width/2,-height/2,.045);socket.add(strip)}
  // Start immediately behind the doors, clear of the static hull surface.
  exits.push(new THREE.Vector3(x,top-height/2,side*.61).sub(center).multiplyScalar(factor).applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2));
  directions.push(new THREE.Vector3(0,0,side).applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2));
 }
 return {root,panels,exits,directions};
}

// Both modes use the same four measured aft nozzles in native hull coordinates.
export function attachColosoExhaust(THREE,rig,hullSource){
 const bounds=new THREE.Box3().setFromObject(hullSource),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),factor=620/Math.max(.001,size.x),flames=[];
 for(const lateral of [-.25,.25])for(const vertical of [-.19,.235]){
  const exhaust=new THREE.Group();exhaust.name='Coloso aft exhaust';
  exhaust.position.set(bounds.min.x-.015,vertical,lateral).sub(center).multiplyScalar(factor);
  for(const [radius,length,color,opacity]of [[23,115,0x168dff,.55],[12,85,0xa8eeff,.85]]){
   const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,fog:false});
   const geometry=new THREE.ConeGeometry(radius,length,24,1,true);geometry.translate(0,length/2,0);
   const flame=new THREE.Mesh(geometry,material);flame.rotation.z=Math.PI/2;exhaust.add(flame);flames.push(flame);
  }
  rig.root.add(exhaust);
 }
 return flames;
}
