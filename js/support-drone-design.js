// Cosmetic selection is kept in quests so existing local and cloud saves preserve it.
export const supportDesignUnlocked=pilot=>!!pilot?.quests?.pvpMissions?.completed?.includes('coop-drone-pearl');
export const supportDesignSelected=pilot=>supportDesignUnlocked(pilot)&&pilot?.quests?.supportDroneSkin==='pearl'?'pearl':'original';
const originals=new WeakMap(),painted=new WeakMap();
export function applySupportDesign(THREE,root,design){
 root.traverse(object=>{if(!object.isMesh||!object.material)return;const isArray=Array.isArray(object.material),materials=isArray?object.material:[object.material];const updated=materials.map(current=>{
  if(!current)return current;const original=originals.get(current)||current;if(design!=='pearl'||!original.isMeshStandardMaterial)return original;
  let material=painted.get(original);if(material)return material;material=original.clone();object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox,midpoint=bounds.getCenter(new THREE.Vector3()),half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);half.x=Math.max(half.x,.001);
  material.onBeforeCompile=shader=>{shader.uniforms.droneCenterX={value:midpoint.x};shader.uniforms.droneHalfX={value:half.x};shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying float vDroneWingX;
uniform float droneCenterX;
uniform float droneHalfX;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vDroneWingX=abs((position.x-droneCenterX)/droneHalfX);`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying float vDroneWingX;`).replace('#include <map_fragment>',`#include <map_fragment>
float droneGlow=smoothstep(0.015,0.15,min(diffuseColor.g,diffuseColor.b)-diffuseColor.r)*smoothstep(0.12,0.4,max(diffuseColor.g,diffuseColor.b));
float lum=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
vec3 silver=vec3(.76,.78,.84)*(0.32+0.8*lum);
float golden=smoothstep(.12,.34,diffuseColor.r-max(diffuseColor.b,diffuseColor.g)*.75);
vec3 tint=mix(silver,vec3(.73,.43,.09)*(0.5+lum),golden*.8);
diffuseColor.rgb=mix(vec3(.18,.10,.29)*(0.6+lum),tint,smoothstep(.025,.18,lum));
float goldEdge=(smoothstep(.69,.71,vDroneWingX)-smoothstep(.75,.77,vDroneWingX))+(smoothstep(.91,.93,vDroneWingX)-smoothstep(.96,.98,vDroneWingX));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.70,.42,.12)*(0.55+0.65*lum),clamp(goldEdge,0.0,1.0)*.9);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.09,.75),droneGlow*.8);`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
totalEmissiveRadiance+=vec3(.23,.035,.55)*droneGlow*.8;`);};
  material.customProgramCacheKey=()=>`cosmos-support-pearl-${midpoint.x}-${half.x}`;material.needsUpdate=true;originals.set(material,original);painted.set(original,material);return material;
 });object.material=isArray?updated:updated[0]});
}
