import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Exercise the production request guard without a network or DOM dependency.
const shared=readFileSync(new URL('../js/shared-session.js',import.meta.url),'utf8');
const methods=shared.slice(shared.indexOf('return {get canDock(){')+8,shared.indexOf('get active(){',shared.indexOf('return {get canDock(){')));
const makeRequest=new Function('bridge','me','state','send',`let hangarRequested=false,hangarRequestAt=0;const tools={hidden:false},clearSelection=()=>{};return {${methods}active:true};`);
let overPad=false;const sent=[],me={pos:[0,120,0],duelId:null,hangar:false},state={rules:{safeRadius:600}};
const request=makeRequest({canLand:()=>overPad},me,state,m=>sent.push(m));
assert.equal(request.requestHangar(),false);assert.equal(sent.length,0,'being in the base is insufficient without a platform');
overPad=true;me.duelId='duel';assert.equal(request.requestHangar(),false);me.duelId=null;
me.pos=[700,0,0];assert.equal(request.requestHangar(),false);me.pos=[0,120,0];
assert.equal(request.requestHangar(),true);assert.deepEqual(sent,[{type:'hangar',open:true}]);assert.equal(request.requestHangar(),false,'cannot duplicate pending request');
// Run the same approach/descent function used by both normal and PvP flight.
const game=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const advance=game.slice(game.indexOf('function advanceLanding(dt){'),game.indexOf('function leaveHangar(){'));
const simulation=new Function(`${advance}
 let landing=true,landingTime=0,landingYaw=1,landingPitch=.4,yaw=1,pitch=.4,opened=0;
 const smooth=t=>t*t*(3-2*t),dockBtn={},LANDING_APPROACH={x:100,y:155,z:20},LANDING_TOUCHDOWN={x:100,y:37,z:20},landingStart={x:0,y:120,z:0};
 const playerMesh={position:{lerpVectors(a,b,t){for(const k of ['x','y','z'])this[k]=a[k]+(b[k]-a[k])*t}}};
 function finishLanding(){landing=false;opened++;Object.assign(playerMesh.position,LANDING_TOUCHDOWN)}
 return {advanceLanding,get state(){return {opened,position:playerMesh.position,landing,yaw,pitch}}};`)();
simulation.advanceLanding(3.4);assert.equal(simulation.state.opened,0);assert.equal(simulation.state.position.y,155);
simulation.advanceLanding(2);assert.equal(simulation.state.opened,0);assert(simulation.state.position.y<155&&simulation.state.position.y>37);
simulation.advanceLanding(2.3);assert.equal(simulation.state.opened,1);assert.equal(simulation.state.position.y,37);simulation.advanceLanding(1);assert.equal(simulation.state.opened,1);
console.log('PvP landing: platform/base/duel guards, one pending reservation, full approach and descent before hangar opens.');
