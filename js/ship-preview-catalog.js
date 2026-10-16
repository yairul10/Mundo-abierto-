// The same GLBs and forward orientations used by the equipped fleet.
export const SHIP_PREVIEWS=Object.freeze({
 aurora:{name:'Aurora',model:'x_wing_starfighter.glb',yaw:Math.PI},
 titan:{name:'Titán',model:'titan.glb',yaw:Math.PI},
 espectro:{name:'Espectro',model:'espectro.glb',yaw:Math.PI/2},
 segadora:{name:'Segadora',model:'segadora.glb',yaw:-Math.PI,roll:-.055},
 bastion:{name:'Bastión',model:'bastion.glb',yaw:Math.PI},
 centella:{name:'Centella',model:'centella.glb',yaw:Math.PI}
});
export function shipThumbnail(id){const ship=SHIP_PREVIEWS[id];return ship?'<img class="formation-preview ship-preview" src="./assets/ship-previews/'+id+'.webp?v=252" alt="Nave '+ship.name+'" width="480" height="360" loading="lazy" decoding="async">':''}
export function disposePreviewModel(model){
 const resources=new Set();model?.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value)}});
 for(const resource of resources)resource.dispose?.();
}
export function fitPreviewModel(THREE,source,id){
 const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(span)||span<1e-6)throw new Error('Modelo sin dimensiones válidas');
 // Translate inside a scaled parent: scale and rotation must not displace the center.
 const centered=new THREE.Group();centered.add(source);source.position.sub(center);
 const turntable=new THREE.Group();turntable.add(centered);centered.scale.setScalar(3/span);centered.rotation.y=SHIP_PREVIEWS[id].yaw;centered.rotation.z=SHIP_PREVIEWS[id].roll||0;
 return turntable;
}
