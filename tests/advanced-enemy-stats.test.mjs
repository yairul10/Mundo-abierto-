import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {advancedEnemyScale,scaledHealth}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../js/graveyard.js',import.meta.url))).toString('base64'));
assert.equal(3000*advancedEnemyScale(40,40),3000);
assert.equal(5000*advancedEnemyScale(40,40),5000);
assert.equal(3000*advancedEnemyScale(94,40),6240);
assert.equal(5000*advancedEnemyScale(94,40),10400);
assert.equal(40000*advancedEnemyScale(40,30),48000);
assert.equal(150*advancedEnemyScale(40,30),180);
assert.equal(scaledHealth(20000,40000,80000),24000);
assert.equal(scaledHealth(0,40000,80000),0);
console.log('Advanced enemy scaling and saved boss health migration passed.');

assert.equal(advancedEnemyScale(1000,40),2.5);
assert.equal(advancedEnemyScale(20,40),1);
