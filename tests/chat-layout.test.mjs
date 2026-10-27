import assert from 'node:assert/strict';
import {chatLayout} from '../js/chat-layout.js';
for(const viewport of [{width:800,height:360},{width:360,height:800},{width:320,height:180}]){
 for(const input of [{},{x:-100,y:99999,width:4000,height:99999,font:60},{x:NaN,y:Infinity,width:-50,height:NaN,font:0}]){
  const p=chatLayout(input,viewport);
  assert.ok(p.x>=8&&p.y>=8);assert.ok(p.x+p.width<=viewport.width-8);assert.ok(p.y+p.height<=viewport.height-8);
  assert.ok(p.font>=11&&p.font<=20);assert.deepEqual(chatLayout(p,viewport),p);
 }
}
const user={x:100,y:80,width:320,height:200,font:16};assert.deepEqual(chatLayout(user,{width:900,height:400}),user);
console.log('Chat layout: saved preferences, rotation and invalid values stay inside the viewport.');
