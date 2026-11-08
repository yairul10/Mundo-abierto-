import assert from 'node:assert/strict';
import {loadingTipsForLevel,mountLoadingTips} from '../js/loading-tips.js';

const beginner=loadingTipsForLevel(1);
assert(beginner.length>=5);
assert(!beginner.some(text=>text.includes('PvP')));
assert(loadingTipsForLevel(40).some(text=>text.includes('PvP')));
assert.deepEqual(loadingTipsForLevel('damaged'),beginner);

const originalInterval=globalThis.setInterval;
const originalClear=globalThis.clearInterval;
const originalDocument=globalThis.document;
try{
 let rotate,cleared=false;
 globalThis.document={hidden:false};
 globalThis.setInterval=(callback,delay)=>{rotate=callback;assert.equal(delay,7000);return 42};
 globalThis.clearInterval=timer=>{assert.equal(timer,42);cleared=true};
 const element={hidden:true,textContent:''};
 const stop=mountLoadingTips(element);
 assert.equal(element.hidden,false);
 const first=element.textContent;
 document.hidden=true;
 rotate();
 assert.equal(element.textContent,first,'background time does not skip a tip');
 document.hidden=false;
 rotate();
 assert.notEqual(element.textContent,first);
 const shown=new Set([first,element.textContent]);
 for(let i=2;i<beginner.length;i++){rotate();shown.add(element.textContent)}
 assert.equal(shown.size,beginner.length,'tips do not repeat before completing the cycle');
 rotate();
 assert.equal(element.textContent,first);
 stop();
 assert(cleared,'the loading timer is stopped when the world opens or loading fails');
 assert.equal(element.hidden,true);
}finally{
 globalThis.setInterval=originalInterval;
 globalThis.clearInterval=originalClear;
 if(originalDocument===undefined)delete globalThis.document;
 else globalThis.document=originalDocument;
}
console.log('Loading tips: progression, rotation, background pause and cleanup passed.');
