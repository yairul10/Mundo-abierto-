import assert from 'node:assert/strict';import {applyAccountGrants} from '../js/account-grants.js';
const current={level:163,gold:4937221,xp:54144,loot:{nucleoNexo:7},ownedShips:{aurora:true},shipId:'aurora',quests:{progress:12}},raw=JSON.stringify(current),map=new Map([['mundoAbierto.player',raw]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
assert.equal(applyAccountGrants(storage,[]),false);assert.equal(map.get('mundoAbierto.player'),raw);
assert.equal(applyAccountGrants(storage,['obsidian']),true);assert.deepEqual(JSON.parse(map.get('mundoAbierto.player')),{...current,ownedShips:{aurora:true,obsidian:true}});assert.equal(map.get('cosmosLegacy.beforeAccountGrant.v1'),raw);
assert.equal(applyAccountGrants(storage,['obsidian']),false);assert.equal(map.get('cosmosLegacy.beforeAccountGrant.v1'),raw);
assert.equal(applyAccountGrants(storage,['arbitrary-ship']),false);
assert.equal(applyAccountGrants(storage,['obsidian'],'missing-save'),false);
console.log('Account grants: newest local progress preserved, backup verified, idempotent ownership, no debit and no forced equip');
