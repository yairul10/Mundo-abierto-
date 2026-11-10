// Enemy flame footprint and visual use the same two nozzle origins and widening cones.
export const INFERNO=Object.freeze({range:900,nozzleX:46,nozzleY:-5,nozzleZ:85,mouthRadius:28,spread:.40,charge:1,fire:3,fade:.5,cooldown:3.5,damage:100});
export function inInfernoFlames(point,radius=0,c=INFERNO){
 const z=point.z-c.nozzleZ;
 if(z < -radius || z > c.range+radius)return false;
 const width=c.mouthRadius+Math.max(0,Math.min(c.range,z))*c.spread+radius;
 return [-1,1].some(side=>Math.hypot(point.x-side*c.nozzleX,point.y-c.nozzleY)<=width);
}
// Integrate flame intensity, including the linear fade, across phase boundaries.
export function infernoPower(state,c=INFERNO){return state.phase==='fire'?1:state.phase==='fade'?Math.max(0,1-state.elapsed/c.fade):0}
export function advanceInferno(state,dt,c=INFERNO){
 let firing=0,remaining=Math.max(0,dt);
 while(remaining>0){
  const duration=c[state.phase],step=Math.min(remaining,duration-state.elapsed);
  if(state.phase==='fire')firing+=step;
  if(state.phase==='fade')firing+=step*(1-(state.elapsed+step/2)/c.fade);
  state.elapsed+=step;remaining-=step;
  if(state.elapsed>=duration-1e-9){state.phase=state.phase==='charge'?'fire':state.phase==='fire'?'fade':state.phase==='fade'?'cooldown':'charge';state.elapsed=0}
 }
 return firing;
}
export function createInfernoCombat(THREE,{targets,damage,warn=()=>{}}){
 const states=new WeakMap();
 // A single instanced draw call per enemy: rounded, camera-facing flame puffs.
 const geometry=new THREE.InstancedBufferGeometry();
 const quad=new THREE.PlaneGeometry(2,2);
 geometry.setIndex(quad.index);geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
 const count=112,seeds=new Float32Array(count*3);
 for(let i=0;i<count;i++){seeds[i*3]=i%2===0?-1:1;seeds[i*3+1]=Math.floor(i/2)/56;seeds[i*3+2]=((i*73)%113)/113}
 geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,3));geometry.instanceCount=count;
 const vertexShader=`uniform float time;attribute vec3 seed;varying vec2 vUv;varying float age;varying float variation;
 void main(){
  vUv=uv;age=fract(seed.y+time*.72);variation=seed.z;
  float distance=age*900.;float width=28.+distance*.40;
  float angle=seed.z*39.5+time*1.7;
  vec3 center=vec3(seed.x*46.+cos(angle)*width*.30,-5.+sin(angle*1.23)*width*.30,85.+distance);
  vec4 viewCenter=modelViewMatrix*vec4(center,1.);
  float spin=seed.z*6.283+time*(seed.z-.5);
  mat2 turn=mat2(cos(spin),-sin(spin),sin(spin),cos(spin));
  vec2 offset=turn*position.xy*width*.72;
  viewCenter.xy+=offset;
  gl_Position=projectionMatrix*viewCenter;
 }`;
 const fragmentShader=`uniform float time;uniform float power;varying vec2 vUv;varying float age;varying float variation;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
  vec2 p=vUv*2.-1.;
  float n=noise(p*4.+vec2(variation*17.,-time*3.));
  float detail=noise(p*9.-time*1.5);
  float edge=length(p)+(.5-n)*.32;
  float body=1.-smoothstep(.40,.98,edge);
  float life=smoothstep(0.,.045,age)*(1.-smoothstep(.68,1.,age));
  float alpha=body*life*power*(.22+.30*n);
  if(alpha<.012)discard;
  float heat=clamp((1.-edge)*.72+n*.32-age*.40,0.,1.);
  vec3 color=mix(vec3(.72,.055,.008),vec3(1.,.34,.018),heat);
  color=mix(color,vec3(1.,.72,.16),smoothstep(.62,.96,heat)*(.5+.5*detail));
  gl_FragColor=vec4(color,alpha);
 }`;
 function stateFor(enemy){
  let state=states.get(enemy);if(state)return state;
  const root=new THREE.Group(),uniforms={time:{value:0},power:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending});
  const flames=new THREE.Mesh(geometry,material);flames.frustumCulled=false;root.add(flames);
  const glow=new THREE.PointLight(0xff7020,0,380);glow.position.z=95;root.add(glow);enemy.mesh.add(root);enemy.mesh.userData.infernoEffects=root;
  state={phase:'cooldown',elapsed:2,root,uniforms,glow,flames,announced:false};states.set(enemy,state);return state;
 }
 function reset(enemy){const s=states.get(enemy);if(!s)return;s.root.visible=false;s.glow.intensity=0;s.phase='cooldown';s.elapsed=0;s.announced=false}
 function update(enemy,dt,{active,aim,scale=1}){
  if(!active||enemy.dead||!enemy.mesh.visible){reset(enemy);return}
  const s=stateFor(enemy);s.root.visible=true;
  // Lock orientation for the firing burst so pilots can escape through the sides.
  if(s.phase!=='fire'&&s.phase!=='fade')enemy.mesh.lookAt(aim);
  const firing=advanceInferno(s,dt);
  if(s.phase==='charge'&&!s.announced){warn(enemy);s.announced=true}
  if(s.phase==='cooldown')s.announced=false;
  s.uniforms.time.value+=dt;s.uniforms.power.value=infernoPower(s);s.flames.visible=s.uniforms.power.value>0;
  s.glow.intensity=s.phase==='charge'?1+s.elapsed*3:4*infernoPower(s);
  if(firing){
   enemy.mesh.updateMatrixWorld(true);
   // Iterate every eligible pilot; overlapping jets count once per pilot.
   for(const target of targets()){
    if(target.canHit===false)continue;
    const local=enemy.mesh.worldToLocal(target.position.clone());
    if(inInfernoFlames(local,target.radius||0))damage(target,INFERNO.damage*scale*firing,enemy);
   }
  }
 }
 return {update,reset};
}
