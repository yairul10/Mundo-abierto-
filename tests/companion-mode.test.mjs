import assert from 'node:assert/strict';
import {companionMode,selectCompanionTask} from '../js/companion-priority.js';
import {mountCompanionControls} from '../js/companion-controls.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
import {initialPvpPilot} from '../js/pvp-loadout.js';
const manual={id:'manual'},enemy={id:'enemy'},base={manualActive:true,manualTarget:manual,threats:new Map([[enemy,10]]),now:11,isValid:()=>true};
assert.deepEqual(selectCompanionTask({...base,mode:'collect'}),{mode:'collect',target:null});
for(const mode of ['both','attack']){
 assert.deepEqual(selectCompanionTask({...base,mode}),{mode:'attack',target:manual});
 assert.deepEqual(selectCompanionTask({...base,mode,manualActive:false}),{mode:'defend',target:enemy});
 const idle=selectCompanionTask({...base,mode,manualActive:false,threats:new Map()});assert.equal(idle.mode,mode==='attack'?'idle':'collect');assert.equal(idle.target,null);
 assert.equal(selectCompanionTask({...base,mode,protectedZone:true}).target,null);
}
assert.equal(companionMode('bad'),'both');assert.equal(selectCompanionTask({...base,manualActive:false,now:20}).mode,'collect');
const storage=JSON.parse(JSON.stringify({shipId:'aurora',explorerDrone:true,explorerMode:'collect'}));
assert.equal(initialPvpPilot(storage).explorerMode,'collect');assert.equal(serializeHangarEditor(createHangarEditor(storage),storage).explorerMode,'collect');
// Actual control cycles once on touch and hides until the explorer is owned.
const attributes={},events={};const button={style:{},setAttribute:(k,v)=>attributes[k]=v,addEventListener:(k,v)=>events[k]=v};globalThis.document={createElement:()=>button};
const p={explorerDrone:false,explorerMode:'both'},changes=[];
const ui=mountCompanionControls({parent:{append:()=>{}},getPlayer:()=>p,onChange:mode=>{changes.push(mode);p.explorerMode=mode}});
assert.equal(button.hidden,true);assert.equal(button.style.display,'none');button.onclick();assert.equal(changes.length,0);
p.explorerDrone=true;ui.render();assert.equal(button.hidden,false);assert.equal(button.textContent,'🛰 Ambos');button.click=()=>button.onclick();
events.touchstart({preventDefault(){},stopPropagation(){}});assert.equal(p.explorerMode,'attack');assert.equal(changes.length,1);
button.onclick();assert.equal(p.explorerMode,'collect');assert.equal(button.textContent,'🛰 Recoger');button.onclick();assert.equal(p.explorerMode,'both');
console.log('Companion modes: no shooting in collect, no pickups in attack, protected zones, previous default, PvP save round trip and touch control.');
