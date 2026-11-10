// Camera-space cloud volume: no distant cylinder cap or camera-far-plane seam.
export function mountCooperativeClouds(T,scene){
 let seed=127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const size=64,data=new Uint8Array(size*size*4);
 for(let i=0;i<size*size;i++){const n=Math.floor(random()*255);data.set([n,n,n,255],i*4)}
 const noise=new T.DataTexture(data,size,size,T.RGBAFormat);noise.wrapS=noise.wrapT=T.RepeatWrapping;noise.minFilter=noise.magFilter=T.LinearFilter;noise.needsUpdate=true;
 const uniforms={noiseMap:{value:noise},time:{value:0},eye:{value:new T.Vector3()},cameraWorld:{value:new T.Matrix4()},inverseProjection:{value:new T.Matrix4()}};
 const material=new T.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,
 vertexShader:`varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
 fragmentShader:`uniform sampler2D noiseMap;uniform float time;uniform vec3 eye;uniform mat4 cameraWorld;uniform mat4 inverseProjection;varying vec2 screenUv;
 float field(vec3 p){
  vec2 drift=vec2(time*.0015,-time*.0008);
  float a=texture2D(noiseMap,p.xy*.00010+p.z*.000023+drift).r;
  float b=texture2D(noiseMap,p.yz*.00023-p.x*.000037-drift).r;
  float c=texture2D(noiseMap,p.xz*.00052+drift*.6).r;
  return a*.55+b*.30+c*.15;
 }
 void main(){
  vec4 view=inverseProjection*vec4(screenUv*2.-1.,1.,1.);
  vec3 ray=normalize(mat3(cameraWorld)*(view.xyz/view.w));
  float horizon=.5+.5*ray.y;
  vec3 background=mix(vec3(.13,.18,.30),vec3(.30,.35,.47),horizon);
  vec3 accumulated=vec3(0.);float transmission=1.;
  for(int i=0;i<24;i++){
   float f=float(i);float distance=60.+f*110.+f*f*6.;
   float stepLength=116.+f*12.;
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
   vec3 color=mix(vec3(.27,.33,.45),cloud,density/(density+haze+.000001));
   accumulated+=transmission*alpha*color;transmission*=1.-alpha;
   if(transmission<.015)break;
  }
  gl_FragColor=vec4(accumulated+transmission*background,1.);
 }`});
 const geometry=new T.PlaneGeometry(2,2),sky=new T.Mesh(geometry,material);sky.name='Nubes volumétricas cooperativas';sky.frustumCulled=false;sky.renderOrder=-10000;
 sky.onBeforeRender=(_renderer,_scene,camera)=>{uniforms.eye.value.copy(camera.position);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse)};
 scene.add(sky);
 const previousBackground=scene.background;scene.background=new T.Color(0x445473);
 return {update(dt){uniforms.time.value+=dt},dispose(){scene.remove(sky);geometry.dispose();material.dispose();noise.dispose();scene.background=previousBackground}};
}
export function constrainCooperativePosition(p){
 const r=Math.hypot(p.x,p.y-120),limit=1540;
 if(r>limit){p.x*=limit/r;p.y=120+(p.y-120)*limit/r}
 p.z=Math.max(-12440,Math.min(1140,p.z));
}
