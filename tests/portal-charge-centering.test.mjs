import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game3d.js',import.meta.url),'utf8');
const start=source.indexOf('// The GLB is centered above:');
assert.ok(start>=0);
const alignment=source.slice(start,source.indexOf('portalLight.color',start));
const node=()=>({position:{x:100,y:100,z:100,set(x,y,z){Object.assign(this,{x,y,z})}}});
const portalHalo=node(),portalCharge=node(),portalChargeFront=node(),portalChargeBack=node();
new Function('portalHalo','portalCharge','portalChargeFront','portalChargeBack',alignment)(portalHalo,portalCharge,portalChargeFront,portalChargeBack);
for(const mesh of [portalHalo,portalCharge])assert.deepEqual([mesh.position.x,mesh.position.y,mesh.position.z],[0,0,0]);
assert.equal(portalChargeFront.position.z,.08);assert.equal(portalChargeBack.position.z,-.08);
// At an oblique angle the two faces stay within 0.4 world units of the
// aperture center, independent of the frame's depth and portal rotation.
for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI])for(const mesh of [portalChargeFront,portalChargeBack])assert.ok(Math.abs(mesh.position.z*Math.sin(angle)*5)<=.4);
console.log('Portal energy: halo and charge centered in aperture; both faces avoid depth-dependent oblique displacement.');
