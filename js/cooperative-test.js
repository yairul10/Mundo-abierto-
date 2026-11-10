import * as T from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

// This preview never reads or writes player saves and never opens a server connection.
const $=id=>document.getElementById(id),scene=new T.Scene();
scene.background=new T.Color(0x05071b);scene.fog=new T.FogExp2(0x171738,.00034);
const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,5,6500);
const renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
scene.add(new T.HemisphereLight(0x99b8ff,0x352054,3));
const sun=new T.DirectionalLight(0xa2c8ff,2);sun.position.set(200,600,200);scene.add(sun);
const LENGTH=5000,RADIUS=760,wallMaterial=new T.MeshStandardMaterial({color:0x25223d,roughness:1,side:T.BackSide});
// Rough continuous rock shell, closed at the sides, roof, floor and far end.
const shellGeometry=new T.CylinderGeometry(RADIUS,RADIUS,LENGTH,48,70,true);shellGeometry.rotateX(Math.PI/2);shellGeometry.translate(0,0,-LENGTH/2+300);
const p=shellGeometry.attributes.position;
for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(y,x),r=RADIUS+42*Math.sin(z*.013+a*7)+28*Math.sin(z*.027-a*11);p.setXYZ(i,Math.cos(a)*r,Math.sin(a)*r,z)}
shellGeometry.computeVertexNormals();scene.add(new T.Mesh(shellGeometry,wallMaterial));
const rockGeometry=new T.IcosahedronGeometry(1,0),rockMaterial=new T.MeshStandardMaterial({color:0x39364d,roughness:1});
const rocks=new T.InstancedMesh(rockGeometry,rockMaterial,680),dummy=new T.Object3D();let randomSeed=57;
const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296};
for(let i=0;i<680;i++){const a=random()*Math.PI*2,z=280-random()*LENGTH,r=700+random()*60;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);dummy.rotation.set(random()*6,random()*6,random()*6);dummy.scale.set(55+random()*100,45+random()*110,70+random()*140);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix)}scene.add(rocks);
for(const z of [320,-4700]){const cap=new T.Mesh(new T.CircleGeometry(RADIUS,48),rockMaterial);cap.position.z=z;if(z===320)cap.rotation.y=Math.PI;scene.add(cap)}

// Shared soft cloud texture; sparse layers hug the cave rather than covering the flight lane.
const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
for(let i=0;i<45;i++){const x=24+random()*80,y=24+random()*80,r=12+random()*32,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128)}
const texture=new T.CanvasTexture(canvas),clouds=[];
for(let i=0;i<112;i++){const a=random()*Math.PI*2,z=220-random()*LENGTH,r=615+random()*50;const mat=new T.SpriteMaterial({map:texture,color:i%2?0x7547ed:0x2868e8,transparent:true,opacity:.37,depthWrite:false,blending:T.AdditiveBlending});const cloud=new T.Sprite(mat);cloud.position.set(Math.cos(a)*r,Math.sin(a)*r,z);const size=350+random()*260;cloud.scale.set(size,size,1);scene.add(cloud);clouds.push({cloud,a,z,r,phase:random()*6})}
for(let i=0;i<4;i++){const light=new T.PointLight(i%2?0x9b35ff:0x258fff,160000,1300,2);light.position.set(i%2?500:-500,-250,-i*1300);scene.add(light)}

