// Local VFX only. Fragment clones share the Cemetery's geometries and materials.
export function createTitanFireburst(T,scene,fragments){
 const geometry=new T.PlaneGeometry(1,1),bursts=[];
 const vertexShader=`
 varying vec2 coord;
 void main(){coord=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `;
 const fragmentShader=`
 varying vec2 coord;
 uniform float age;
 uniform float seed;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
 }
 void main(){
  vec2 p=coord;
  vec2 q=p*5.5+vec2(seed,age*2.4);
  float n=noise(q)*.55+noise(q*2.1-age)*.29+noise(q*4.3)*.16;
  float shape=max(1.0-length((p+vec2(.24,.07))*vec2(1.48,1.66)),
              max(1.0-length((p-vec2(.26,.18))*vec2(1.76,1.85)),
                  1.0-length((p-vec2(.07,-.25))*vec2(1.87,1.82))));
  float field=shape+(n-.55)*.74;
  float alpha=smoothstep(.03,.28,field)*(1.0-smoothstep(.18,1.0,age));
  float heat=clamp(field*.65+n*.51-age*.47,0.0,1.0);
  vec3 color=mix(vec3(.31,.027,.003),vec3(1.0,.31,.021),smoothstep(.12,.53,heat));
  color=mix(color,vec3(1.0,.94,.72),smoothstep(.50,.91,heat));
  gl_FragColor=vec4(color,alpha*.94);
 }
 `;
 function remove(burst){
  burst.root.removeFromParent();
  for(const flame of burst.flames)flame.mesh.material.dispose();
 }
 function spawn(position,radius,{hull=null,count=0}={}){
  if(bursts.length>=12)remove(bursts.shift());
  const root=new T.Group();root.position.copy(position);scene.add(root);
  const flames=(hull?[[0,0,-.8],[-.32,.18,.45],[.28,-.1,1.18]]:[[0,0,0]]).map(([x,y,z],i)=>{
   const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:{age:{value:0},seed:{value:Math.random()*100}},transparent:true,depthWrite:false,blending:T.AdditiveBlending});
   const mesh=new T.Mesh(geometry,material);
   mesh.position.set(x*radius,y*radius,z*radius);
   if(hull)mesh.position.applyQuaternion(hull.quaternion);
   mesh.visible=false;root.add(mesh);
   return {mesh,delay:i*.12,size:radius*(i===2?2.9:2.25)};
  });
  const debris=Array.from({length:count},(_,i)=>{
   const mesh=fragments(i);mesh.scale.multiplyScalar(.44+i%3*.12);
   const angle=i*2.39996,velocity=new T.Vector3(Math.cos(angle),i%2?.28:-.38,Math.sin(angle)).multiplyScalar(105+i*21);
   mesh.position.copy(flames[i%flames.length].mesh.position);
   mesh.visible=false;root.add(mesh);
   return {mesh,velocity,delay:flames[i%flames.length].delay};
  });
  bursts.push({root,flames,debris,age:0,duration:hull?1.65:.78});
 }
 function update(dt,camera){
  for(let i=bursts.length-1;i>=0;i--){
   const burst=bursts[i];burst.age+=dt;
   if(burst.age>=burst.duration){remove(burst);bursts.splice(i,1);continue}
   for(const {mesh,delay,size} of burst.flames){
    const t=(burst.age-delay)/.72;mesh.visible=t>=0&&t<1;
    if(!mesh.visible)continue;
    mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(size*(.18+.82*(1-(1-t)**3)));
    mesh.material.uniforms.age.value=t;
   }
   for(const {mesh,velocity,delay} of burst.debris){
    const elapsed=Math.min(dt,burst.age-delay);
    if(elapsed<=0)continue;
    mesh.visible=true;mesh.position.addScaledVector(velocity,elapsed);
    mesh.rotation.x+=elapsed*1.8;mesh.rotation.z+=elapsed*(velocity.x>0?2.1:-2.1);
   }
  }
 }
 function clear(){for(const burst of bursts)remove(burst);bursts.length=0}
 return {spawn,update,clear};
}
