import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('spectator projectiles move and expire while the eliminated player cannot act',()=>{
 const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8'),start=source.indexOf('function updateSpectatorShots(dt){'),end=source.indexOf('function skill(){',start),body=source.slice(start,end);
 const position={x:0,addScaledVector(v,dt){this.x+=v.x*dt}},remote={pvpRemote:true,vel:{x:100,length:()=>100},mesh:{position},life:1},local={pvpRemote:false,life:1};const shots=[remote,local];let removed=0,cleaned=0;
 const update=new Function('shots','THREE','updateMissileEffects','removeMissileEffects','scene','COMBAT_RANGE',body+';return updateSpectatorShots')(shots,null,()=>{},()=>cleaned++,{remove(){removed++}},1200);
 update(.25);assert.equal(position.x,25);assert.equal(remote.life,.75);assert.equal(local.life,1);
 update(1);assert.equal(shots.length,1);assert.equal(shots[0],local);assert.equal(removed,1);assert.equal(cleaned,1);
 assert.match(source,/if\(!pvpSession\.matchPaused\)updateSpectatorShots\(dt\)/);
});
