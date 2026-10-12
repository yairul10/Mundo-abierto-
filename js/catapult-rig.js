// Uploaded pieces use separate transforms, leaving geometry/materials shared.
export function catapultAngle(progress){const p=Math.max(0,Math.min(1,progress));return p<.78?-.12*p/.78:-.12+2.22*(p-.78)/.22}
export function createCatapultRig(THREE,parts){
 const root=new THREE.Group();root.name='Catapulta modular';
 function normalized(template,length){const clone=template.clone(true);clone.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const group=new THREE.Group(),scale=length/Math.max(size.x,size.y,size.z);clone.scale.multiplyScalar(scale);clone.position.addScaledVector(center,-scale);group.add(clone);return group}
 const hull=normalized(parts.hull,150);root.add(hull);
 const stand=parts.stand.clone(true);stand.scale.multiplyScalar(30);stand.position.set(-.0336186*30,10,-.0095531*30);root.add(stand);
 const pivot=new THREE.Group();pivot.name='Eje de lanzamiento';pivot.position.set(0,26.35,0);root.add(pivot);
 const arm=parts.arm.clone(true);arm.scale.multiplyScalar(70);arm.position.set(-.00249*70,-.065*70,-.30*70);pivot.add(arm);
 const socket=new THREE.Group();socket.name='Cesta de bomba';socket.position.set(0,10,-69.3);pivot.add(socket);
 const payload=normalized(parts.bomb,18);socket.add(payload);
 let returning=0;
 function setCharge(progress){returning=0;payload.visible=true;pivot.rotation.x=catapultAngle(progress)}
 function release(){payload.visible=false;returning=.75;root.updateWorldMatrix(true,true);return socket.getWorldPosition(new THREE.Vector3())}
 function reset(){returning=0;pivot.rotation.x=0;payload.visible=true}
 function update(dt){if(returning<=0)return;returning=Math.max(0,returning-dt);pivot.rotation.x=2.1*returning/.75;if(returning===0)reset()}
 return {root,pivot,socket,setCharge,release,reset,update,projectile:()=>normalized(parts.bomb,18)};
}
