// Cloud boundaries inside the existing online world. No separate camera, controls or combat.
export function mountCooperativeClouds(T,scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');let seed=127;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<100;i++){const a=random()*Math.PI*2,r=random()*64,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r,size=22+random()*55;const g=ctx.createRadialGradient(x,y,0,x,y,size);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(.45,'rgba(255,255,255,.055)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256)}
 const texture=new T.CanvasTexture(canvas);
 const placements=[];
 for(let row=0;row<24;row++)for(let side=0;side<14;side++){const a=side/14*Math.PI*2+(row%2)*.18,r=1810+random()*120;placements.push(Math.cos(a)*r,120+Math.sin(a)*r,1180-row*490+(random()-.5)*250,1350+random()*450)}
 for(const z of [1350,-10200])for(let i=0;i<32;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*1600;placements.push(Math.cos(a)*r,120+Math.sin(a)*r,z,1250+random()*400)}
 const quad=new T.PlaneGeometry(2,2),geometry=new T.InstancedBufferGeometry();
 geometry.setIndex(quad.index);geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
 geometry.setAttribute('cloud',new T.InstancedBufferAttribute(new Float32Array(placements),4));geometry.instanceCount=placements.length/4;
 const uniforms={map:{value:texture},time:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending,
 vertexShader:`attribute vec4 cloud;uniform float time;varying vec2 vUv;varying float tint;varying float depth;
 void main(){vUv=uv;tint=sin(cloud.z*.004+cloud.x*.005)*.5+.5;vec3 center=cloud.xyz;center.y+=sin(time*.12+cloud.z*.01)*24.;vec4 view=modelViewMatrix*vec4(center,1.);depth=-view.z;view.xy+=position.xy*cloud.w*.5;gl_Position=projectionMatrix*view;}`,
 fragmentShader:`uniform sampler2D map;uniform float time;varying vec2 vUv;varying float tint;varying float depth;
 void main(){vec2 p=vUv-.5;float a=sin(time*.018+tint*4.)*.22;vec2 uv=mat2(cos(a),-sin(a),sin(a),cos(a))*p+.5;float shape=texture2D(map,uv).a;float detail=texture2D(map,uv*1.7+vec2(time*.004,0.)).a;float alpha=shape*(.38+detail*.40)*smoothstep(5.,150.,depth);if(alpha<.008)discard;vec3 color=mix(vec3(.10,.28,.85),vec3(.52,.13,.90),tint);color+=vec3(.12,.14,.25)*detail;gl_FragColor=vec4(color,alpha);}`});
 const mesh=new T.Mesh(geometry,material);mesh.name='Límites de nubes cooperativas';mesh.frustumCulled=false;scene.add(mesh);
 return {update(dt){uniforms.time.value+=dt},dispose(){scene.remove(mesh);geometry.dispose();quad.dispose();material.dispose();texture.dispose()}};
}
export function constrainCooperativePosition(p){
 const r=Math.hypot(p.x,p.y-120),limit=1540;
 if(r>limit){p.x*=limit/r;p.y=120+(p.y-120)*limit/r}
 p.z=Math.max(-9940,Math.min(1140,p.z));
}