const loader=new GLTFLoader();
function box(w,h,d,color){return new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8,metalness:.35}))}
function loadModel(file,parent,size){loader.load('./assets/models/'+file,gltf=>{const source=gltf.scene,bounds=new T.Box3().setFromObject(source),span=Math.max(...bounds.getSize(new T.Vector3()).toArray());if(!(span>0))return;const center=bounds.getCenter(new T.Vector3()),factor=size/span;source.scale.setScalar(factor);source.position.copy(center).multiplyScalar(-factor);for(const child of [...parent.children])parent.remove(child);parent.add(source)},undefined,()=>{})}
const base=new T.Group();base.position.set(0,-250,0);scene.add(base);base.add(box(430,55,260,0x43596e));
for(const x of [-220,220]){const pad=box(180,15,180,0x536d82);pad.position.x=x;base.add(pad);const ring=new T.Mesh(new T.TorusGeometry(65,3,6,40),new T.MeshBasicMaterial({color:0x55ddff}));ring.rotation.x=Math.PI/2;ring.position.set(x,13,0);base.add(ring)}
const tower=box(90,100,75,0x526378);tower.position.y=70;base.add(tower);
const player=new T.Group();scene.add(player);const hull=box(42,14,80,0xd5e4f0);player.add(hull);const wings=box(100,6,30,0x9c4456);wings.position.z=10;player.add(wings);loadModel('aurora_s1.glb',player,100);
const bosses=[];
for(let i=0;i<3;i++){const mesh=new T.Group();mesh.position.set(i===1?240:-200,i===1?100:0,-[1200,2500,3800][i]);const hull=box(230,65,420,0x4b4147);mesh.add(hull);const bridge=box(80,85,120,0x746069);bridge.position.y=65;mesh.add(bridge);scene.add(mesh);loadModel('coloso.glb',mesh,420);bosses.push({mesh,hp:200000,name:'Coloso Pro '+(i+1),timer:2+i,warning:0})}
const shotGeometry=new T.SphereGeometry(4,6,4),playerShotMaterial=new T.MeshBasicMaterial({color:0x6feaff}),enemyShotMaterial=new T.MeshBasicMaterial({color:0xff6c45}),shots=[];
let hp=5000,kills=0,fireHeld=false,fireCd=0,invulnerable=0,time=0,joy={x:0,y:0},vertical=0,noticeUntil=8;
const keys=new Set(),forward=new T.Vector3(0,0,-1);player.position.set(0,0,80);
function notice(text){$('message').textContent=text;noticeUntil=time+4}
function clearShots(){for(const s of shots)scene.remove(s.mesh);shots.length=0}
function reset(){hp=5000;kills=0;fireCd=0;invulnerable=2;player.position.set(0,0,80);clearShots();for(const [i,b]of bosses.entries()){b.hp=200000;b.mesh.visible=true;b.timer=2+i;b.warning=0}notice('Sal de la base y explora la caverna')}
function shoot(origin,direction,enemy=false){const mesh=new T.Mesh(shotGeometry,enemy?enemyShotMaterial:playerShotMaterial);mesh.position.copy(origin);scene.add(mesh);shots.push({mesh,velocity:direction.clone().multiplyScalar(enemy?450:1900),enemy,life:enemy?5:1.2})}
function nearestBoss(){return bosses.filter(b=>b.hp>0).sort((a,b)=>a.mesh.position.distanceToSquared(player.position)-b.mesh.position.distanceToSquared(player.position))[0]}
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code)});addEventListener('keyup',e=>keys.delete(e.code));
function release(){keys.clear();joy={x:0,y:0};vertical=0;fireHeld=false;$('stick').style.transform=''}
addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
const joystick=$('joystick');let joystickPointer=null;
function steer(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,length=Math.max(1,Math.hypot(x,y)/(b.width*.34));joy={x:x/length/(b.width*.34),y:y/length/(b.width*.34)};$('stick').style.transform='translate('+joy.x*30+'px,'+joy.y*30+'px)'}
joystick.onpointerdown=e=>{joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);steer(e)};joystick.onpointermove=e=>{if(e.pointerId===joystickPointer)steer(e)};joystick.onpointerup=joystick.onpointercancel=()=>{joystickPointer=null;joy={x:0,y:0};$('stick').style.transform=''};
function hold(id,start,stop){const b=$(id);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);start()};b.onpointerup=b.onpointercancel=stop}
hold('fire',()=>fireHeld=true,()=>fireHeld=false);hold('rise',()=>vertical=1,()=>vertical=0);hold('lower',()=>vertical=-1,()=>vertical=0);$('restart').onclick=reset;
const clock=new T.Clock(),cameraGoal=new T.Vector3(),lookGoal=new T.Vector3();
function frame(){requestAnimationFrame(frame);const dt=Math.min(.05,clock.getDelta());if(document.hidden)return;time+=dt;fireCd-=dt;invulnerable-=dt;
 if(hp>0){let x=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=joy.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),y=vertical+(keys.has('KeyR')?1:0)-(keys.has('KeyF')?1:0);const norm=Math.max(1,Math.hypot(x,y,z));player.position.addScaledVector(new T.Vector3(x,y,z),340*dt/norm);const radial=Math.hypot(player.position.x,player.position.y);if(radial>540){player.position.x*=540/radial;player.position.y*=540/radial}player.position.z=T.MathUtils.clamp(player.position.z,-4450,130);player.rotation.z=T.MathUtils.lerp(player.rotation.z,-x*.16,Math.min(1,dt*8));
  if(player.position.z>-400)hp=Math.min(5000,hp+500*dt);
  if((fireHeld||keys.has('Space'))&&fireCd<=0){fireCd=.16;const target=nearestBoss(),dir=target&&target.mesh.position.distanceTo(player.position)<1450?target.mesh.position.clone().sub(player.position).normalize():forward;shoot(player.position.clone().add(new T.Vector3(0,0,-50)),dir)}
 }
 for(const b of bosses){if(b.hp<=0||hp<=0)continue;const distance=b.mesh.position.distanceTo(player.position);if(distance<1200&&player.position.z<-400){b.timer-=dt;if(b.timer<=1&&b.warning===0){b.warning=1;notice(b.name+' prepara una descarga')}if(b.timer<=0){b.timer=3.5;b.warning=0;shoot(b.mesh.position.clone(),player.position.clone().sub(b.mesh.position).normalize(),true)}}}
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.mesh.position.addScaledVector(s.velocity,dt);s.life-=dt;if(s.enemy){if(hp>0&&invulnerable<=0&&s.mesh.position.distanceTo(player.position)<55){if(player.position.z<-400){hp=Math.max(0,hp-300);invulnerable=.2;if(!hp)notice('Nave destruida · Pulsa Reiniciar para volver a la base')}s.life=0}}else for(const b of bosses){if(b.hp>0&&s.mesh.position.distanceTo(b.mesh.position)<210){b.hp=Math.max(0,b.hp-4000);s.life=0;if(!b.hp){b.mesh.visible=false;kills++;notice(kills===3?'¡Expedición completada! · 3 Colosos derrotados':b.name+' derrotado · '+kills+'/3')}break}}if(s.life<=0){scene.remove(s.mesh);shots.splice(i,1)}}
 for(const c of clouds){c.cloud.material.rotation=Math.sin(time*.07+c.phase)*.12;c.cloud.position.y=Math.sin(c.a)*c.r+Math.sin(time*.15+c.phase)*14}
 cameraGoal.copy(player.position).add(new T.Vector3(0,145,310));camera.position.lerp(cameraGoal,1-Math.exp(-dt*6));lookGoal.copy(player.position).add(new T.Vector3(0,30,-500));camera.lookAt(lookGoal);
 const b=nearestBoss(),d=b?b.mesh.position.distanceTo(player.position):Infinity;$('boss').hidden=d>1800;if(b&&d<=1800){$('bossName').textContent=b.name;$('bossHp').value=b.hp;$('bossDistance').textContent=Math.ceil(b.hp).toLocaleString('es-CL')+' PV · '+Math.round(d)+' m'}
 $('health').textContent='Casco '+Math.ceil(hp).toLocaleString('es-CL')+' / 5.000';$('healthBar').value=hp;$('distance').textContent=player.position.z>-400?'Base · Zona protegida':Math.round(-player.position.z)+' m · Colosos '+kills+'/3';if(time>noticeUntil&&hp>0)$('message').textContent='';renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notice('Se perdió la imagen · Recarga la página')});
camera.position.copy(player.position).add(new T.Vector3(0,145,310));$('loading').remove();frame();
