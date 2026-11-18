// Session-only preview. The source texture and geometry remain untouched.
const originals=new WeakMap();
export function applyExplorerDesign(THREE,root,design='original'){
 if(!root)return;
 const selected=design==='obsidian'?'obsidian':'original';
 root.traverse(part=>{
  if(!part.isMesh||!part.material)return;
  const array=Array.isArray(part.material),current=array?part.material:[part.material];
  const next=current.map(material=>{
   if(!material)return material;
   const base=originals.get(material)||material;
   if(originals.has(material))material.dispose();
   if(selected==='original')return base;
   const painted=base.clone();originals.set(painted,base);
   painted.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     vec3 droneSource = diffuseColor.rgb;
     float droneLum = dot(droneSource, vec3(0.2126, 0.7152, 0.0722));
     float droneBlue = smoothstep(0.035, 0.19, droneSource.b - droneSource.r);
     vec3 droneHull = mix(vec3(0.035, 0.045, 0.060), vec3(0.15, 0.17, 0.20), smoothstep(0.12, 0.72, droneLum));
     float droneTrim = smoothstep(0.37, 0.60, droneLum) * (1.0 - droneBlue);
     droneHull = mix(droneHull, vec3(0.43, 0.26, 0.09), droneTrim * 0.48);
     diffuseColor.rgb = mix(droneHull, vec3(0.02, 0.85, 0.68) * max(0.5, droneLum * 2.0), droneBlue);
    `);
   };
   painted.customProgramCacheKey=()=> 'explorer-obsidian-preview-1';
   if(painted.emissive){painted.emissive.setHex(0x00483e);painted.emissiveIntensity=.18;}
   painted.needsUpdate=true;return painted;
  });
  part.material=array?next:next[0];
 });
}
