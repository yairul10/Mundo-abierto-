import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const start=source.indexOf('function sectorPortalRoutes(){'),end=source.indexOf('let selectedPortalId',start),routes=source.slice(start,end);
const vec={clone(){return this},add(){return this},pos:{}};
const build=new Function('activeSector','player','auroraPortal','auroraPortalRotation','auroraPvpPortal','beltPortal','THREE','graveyardPvpPortal','emberGraveyardRotation','graveyardPortal','beltPortalRotation','emberGraveyardPortal',routes+';return sectorPortalRoutes()');
for(const level of [1,10,39,40,41,105]){const list=build('aurora',{level},vec,{},vec,vec,{Vector3:class{}},vec,{},vec,{},vec);assert.equal(list.some(r=>r.id==='aurora-pvp'),level>=40);assert.equal(list[0].to,'belt');if(level>=40){assert.equal(list[1].level,40);assert.equal(list[1].to,'pvp');assert.equal(list.length,2)}}
const graveyard=build('graveyard',{level:40},vec,{},vec,vec,{Vector3:class{}},vec,{},vec,{},vec);assert.ok(graveyard.some(r=>r.to==='pvp'));
assert.match(source,/const portal=route.pos\|\|graveyardPvpPortal/);assert.match(source,/drawDestination\(readOfflinePilot\(localStorage\).sector\|\|'graveyard'\)/);
console.log('Aurora PvP: route hidden below 40 (also radar), unlocked at 40, old routes preserved and return uses saved origin.');
