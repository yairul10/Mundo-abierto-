// Enemy flame footprint and visual use the same two nozzle origins and widening cones.
export const INFERNO=Object.freeze({range:900,nozzleX:46,nozzleY:-5,nozzleZ:85,mouthRadius:28,spread:.40,charge:1,fire:3,cooldown:4,damage:100});
export function inInfernoFlames(point,radius=0,c=INFERNO){
 const z=point.z-c.nozzleZ;
 if(z < -radius || z > c.range+radius)return false;
 const width=c.mouthRadius+Math.max(0,Math.min(c.range,z))*c.spread+radius;
 return [-1,1].some(side=>Math.hypot(point.x-side*c.nozzleX,point.y-c.nozzleY)<=width);
}
// Return only the actual firing interval, even when a frame crosses a phase boundary.
export function advanceInferno(state,dt,c=INFERNO){
 let firing=0,remaining=Math.max(0,dt);
 while(remaining>0){
  const duration=c[state.phase],step=Math.min(remaining,duration-state.elapsed);
  if(state.phase==='fire')firing+=step;
  state.elapsed+=step;remaining-=step;
  if(state.elapsed>=duration-1e-9){state.phase=state.phase==='charge'?'fire':state.phase==='fire'?'cooldown':'charge';state.elapsed=0}
 }
 return firing;
}
export function createInfernoCombat(THREE,{targets,damage,warn=()=>{}}){
 const states=new WeakMap();
 const geometry=new THREE.PlaneGeometry(2,1,1,20),positions=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<positions.count;i++){const z=uv.getY(i)*INFERNO.range;positions.setXYZ(i,positions.getX(i)*(INFERNO.mouthRadius+z*INFERNO.spread),0,z)}
 geometry.computeBoundingSphere();
 const fragmentShader=`uniform float time;uniform float power;varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){float z=vUv.y;float n=noise(vec2(vUv.x*7.,z*13.-time*7.));float edge=abs(vUv.x*2.-1.);float body=1.-smoothstep(.35+n*.25,.85+n*.15,edge);float tip=1.-smoothstep(.68,1.,z+n*.13);float alpha=body*tip*power*(.55+n*.4);if(alpha<.015)discard;vec3 color=mix(vec3(1.,.09,.006),vec3(1.,.65,.08),body*(1.-z*.5));color=mix(color,vec3(1.,.94,.55),pow(body,5.)*(1.-z)*.7);gl_FragColor=vec4(color,alpha);}`;
 function stateFor(enemy){
  let state=states.get(enemy);if(state)return state;
  const root=new THREE.Group(),uniforms={time:{value:0},power:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  for(const side of [-1,1]){
   const jet=new THREE.Group();jet.position.set(side*INFERNO.nozzleX,INFERNO.nozzleY,INFERNO.nozzleZ);
   for(const angle of [0,Math.PI/4,Math.PI/2,3*Math.PI/4]){const plane=new THREE.Mesh(geometry,material);plane.rotation.z=angle;jet.add(plane)}root.add(jet);
  }
  const glow=new THREE.PointLight(0xff7020,0,380);glow.position.z=95;root.add(glow);enemy.mesh.add(root);enemy.mesh.userData.infernoEffects=root;
  state={phase:'cooldown',elapsed:2,root,uniforms,glow,announced:false};states.set(enemy,state);return state;
 }
 function reset(enemy){const s=states.get(enemy);if(!s)return;s.root.visible=false;s.glow.intensity=0;s.phase='cooldown';s.elapsed=0;s.announced=false}
 function update(enemy,dt,{active,aim,scale=1}){
  if(!active||enemy.dead||!enemy.mesh.visible){reset(enemy);return}
  const s=stateFor(enemy);s.root.visible=true;
  // Lock orientation for the firing burst so pilots can escape through the sides.
  if(s.phase!=='fire')enemy.mesh.lookAt(aim);
  const firing=advanceInferno(s,dt);
  if(s.phase==='charge'&&!s.announced){warn(enemy);s.announced=true}
  if(s.phase==='cooldown')s.announced=false;
  s.uniforms.time.value+=dt;s.uniforms.power.value=s.phase==='fire'?1:0;
  s.glow.intensity=s.phase==='charge'?1+s.elapsed*3:s.phase==='fire'?4:0;
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
