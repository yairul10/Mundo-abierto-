// Cosmetic trial: no save data, combat stats or network loadout fields are changed.
// Paint patterns are evaluated in the ship frame, so they are visible from behind.
const country=(name,energy,core,colors,pattern)=>Object.freeze({name,energy,core,colors:Object.freeze(colors),pattern});
const white=0xe8edf2,blue=0x1b459e,red=0xdb283d,yellow=0xf4b92a;
export const OBSIDIAN_SKINS=Object.freeze({
 original:Object.freeze({name:'Original',energy:0x26e6cf,core:0xc4fff5}),
 carmesi:Object.freeze({name:'Carmesí',energy:0xff243e,core:0xffc4cb,trim:[.65,.012,.025]}),
 imperial:Object.freeze({name:'Imperial',energy:0xb456ff,core:0xedccff,trim:[.9,.52,.08]}),
 chile:country('Chile',0x3d83ff,0xdbeaff,[white,blue,red],
  'skinPoint.y < 0.0 ? paintC : (skinPoint.x < -9.0 ? paintB : paintA)'),
 mexico:country('México',0x31db81,0xd0ffdf,[0x198458,white,red],
  'skinPoint.x < -9.0 ? paintA : (skinPoint.x > 9.0 ? paintC : paintB)'),
 colombia:country('Colombia',0xffc43d,0xffefb0,[yellow,blue,red],
  'colombiaPanels(atlas, normalize(skinNormal), skinPoint)'),
 venezuela:country('Venezuela',0x5186ff,0xdbe6ff,[yellow,blue,red],
  'skinPoint.y > 8.0 ? paintA : (skinPoint.y > -9.0 ? paintB : paintC)'),
 eeuu:country('Estados Unidos',0x588cff,0xe1ecff,[white,blue,red],
  'skinPoint.y > 0.0 && skinPoint.x < -9.0 ? paintB : (mod(floor(skinPoint.y / 5.0), 2.0) < 1.0 ? paintA : paintC)')
});
export function allowedObsidianSkin(id,admin){return admin===true&&Object.hasOwn(OBSIDIAN_SKINS,id)?id:'original'}
const originals=new WeakMap(),wakeGeometry=new WeakMap();
const baseMaterial=m=>originals.get(m)||m;
// Smooth color masks preserve the atlas shading, normals and metal/roughness maps.
const colombiaPaint = `
 varying vec3 skinNormal;
 uniform bool skinRing;
 vec3 colombiaPanels(vec3 atlas, vec3 normal, vec3 point) {
  if (skinRing) {
   float segment = floor((atan(point.y, point.x) + 3.14159265) * 1.9098593);
   float accent = mod(segment, 6.0);
   return accent == 1.0 ? paintB : (accent == 4.0 ? paintC : paintA);
  }
  float side = abs(normal.x);
  float warmTrim = smoothstep(0.035, 0.13, min(atlas.r, atlas.g) - atlas.b);
  vec3 plate = mix(paintA, paintB, smoothstep(0.46, 0.76, side));
  return mix(plate, paintC, warmTrim * smoothstep(0.35, 0.65, side));
 }
`;
function recoloredMaterial(THREE,source,id,paintFrame,ring,reactor){
 const base=baseMaterial(source),skin=OBSIDIAN_SKINS[id],m=base.clone();originals.set(m,base);
 if(base.map){
  const energy=new THREE.Color(skin.energy),trim=skin.trim;
  m.onBeforeCompile=shader=>{
   shader.uniforms.skinEnergy={value:energy};
   if(paintFrame){
    shader.uniforms.skinFrame={value:paintFrame};
    for(const [i,key] of ['paintA','paintB','paintC'].entries())shader.uniforms[key]={value:new THREE.Color(skin.colors[i])};
    shader.vertexShader='uniform mat4 skinFrame;\nvarying vec3 skinPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskinPoint = (skinFrame * vec4(position, 1.0)).xyz;');
    shader.fragmentShader='varying vec3 skinPoint;\nuniform vec3 paintA, paintB, paintC;\n'+shader.fragmentShader;
    if(id==='colombia'){
     shader.uniforms.skinRing={value:ring};
     shader.vertexShader='varying vec3 skinNormal;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('skinPoint = (skinFrame * vec4(position, 1.0)).xyz;',
      'skinPoint = (skinFrame * vec4(position, 1.0)).xyz;\nskinNormal = mat3(skinFrame) * normal;');
     shader.fragmentShader=shader.fragmentShader.replace('uniform vec3 paintA, paintB, paintC;',
      'uniform vec3 paintA, paintB, paintC;\n'+colombiaPaint);
    }
   }else shader.uniforms.skinTrim={value:new THREE.Vector3(...trim)};
   shader.fragmentShader='uniform vec3 skinEnergy;\nuniform vec3 skinTrim;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec3 atlas = diffuseColor.rgb;
    float energyMask = smoothstep(0.015, 0.16, min(atlas.g, atlas.b) - atlas.r);
    float trimMask = smoothstep(0.015, 0.13, min(atlas.r, atlas.g) - atlas.b) * (1.0-energyMask);
    float brightness = max(atlas.r, max(atlas.g, atlas.b));
    vec3 darkHull = atlas * 0.40;
    vec3 finish = ${paintFrame ? '('+skin.pattern+') * clamp(brightness * 1.35 + 0.13, 0.0, 1.0)' : 'mix(darkHull, skinTrim * brightness, trimMask)'};
    diffuseColor.rgb = mix(finish, skinEnergy * brightness, energyMask);
    ${id==='colombia' ? `
    // Project a small flag onto the upward-facing nose panels.
    if (!skinRing && skinNormal.y > 0.35 * length(skinNormal)) {
     vec2 flag = vec2(skinPoint.x / 13.0 + 0.5, (skinPoint.z + 46.0) / 8.0);
     if (flag.x >= 0.0 && flag.x <= 1.0 && flag.y >= 0.0 && flag.y <= 1.0) {
      diffuseColor.rgb = flag.y < 0.5 ? vec3(1.0, 0.63, 0.015) : (flag.y < 0.75 ? paintB : paintC);
     }
    }` : ''}

   `);
  };
  m.customProgramCacheKey=()=> 'obsidian-skin-v3-'+id;
  if(id==='colombia'&&m.isMeshStandardMaterial){m.metalness*=.65;m.roughness=Math.max(m.roughness,.65)}
 }else{
  // The procedural core and engines use untextured materials.
  if(m.color){const c=base.color;m.color.set(c.g>.85&&c.r>.35?skin.core:skin.energy)}
  if(m.emissive&&base.emissive.getHex())m.emissive.set(skin.energy);
  if(id==='colombia'&&reactor){m.color.set(skin.core);m.emissiveIntensity=1.05}
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
 let worldToShip=null;
 if(OBSIDIAN_SKINS[id].pattern){
  root.updateWorldMatrix(true,true);
  worldToShip=root.matrixWorld.clone().invert();
 }
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
  let paintFrame=worldToShip&&worldToShip.clone().multiply(o.matrixWorld),ring=false;
  if(id==='colombia'){
   // Keep each color segment attached to its rotating ring.
   for(let parent=o.parent;parent&&parent!==root;parent=parent.parent){
    if(!parent.name.startsWith('obsidian-ring-'))continue;
    paintFrame=parent.matrixWorld.clone().invert().multiply(o.matrixWorld);
    ring=true;
    break;
   }
  }
  const reactor=o.parent===root&&o.geometry?.type==='SphereGeometry';
  const next=previous.map(m=>id==='original'?baseMaterial(m):recoloredMaterial(THREE,m,id,paintFrame,ring,reactor));
  o.material=Array.isArray(o.material)?next:next[0];
  for(const m of previous)if(originals.has(m))m.dispose();
 });
 root.userData.obsidianSkin=id;
}
