import {createCloudLightning} from './cloud-lightning.js?v=429';
// Camera-space cloud volume: no distant cylinder cap or camera-far-plane seam.
export function mountCooperativeClouds(T,scene){
 let seed=127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 // Padded slices give continuous, smoothly interpolated 3D noise with two texture reads.
 const size=64,atlasSize=528,values=new Uint8Array(size*size*size),data=new Uint8Array(atlasSize*atlasSize*4);
 for(let i=0;i<values.length;i++)values[i]=Math.floor(random()*255);
 for(let z=0;z<64;z++)for(let y=0;y<66;y++)for(let x=0;x<66;x++){const sx=(x+63)%64,sy=(y+63)%64,n=values[z*4096+sy*64+sx],offset=(((z>>3)*66+y)*atlasSize+(z%8)*66+x)*4;data.set([n,n,n,255],offset)}
 const noise=new T.DataTexture(data,atlasSize,atlasSize,T.RGBAFormat);noise.minFilter=noise.magFilter=T.LinearFilter;noise.needsUpdate=true;
 const uniforms={lightningPower:{value:0},lightningPosition:{value:new T.Vector3()},lightningColor:{value:new T.Color(0x438aff)},lightningColor2:{value:new T.Color(0xb34dff)},noiseMap:{value:noise},time:{value:0},eye:{value:new T.Vector3()},cameraWorld:{value:new T.Matrix4()},inverseProjection:{value:new T.Matrix4()}};
 const material=new T.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,
 vertexShader:`varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
 fragmentShader:`uniform float lightningPower;uniform vec3 lightningPosition;uniform vec3 lightningColor;uniform vec3 lightningColor2;uniform sampler2D noiseMap;uniform float time;uniform vec3 eye;uniform mat4 cameraWorld;uniform mat4 inverseProjection;varying vec2 screenUv;
 float volumeNoise(vec3 q){
  vec3 cell=floor(q),f=fract(q);f=f*f*(3.-2.*f);
  float z0=mod(cell.z,64.),z1=mod(z0+1.,64.);
  vec2 xy=mod(cell.xy,64.)+f.xy+1.5;
  vec2 tile0=vec2(mod(z0,8.),floor(z0/8.)),tile1=vec2(mod(z1,8.),floor(z1/8.));
  return mix(texture2D(noiseMap,(tile0*66.+xy)/528.).r,texture2D(noiseMap,(tile1*66.+xy)/528.).r,f.z);
 }
 float field(vec3 p){
  vec3 drift=vec3(time*.014,time*.007,-time*.009);
  return volumeNoise(p*.0020+drift)*.72+volumeNoise(p*.0047-drift)*.28;
 }
 void main(){
  vec4 view=inverseProjection*vec4(screenUv*2.-1.,1.,1.);
  vec3 ray=normalize(mat3(cameraWorld)*(view.xyz/view.w));
  float horizon=.5+.5*ray.y;
  vec3 background=mix(vec3(.13,.18,.30),vec3(.30,.35,.47),horizon);
  vec3 accumulated=vec3(0.);float transmission=1.;
  for(int i=0;i<28;i++){
   float f=float(i);float distance=60.+f*95.+f*f*4.5;
   float stepLength=99.5+f*9.;
   vec3 p=eye+ray*distance;
   float n=field(p);float radial=length(p.xy-vec2(0.,120.));
   float bank=smoothstep(1180.,1920.,radial+(n-.5)*680.);
   float endBank=max(smoothstep(900.,1500.,p.z),smoothstep(12000.,12800.,-p.z));
   float density=max(bank,endBank)*(.0007+.0021*smoothstep(.24,.78,n));
   float haze=.000025+smoothstep(950.,3100.,distance)*.00019;
   float alpha=1.-exp(-(density+haze)*stepLength);
   float light=smoothstep(.28,.76,n);
   float tint=.5+.5*sin(p.z*.00065+p.x*.0005);
   vec3 shadow=mix(vec3(.21,.30,.47),vec3(.36,.27,.49),tint);
   vec3 cloud=mix(shadow,vec3(.84,.88,.95),light*.82);
   if(lightningPower>0.){vec3 delta=p-lightningPosition;float glow=exp(-dot(delta,delta)/490000.);float blend=.5+.5*sin(p.z*.003+p.x*.0017);vec3 electricColor=mix(lightningColor,lightningColor2,blend);cloud+=electricColor*glow*lightningPower*1.05;}
   vec3 color=mix(vec3(.27,.33,.45),cloud,density/(density+haze+.000001));
   accumulated+=transmission*alpha*color;transmission*=1.-alpha;
   if(transmission<.015)break;
  }
  gl_FragColor=vec4(accumulated+transmission*background,1.);
 }`});
 const geometry=new T.PlaneGeometry(2,2),sky=new T.Mesh(geometry,material);sky.name='Nubes volumétricas cooperativas';sky.frustumCulled=false;sky.renderOrder=-10000;
 sky.onBeforeRender=(_renderer,_scene,camera)=>{uniforms.eye.value.copy(camera.position);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse)};
 scene.add(sky);
 const lightning=createCloudLightning(T,scene,uniforms);
 const previousBackground=scene.background;scene.background=new T.Color(0x445473);
 return {update(dt){uniforms.time.value+=dt;lightning.update(dt)},dispose(){lightning.dispose();scene.remove(sky);geometry.dispose();material.dispose();noise.dispose();scene.background=previousBackground}};
}
export function constrainCooperativePosition(p){
 const r=Math.hypot(p.x,p.y-120),limit=1540;
 if(r>limit){p.x*=limit/r;p.y=120+(p.y-120)*limit/r}
 p.z=Math.max(-12440,Math.min(1140,p.z));
}
