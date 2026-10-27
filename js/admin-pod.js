// Flight frame: forward -Z. Anchors measured from the supplied Hoverpod mesh.
export const ADMIN_POD_ANCHORS=Object.freeze({engine:[0,-8,55.5],steam:[0,41.5,17.2]});
export async function loadAdminPod(T,loader){
 const source=(await loader.loadAsync('./assets/models/admin-hoverpod.glb?v=337')).scene;
 const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),scale=124/Math.max(size.x,size.z);
 const pivot=new T.Group();source.position.sub(center);pivot.add(source);pivot.scale.setScalar(scale);pivot.rotation.y=Math.PI;
 source.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;m.metalness=.12;m.roughness=.9;m.needsUpdate=true}});
 const root=new T.Group();root.add(pivot);
 const nozzle=new T.Group();nozzle.position.set(...ADMIN_POD_ANCHORS.engine);root.add(nozzle);
 const flame=new T.Mesh(new T.ConeGeometry(5.5,30,12,1,true).translate(0,15,0),new T.MeshBasicMaterial({color:0xffaf45,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));flame.rotation.x=Math.PI/2;flame.name='adminPodFlame';nozzle.add(flame);
 // Shared geometry and bounded count: no new meshes/textures during animation.
 const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*Math.max(0,1-r)**2)}
 const steamTexture=new T.DataTexture(pixels,32,32);steamTexture.needsUpdate=true;
 for(let i=0;i<7;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:steamTexture,color:0xe1eff3,transparent:true,opacity:.1,depthWrite:false}));puff.name='adminPodSteam'+i;root.add(puff)}
 return root;
}
export function animateAdminPod(root,time,power=0){if(!root)return;root.traverse(o=>{
 if(o.name==='adminPodFlame'){o.visible=power>.02;o.scale.set(1,.3+Math.min(1,power)*(1+.1*Math.sin(time*24)),1)}
 if(o.name.startsWith('adminPodSteam')){const phase=(time*.38+(Number(o.name.slice(13))/7||0))%1,origin=ADMIN_POD_ANCHORS.steam;o.position.set(origin[0]+Math.sin(time+phase*4)*phase*2,origin[1]+phase*19,origin[2]+phase*9);o.scale.setScalar(2.4+phase*8);o.material.opacity=.17*(1-phase);}
 })}
