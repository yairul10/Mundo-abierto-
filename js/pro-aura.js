// One shared texture/material, one camera-facing quad per Pro. No combat changes.
const resources=new WeakMap(),auras=new WeakMap();
function material(T){
 let value=resources.get(T);if(value)return value;
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+ .5-size/2)/(size/2),(y+ .5-size/2)/(size/2)),i=(y*size+x)*4;
  pixels[i]=255;pixels[i+1]=18;pixels[i+2]=26;
  // Hollow center keeps the ship, engine flames and attack signals readable.
  pixels[i+3]=r<1?Math.round(110*Math.exp(-(((r-.74)/.15)**2))):0;
 }
 const texture=new T.DataTexture(pixels,size,size);texture.needsUpdate=true;
 value=new T.SpriteMaterial({map:texture,color:0xff5555,transparent:true,opacity:.55,depthWrite:false,depthTest:true,toneMapped:false});resources.set(T,value);return value;
}
export function updateProAuras(T,enemies,time){
 const shared=material(T);shared.opacity=.52+.08*Math.sin(time*2.5);
 for(const enemy of enemies){
  if(!enemy.pro&&!enemy.proVisual)continue;
  const mesh=enemy.mesh;if(!mesh)continue;let aura=auras.get(mesh);
  if(!aura){aura=new T.Sprite(shared);aura.name='Pro red aura';aura.raycast=()=>{};
   const diameter=enemy.kind==='colossusPro'?800:enemy.kind==='granTitanPro'?850:['catapult','harpooner'].includes(enemy.model||enemy.type)?220:180;
   aura.scale.set(diameter,diameter,1);mesh.add(aura);auras.set(mesh,aura);
  }
  aura.visible=!enemy.dead&&enemy.hp>0;
 }
}
