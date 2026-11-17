import test from 'node:test';
import assert from 'node:assert/strict';
import {wantsObsidianPreview,displayedShip} from '../js/obsidian-visual-preview.js';
test('visual preview is opt-in and disabled in multiplayer',()=>{
 assert.equal(wantsObsidianPreview('',false),false);
 assert.equal(wantsObsidianPreview('?obsidianPreview=1',true),false);
 assert.equal(wantsObsidianPreview('?obsidianPreview=1',false),true);
 assert.equal(wantsObsidianPreview('?obsidianPreview=0',false),false);
});
test('preview changes only the displayed ship id and leaves the selected ship untouched',()=>{
 const player={shipId:'aurora',ownedShips:{aurora:true},attack:42};
 const before=structuredClone(player);
 assert.equal(displayedShip(player.shipId,true),'obsidian');
 assert.deepEqual(player,before);
 assert.equal(displayedShip(player.shipId,false),'aurora');
});
