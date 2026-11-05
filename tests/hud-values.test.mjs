import test from 'node:test';
import assert from 'node:assert/strict';
import {setHudText,setHudWidth} from '../js/hud-values.js';
test('Repeated HUD frames write only changed values, including external changes',()=>{
 let text='',width='',writes=0;
 const element={
  get textContent(){return text},set textContent(value){text=value;writes++},
  style:{get width(){return width},set width(value){width=value;writes++}}
 };
 setHudText(element,50);setHudWidth(element,50);
 for(let frame=0;frame<120;frame++){setHudText(element,50);setHudWidth(element,50)}
 assert.equal(writes,2);
 setHudText(element,49);setHudWidth(element,49);
 assert.equal(writes,4);
 text='external';width='0%';
 setHudText(element,49);setHudWidth(element,49);
 assert.equal(text,'49');assert.equal(width,'49%');
});
