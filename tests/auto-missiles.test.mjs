import test from 'node:test';
import assert from 'node:assert/strict';
import {AUTO_MISSILE_PRICE,buyAutoMissiles,toggleAutoMissiles,shouldAutoMissile} from '../js/auto-missiles.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
test('permanent extra costs 200k once and toggles for free',()=>{
 const player={gold:250000};assert.equal(AUTO_MISSILE_PRICE,200000);
 assert.equal(buyAutoMissiles(player),true);assert.equal(player.gold,50000);assert.equal(player.autoMissilesEnabled,true);
 assert.equal(buyAutoMissiles(player),false);assert.equal(player.gold,50000);
 assert.equal(toggleAutoMissiles(player),true);assert.equal(player.autoMissilesEnabled,false);
 assert.equal(toggleAutoMissiles(player),true);assert.equal(player.autoMissilesEnabled,true);assert.equal(player.gold,50000);
 assert.equal(toggleAutoMissiles({gold:1}),false);
 for(const gold of [0,199999,NaN,Infinity,'200000'])assert.equal(buyAutoMissiles({gold}),false);
});
test('failed persistence rolls back purchase and toggle without losing credits',()=>{
 const player={gold:200000};assert.equal(buyAutoMissiles(player,()=>false),false);assert.deepEqual(player,{gold:200000});
 assert.equal(buyAutoMissiles(player,()=>{throw Error('storage')}),false);assert.deepEqual(player,{gold:200000});
 buyAutoMissiles(player);assert.equal(toggleAutoMissiles(player,()=>false),false);assert.equal(player.autoMissilesEnabled,true);
});
test('auto missiles respect cooldown, target visibility, life and menu blocks',()=>{
 const player={autoMissilesOwned:true,autoMissilesEnabled:true},target={hp:50,dead:false,mesh:{visible:true}};
 assert.equal(shouldAutoMissile(player,{target}),true);
 for(const options of [{target,remaining:7},{target,blocked:true},{target:null},{target:{...target,hp:0}},{target:{...target,dead:true}},{target:{...target,mesh:{visible:false}}}])assert.equal(shouldAutoMissile(player,options),false);
 assert.equal(shouldAutoMissile({...player,autoMissilesEnabled:false},{target}),false);assert.equal(shouldAutoMissile({...player,autoMissilesOwned:false},{target}),false);
});
test('cooperative hangar and JSON saves preserve purchase and enabled state',()=>{
 const source={gold:250000,shipId:'aurora',ownedShips:{aurora:true},maxHp:100,hp:100};
 const editor=createHangarEditor(source);buyAutoMissiles(editor);
 const saved=JSON.parse(JSON.stringify(serializeHangarEditor(editor,source)));
 assert.equal(saved.gold,50000);assert.equal(saved.autoMissilesOwned,true);assert.equal(saved.autoMissilesEnabled,true);
 const reopened=createHangarEditor(saved);toggleAutoMissiles(reopened);
 const disabled=serializeHangarEditor(reopened,saved);assert.equal(disabled.autoMissilesOwned,true);assert.equal(disabled.autoMissilesEnabled,false);
});
