import assert from 'node:assert/strict';
import {applyBossReceipts,saveBossReceipts} from '../js/pvp-boss-rewards.js';
import {createHangarEditor,serializeHangarEditor} from '../js/pvp-hangar.js';
const source={gold:120,sector:'graveyard',x:40000,hp:400,maxHp:500,shipBaseStats:{maxHp:500,attack:10,defense:5,speed:220}},receipt={id:'round:a',amount:250000};
const first=applyBossReceipts(source,[receipt,receipt]);assert.equal(first.pilot.gold,250120);assert.equal(source.gold,120);assert.equal(first.added,250000);assert.equal(applyBossReceipts(first.pilot,[receipt]).added,0,'Reconnect delivery is idempotent');
assert.equal(applyBossReceipts(source,[{id:'bad',amount:-1},{id:'large',amount:1000001},{id:'nan',amount:NaN}]).added,0);
assert.throws(()=>saveBossReceipts({setItem(){throw Error('quota')}},'save',source,[receipt]));assert.equal(source.gold,120);assert.equal(source.pvpBossReceipts,undefined);
let stored;const editor=createHangarEditor(source);editor.gold-=20;const result=saveBossReceipts({setItem(k,v){stored=JSON.parse(v)}},'save',editor,[receipt],p=>serializeHangarEditor(p,source));assert.equal(stored.gold,250100);assert.equal(stored.maxHp,500);assert.equal(stored.x,40000);assert.deepEqual(stored.pvpBossReceipts,['round:a']);assert.equal(applyBossReceipts(stored,[receipt]).added,0);assert.equal(result.added,250000);
console.log('Boss receipts: atomic credit/ID save, reconnect deduplication, failed-write retry and canonical hangar progress passed.');
