import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('practice window and focus changes send one pause transition and never pause human matches',()=>{
 const source=readFileSync(new URL('../js/shared-session.js',import.meta.url),'utf8'),body=source.match(/ function syncPracticePause\(force\)\{[^\n]+\}/)[0];
 const sent=[],state={match:{practice:true}},ws={readyState:1};let blocked=false;
 const sync=new Function('ARENA_MODE','state','ws','WebSocket','bridge','send','let lastPracticePause=null;'+body+';return syncPracticePause')(true,state,ws,{OPEN:1},{practiceBlocked:()=>blocked},m=>sent.push(m));
 sync();sync();assert.deepEqual(sent,[{type:'practicePause',paused:false}]);blocked=true;sync();sync();assert.equal(sent.length,2);assert.equal(sent[1].paused,true);
 blocked=false;sync();assert.equal(sent.at(-1).paused,false);sync(true);assert.equal(sent.at(-1).paused,true);
 const count=sent.length;state.match.practice=false;blocked=true;sync();assert.equal(sent.length,count);
});
