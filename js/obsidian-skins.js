// Cosmetic trial: no save data, combat stats or network loadout fields are changed.
export const OBSIDIAN_SKINS=Object.freeze({
 original:Object.freeze({name:'Original',energy:0x26e6cf,core:0xc4fff5}),
 carmesi:Object.freeze({name:'Carmesí',energy:0xff243e,core:0xffc4cb,trim:[.65,.012,.025]}),
 imperial:Object.freeze({name:'Imperial',energy:0xb456ff,core:0xedccff,trim:[.9,.52,.08]})
});
export function allowedObsidianSkin(id,admin){return admin===true&&Object.hasOwn(OBSIDIAN_SKINS,id)?id:'original'}
const originals=new WeakMap(),wakeGeometry=new WeakMap();
const baseMaterial=m=>originals.get(m)||m;
// Smooth color masks preserve the atlas shading, normals and metal/roughness maps.
function recoloredMaterial(THREE,source,id){
 const base=baseMaterial(source),skin=OBSIDIAN_SKINS[id],m=base.clone();originals.set(m,base);
 if(base.map){
  const energy=new THREE.Color(skin.energy),trim=skin.trim;
  m.onBeforeCompile=shader=>{
   shader.uniforms.skinEnergy={value:energy};shader.uniforms.skinTrim={value:new THREE.Vector3(...trim)};
   shader.fragmentShader='uniform vec3 skinEnergy;\nuniform vec3 skinTrim;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec3 atlas = diffuseColor.rgb;
    float energyMask = smoothstep(0.015, 0.16, min(atlas.g, atlas.b) - atlas.r);
    float trimMask = smoothstep(0.015, 0.13, min(atlas.r, atlas.g) - atlas.b) * (1.0-energyMask);
    float brightness = max(atlas.r, max(atlas.g, atlas.b));
    vec3 darkHull = atlas * 0.40;
    diffuseColor.rgb = mix(mix(darkHull, skinTrim * brightness, trimMask), skinEnergy * brightness, energyMask);
   `);
  };
  m.customProgramCacheKey=()=> 'obsidian-skin-v1-'+id;
 }else{
  // The procedural core and engines use untextured materials.
  if(m.color){const c=base.color;m.color.set(c.g>.85&&c.r>.35?skin.core:skin.energy)}
  if(m.emissive&&base.emissive.getHex())m.emissive.set(skin.energy);
 }
 return m;
}
// Used after cloning the local model: other pilots must keep their original look.
export function resetObsidianClone(root){
 root.traverse(o=>{if(!o.isMesh)return;o.material=Array.isArray(o.material)?o.material.map(baseMaterial):baseMaterial(o.material);if(wakeGeometry.has(o.geometry))o.geometry=wakeGeometry.get(o.geometry)});
 delete root.userData.obsidianSkin;
}
export function applyObsidianSkin(THREE,root,id='original'){
 if(!root)return;
 if(!Object.hasOwn(OBSIDIAN_SKINS,id))id='original';
 if((root.userData.obsidianSkin||'original')===id)return;
 root.traverse(o=>{
  if(!o.isMesh)return;
  if(o.name.startsWith('obsidian-wake-')){
   const previous=o.geometry,base=wakeGeometry.get(previous)||previous;
   if(id==='original')o.geometry=base;
   else{
    o.geometry=base.clone();wakeGeometry.set(o.geometry,base);
    const colors=o.geometry.attributes.color,color=new THREE.Color(OBSIDIAN_SKINS[id].energy);
    for(let i=0;i<colors.count;i++){const fade=Math.pow(1-Math.floor(i/2)/(colors.count/2-1),1.7);colors.setXYZ(i,color.r*fade,color.g*fade,color.b*fade)}
    colors.needsUpdate=true;
   }
   if(previous!==base)previous.dispose();
   return;
  }
  const previous=Array.isArray(o.material)?o.material:[o.material];
  const next=previous.map(m=>id==='original'?baseMaterial(m):recoloredMaterial(THREE,m,id));
  o.material=Array.isArray(o.material)?next:next[0];
  for(const m of previous)if(originals.has(m))m.dispose();
 });
 root.userData.obsidianSkin=id;
}
