import {effectBudget} from './effect-budget.js?v=440';
import {createCloudLightning} from './cloud-lightning.js?v=484';
// One shared, seamless texture. Generated once; no volume atlas or per-frame baking.
export function createCloudLayerTexture(T){
 let seed=127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const size=256,data=new Uint8Array(size*size*4),octaves=[8,16,32,64].map(n=>({n,values:Float32Array.from({length:n*n},random)}));
 const smooth=t=>t*t*(3-2*t);
 function noise(o,x,y){const u=x/size*o.n,v=y/size*o.n,ix=Math.floor(u),iy=Math.floor(v),fx=smooth(u-ix),fy=smooth(v-iy),at=(a,b)=>o.values[(b%o.n)*o.n+a%o.n];return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=noise(octaves[0],x,y)*.57+noise(octaves[1],x,y)*.26+noise(octaves[2],x,y)*.12+noise(octaves[3],x,y)*.05;
  const shade=noise(octaves[0],x+2,y+3)*.57+noise(octaves[1],x+2,y+3)*.26+noise(octaves[2],x+2,y+3)*.12+noise(octaves[3],x+2,y+3)*.05;
  const i=(y*size+x)*4;data[i]=Math.round(n*255);data[i+1]=Math.round(Math.max(0,Math.min(1,.5+(n-shade)*3))*255);data[i+2]=Math.round(noise(octaves[1],x,y)*255);data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function cloudLayerCount(budget){return budget.cloudSteps<=18?2:budget.cloudSteps<=24?3:4}
// Closed camera-space shells: only visible nearby sectors are shaded. All layers
// share one texture/draw call; distant sectors dissolve into opaque haze.
export function mountCooperativeClouds(T,scene,{budget=()=>effectBudget('high')}={}){
 const noise=createCloudLayerTexture(T);
 const uniforms={layerCount:{value:cloudLayerCount(budget())},lightningPower:{value:0},lightningPosition:{value:new T.Vector3()},lightningColor:{value:new T.Color(0x438aff)},lightningColor2:{value:new T.Color(0xb34dff)},noiseMap:{value:noise},time:{value:0},eye:{value:new T.Vector3()},cameraWorld:{value:new T.Matrix4()},inverseProjection:{value:new T.Matrix4()}};
 const material=new T.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,
 vertexShader:`varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
 fragmentShader:`uniform float layerCount;uniform float lightningPower;uniform vec3 lightningPosition;uniform vec3 lightningColor;uniform vec3 lightningColor2;uniform sampler2D noiseMap;uniform float time;uniform vec3 eye;uniform mat4 cameraWorld;uniform mat4 inverseProjection;varying vec2 screenUv;
 void main(){
  vec4 view=inverseProjection*vec4(screenUv*2.-1.,1.,1.);
  vec3 ray=normalize(mat3(cameraWorld)*(view.xyz/view.w));
  vec3 color=vec3(.39,.44,.56);
  for(int i=0;i<4;i++){
   if(float(i)>=layerCount)break;
   float layer=float(i),radius=1820.+layer*240.;
   vec2 offset=eye.xy-vec2(0.,120.);float a=max(dot(ray.xy,ray.xy),.000001);
   float b=dot(offset,ray.xy),c=dot(offset,offset)-radius*radius;
   float wall=(-b+sqrt(max(0.,b*b-a*c)))/a;
   float cap=100000.;if(abs(ray.z)>.00001){float hit=((ray.z>0.?1500.:-12800.)-eye.z)/ray.z;if(hit>0.)cap=hit;}
   float distance=max(1.,min(wall,cap));vec3 p=eye+ray*distance;
   // Cylindrical mapping repeats at the angular seam; planar end caps close
   // both ends. Blend the mapping near their joint instead of exposing an edge.
   vec2 wallUv=vec2(atan(p.y-120.,p.x)/6.2831853*4.,p.z/4200.);
   vec2 capUv=p.xy/4200.;float capBlend=1.-smoothstep(0.,260.,abs(wall-cap));
   vec2 uv=cap<wall?capUv:mix(wallUv,capUv,capBlend);
   vec3 tex=texture2D(noiseMap,uv+vec2(layer*.173+time*.0015,-layer*.219+time*.0007)).rgb;
   float tint=.5+.5*sin(p.z*.00065+p.x*.0005);
   vec3 shadow=mix(vec3(.21,.30,.47),vec3(.36,.27,.49),tint);
   float billow=smoothstep(.24,.78,tex.r);
   vec3 cloud=mix(shadow,vec3(.84,.88,.95),billow*.84)*( .85+tex.g*.3);
   float sectorFade=smoothstep(2200.,4300.,distance);
   cloud=mix(cloud,vec3(.39,.44,.56),sectorFade);
   if(lightningPower>0.){vec3 delta=p-lightningPosition;float glow=exp(-dot(delta,delta)/490000.);cloud+=mix(lightningColor,lightningColor2,tint)*glow*lightningPower*(1.-sectorFade);}
   float alpha=i==0?1.:smoothstep(.28,.73,tex.r)*(.32/(1.+layer*.3))*(1.-sectorFade);
   if(i==0)color=cloud;else color=mix(color,cloud,alpha);
  }
  gl_FragColor=vec4(color,1.);
 }`});
 const geometry=new T.PlaneGeometry(2,2),sky=new T.Mesh(geometry,material);sky.name='Nubes por capas cooperativas';sky.frustumCulled=false;sky.renderOrder=-10000;
 sky.onBeforeRender=(_renderer,_scene,camera)=>{uniforms.eye.value.setFromMatrixPosition(camera.matrixWorld);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse)};
 scene.add(sky);
 // Lightning remains local; its mesh budget is capped separately from cloud detail.
 const lightning=createCloudLightning(T,scene,uniforms,Math.random,{budget:()=>({...budget(),lightningSegments:1})});
 const previousBackground=scene.background;scene.background=new T.Color(0x445473);
 return {update(dt){uniforms.layerCount.value=cloudLayerCount(budget());uniforms.time.value+=Math.max(0,Math.min(.1,Number(dt)||0));lightning.update(dt)},dispose(){lightning.dispose();scene.remove(sky);geometry.dispose();material.dispose();noise.dispose();scene.background=previousBackground}};
}
export function constrainCooperativePosition(p){
 const r=Math.hypot(p.x,p.y-120),limit=1540;
 if(r>limit){p.x*=limit/r;p.y=120+(p.y-120)*limit/r}
 p.z=Math.max(-12440,Math.min(1140,p.z));
}

