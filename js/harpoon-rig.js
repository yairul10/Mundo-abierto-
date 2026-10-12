// Shared model geometry; independent transforms for each enemy.
export function createHarpoonRig(THREE,parts){
 const root=new THREE.Group();root.name='Arponero modular';
 function fitted(source,length){const model=source.clone(true);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),factor=length/Math.max(size.x,size.y,size.z),group=new THREE.Group();model.scale.multiplyScalar(factor);model.position.multiplyScalar(factor).addScaledVector(center,-factor);group.add(model);return group}
 root.add(fitted(parts.hull,150));
 const launcher=fitted(parts.launcher,105);launcher.position.set(0,28,7);root.add(launcher);
 const spool=fitted(parts.spool,32);spool.position.set(-25,31,-30);root.add(spool);
 const cableSocket=new THREE.Group();cableSocket.position.set(-25,35,-21);root.add(cableSocket);
 const socket=new THREE.Group();socket.position.set(0,40,38);root.add(socket);
 function projectile(){const model=fitted(parts.spear,65);model.rotation.y=Math.PI/2;const group=new THREE.Group();group.add(model);return group}
 const payload=projectile();socket.add(payload);
 let active=false,returning=0;
 function origin(){root.updateWorldMatrix(true,true);return socket.getWorldPosition(new THREE.Vector3())}
 function cableOrigin(){root.updateWorldMatrix(true,true);return cableSocket.getWorldPosition(new THREE.Vector3())}
 function launch(){active=true;returning=0;payload.visible=false;return origin()}
 function retrieve(){active=false;returning=.55}
 function reset(){active=false;returning=0;spool.rotation.x=0;payload.position.z=0;payload.visible=true}
 function update(dt){if(active)spool.rotation.x+=dt*12;else if(returning>0){returning=Math.max(0,returning-dt);spool.rotation.x-=dt*12;payload.visible=true;payload.position.z=30*returning/.55;if(!returning)reset()}}
 return {root,origin,cableOrigin,launch,retrieve,reset,update,projectile};
}
