// Cosmetic trial: no save data, combat stats or network loadout fields are changed.
// Paint patterns are evaluated in the ship frame, so they are visible from behind.
const country=(name,energy,core,colors,pattern)=>Object.freeze({name,energy,core,colors:Object.freeze(colors),pattern});
const white=0xe8edf2,blue=0x1b459e,red=0xdb283d,yellow=0xf4b92a;
export const OBSIDIAN_SKINS=Object.freeze({
 original:Object.freeze({name:'Original',energy:0x26e6cf,core:0xc4fff5}),
 carmesi:Object.freeze({name:'Carmesí',energy:0xff243e,core:0xffc4cb,trim:[.65,.012,.025]}),
 imperial:Object.freeze({name:'Imperial',energy:0xb456ff,core:0xedccff,trim:[.9,.52,.08]}),
 chile:country('Chile',0x3d83ff,0xdbeaff,[white,blue,red],
  'chilePanels(atlas, normalize(skinNormal), skinPoint)'),
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
const chileTextures=new WeakMap();
function chileTexture(THREE,part){
 if(!THREE.TextureLoader)return null;
 let textures=chileTextures.get(THREE);if(!textures){textures={};chileTextures.set(THREE,textures)}
 if(!textures[part]){const map=new THREE.TextureLoader().load('./assets/skins/obsidian-chile/'+part+'.png?v=505');map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;textures[part]=map}
 return textures[part];
}
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
const chilePaint = `
// Chile paint follows the original armor/trim atlas; geometry and UVs are untouched.
varying vec3 skinNormal;
uniform bool skinRing;
vec3 chilePanels(vec3 atlas,vec3 normal,vec3 point){
 float trim=smoothstep(0.035,0.13,min(atlas.r,atlas.g)-atlas.b);
 if(skinRing){
  float segment=floor((atan(point.y,point.x)+3.14159265)*1.9098593);
  vec3 plate=mod(segment,4.0)<1.0?paintB:paintA;
  return mix(plate,paintC,trim);
 }
 float side=smoothstep(0.35,0.78,abs(normal.x));
 vec3 plate=mix(paintA,paintB,side);
 float spine=(1.0-smoothstep(6.0,14.0,abs(point.x)))*0.82;
 plate=mix(plate,paintB,spine);
 plate=mix(plate,paintB,smoothstep(0.1,0.6,-normal.y));
 return mix(plate,paintC,trim);
}
bool chileStar(vec2 point){
 bool inside=false;
 float angle=1.570796327-0.628318531;
 vec2 previous=vec2(cos(angle),sin(angle))*0.073;
 for(int i=0;i<10;i++){
  float a=1.570796327+float(i)*0.628318531;
  float radius=mod(float(i),2.0)<0.5?0.17:0.073;
  vec2 vertex=vec2(cos(a),sin(a))*radius;
  if((vertex.y>point.y)!=(previous.y>point.y)){
   float dy=previous.y-vertex.y;
   if(point.x<(previous.x-vertex.x)*(point.y-vertex.y)/dy+vertex.x)inside=!inside;
  }
  previous=vertex;
 }
 return inside;
}
vec3 chileFlag(vec2 uv){
 if(uv.y<0.5)return paintC;
 if(uv.x>=0.333333333)return paintA;
 vec2 starPoint=(uv-vec2(0.166666667,0.75))*vec2(1.5,1.0);
 return chileStar(starPoint)?paintA:paintB;
}
bool insideChileFlag(vec2 uv){return uv.x>=0.0&&uv.x<=1.0&&uv.y>=0.0&&uv.y<=1.0;}
`;
function recoloredMaterial(THREE,source,id,paintFrame,ring,reactor,part){
 const base=baseMaterial(source),skin=OBSIDIAN_SKINS[id],m=base.clone();originals.set(m,base);
 if(base.map){
  const energy=new THREE.Color(skin.energy),trim=skin.trim;
  const baked=id==='chile'?chileTexture(THREE,part):null;
  if(baked){m.map=baked;m.color?.set(0xffffff)}
  m.onBeforeCompile=shader=>{
   shader.uniforms.skinEnergy={value:energy};
   if(paintFrame){
    shader.uniforms.skinFrame={value:paintFrame};
    for(const [i,key] of ['paintA','paintB','paintC'].entries())shader.uniforms[key]={value:new THREE.Color(skin.colors[i])};
    shader.vertexShader='uniform mat4 skinFrame;\nvarying vec3 skinPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskinPoint = (skinFrame * vec4(position, 1.0)).xyz;');
    shader.fragmentShader='varying vec3 skinPoint;\nuniform vec3 paintA, paintB, paintC;\n'+shader.fragmentShader;
    if(id==='colombia'||id==='chile'){
     shader.uniforms.skinRing={value:ring};
     shader.vertexShader='varying vec3 skinNormal;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('skinPoint = (skinFrame * vec4(position, 1.0)).xyz;',
      'skinPoint = (skinFrame * vec4(position, 1.0)).xyz;\nskinNormal = mat3(skinFrame) * normal;');
     shader.fragmentShader=shader.fragmentShader.replace('uniform vec3 paintA, paintB, paintC;',
      'uniform vec3 paintA, paintB, paintC;\n'+(id==='chile'?chilePaint:colombiaPaint));
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
    diffuseColor.rgb = ${baked ? 'atlas' : 'mix(finish, skinEnergy * brightness, energyMask)'};
    ${id==='colombia' ? `
    // Project a small flag onto the upward-facing nose panels.
    if (!skinRing && skinNormal.y > 0.35 * length(skinNormal)) {
     vec2 flag = vec2(skinPoint.x / 13.0 + 0.5, (skinPoint.z + 46.0) / 8.0);
     if (flag.x >= 0.0 && flag.x <= 1.0 && flag.y >= 0.0 && flag.y <= 1.0) {
      diffuseColor.rgb = flag.y < 0.5 ? vec3(1.0, 0.63, 0.015) : (flag.y < 0.75 ? paintB : paintC);
     }
    }` : ''}
    ${id==='chile' ? `
    // Broad mirrored nose armor with continuous, softly shaded panels.
    if(!skinRing && skinNormal.y > 0.22 * length(skinNormal)){
     float along=smoothstep(-51.0,-47.0,skinPoint.z)*(1.0-smoothstep(-24.0,-20.0,skinPoint.z));
     float ax=abs(skinPoint.x);
     float outer=10.0+smoothstep(-48.0,-22.0,skinPoint.z)*2.0;
     float band=smoothstep(3.2,4.0,ax)*(1.0-smoothstep(outer,outer+0.8,ax))*along;
     float innerWhite=smoothstep(4.3,5.0,ax)*(1.0-smoothstep(outer-1.1,outer-0.35,ax));
     // Keep the panel continuous instead of making holes from texture colors.
     // Soft atlas shading keeps some underlying surface detail.
     float coverage=band;
     vec3 armor=mix(paintC,paintA,innerWhite)*clamp(brightness*0.55+0.58,0.58,1.0);
     // Fine diagonal joints on white armor, mirrored on the two sides.
     float joint1=1.0-smoothstep(0.06,0.18,abs(skinPoint.z+38.0+(ax-5.0)*0.45));
     float joint2=1.0-smoothstep(0.06,0.18,abs(skinPoint.z+29.0-(ax-5.0)*0.35));
     float joints=max(joint1,joint2)*innerWhite;
     armor=mix(armor,armor*vec3(0.56,0.65,0.76),joints*0.65);
     diffuseColor.rgb=mix(diffuseColor.rgb,armor,coverage);
    }
    // A single white star on the upper nose, in the ship frame.
    if(!skinRing && skinNormal.y > 0.45 * length(skinNormal)){
     vec2 starPoint=vec2(skinPoint.x / 20.0,(-skinPoint.z-40.5) / 20.0);
     if(chileStar(starPoint)) diffuseColor.rgb=paintA;
    }` : ''}

   `);
  };
  m.customProgramCacheKey=()=> 'obsidian-preview-skin-v512-'+id;
  if(id==='chile'&&m.isMeshStandardMaterial){m.metalness=.12;m.roughness=.82;}
  if(id==='colombia'&&m.isMeshStandardMaterial){m.metalness*=.65;m.roughness=Math.max(m.roughness,.65)}
 }else{
  // The procedural core and engines use untextured materials.
  if(m.color){const c=base.color;m.color.set(c.g>.85&&c.r>.35?skin.core:skin.energy)}
  if(m.emissive&&base.emissive.getHex())m.emissive.set(skin.energy);
  if((id==='colombia'||id==='chile')&&reactor){m.color.set(skin.core);m.emissiveIntensity=1.05}
  if(id==='chile'&&reactor){
   // Slow, broad energy currents avoid the tiny grid produced by high-frequency bands.
   const coreTime={value:0};m.userData.previewCoreTime=coreTime;
   m.color.set(0x073276);if(m.emissive)m.emissive.set(0x087bdf);m.emissiveIntensity=1;
   m.onBeforeCompile=shader=>{
    shader.uniforms.previewCoreTime=coreTime;
    shader.vertexShader='varying vec3 corePosition;\nvarying vec3 coreViewPosition;\nvarying vec3 coreViewNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncorePosition=position;\ncoreViewPosition=(modelViewMatrix*vec4(position,1.0)).xyz;\ncoreViewNormal=normalMatrix*normal;');
    shader.fragmentShader='varying vec3 corePosition;\nvarying vec3 coreViewPosition;\nvarying vec3 coreViewNormal;\nuniform float previewCoreTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     vec3 p=corePosition/8.0;
     float t=previewCoreTime*0.6;
     float wave=sin(p.x*4.0+p.y*2.6+sin(p.z*3.0+t)*1.4+t);
     float wave2=sin(p.y*4.0-p.z*2.5+sin(p.x*3.0-t)*1.2-t*0.8);
     float arcs=pow(max(0.0,1.0-abs(wave)),12.0)*0.6
               +pow(max(0.0,1.0-abs(wave2)),16.0)*0.45;
     float cloud=0.5+0.5*sin(p.x*2.5-p.y*2.2+p.z*2.0+t);
     float facing=max(dot(normalize(coreViewNormal),normalize(-coreViewPosition)),0.0);
     float heart=pow(facing,18.0)*(0.85+0.15*sin(t*2.0));
     totalEmissiveRadiance=vec3(0.005,0.035,0.18)+vec3(0.01,0.16,0.42)*cloud+vec3(0.32,0.85,1.0)*arcs+vec3(1.1,1.7,2.0)*heart;
    `);
   };
   m.customProgramCacheKey=()=> 'obsidian-preview-chile-core-v509';
  }
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
  let paintFrame=worldToShip&&worldToShip.clone().multiply(o.matrixWorld),ring=false,part='fighter';
  if(id==='colombia'||id==='chile'){
   // Keep each color segment attached to its rotating ring.
   for(let parent=o.parent;parent&&parent!==root;parent=parent.parent){
    if(!parent.name.startsWith('obsidian-ring-'))continue;
    paintFrame=parent.matrixWorld.clone().invert().multiply(o.matrixWorld);
    ring=true;part=parent.name==='obsidian-ring-0'?'portal':'inner-ring';
    break;
   }
  }
  const reactor=o.parent===root&&o.geometry?.type==='SphereGeometry';
  const next=previous.map(m=>id==='original'?baseMaterial(m):recoloredMaterial(THREE,m,id,paintFrame,ring,reactor,part));
  o.material=Array.isArray(o.material)?next:next[0];
  for(const m of previous)if(originals.has(m))m.dispose();
 });
 root.userData.obsidianSkin=id;
}

// Only the isolated preview updates these material uniforms.
export function animatePreviewCore(root,time){
 root.traverse(o=>{if(!o.isMesh)return;for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.userData?.previewCoreTime)m.userData.previewCoreTime.value=time;});
}
