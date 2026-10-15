import assert from 'node:assert/strict';
import {useDisplayShell} from '../js/display-shell.js';
const web={location:{protocol:'https:'}};web.top=web;assert.equal(useDisplayShell(web),true);
const child={top:web,location:{protocol:'https:'}};assert.equal(useDisplayShell(child),false,'Embedded navigation cannot create nested frames');
web.MUNDO_OFFLINE=true;assert.equal(useDisplayShell(web),false,'APK keeps its native orientation handling');web.MUNDO_OFFLINE=false;web.location.protocol='file:';assert.equal(useDisplayShell(web),false);
console.log('Stable browser shell, no nested frames, native APK and local file compatibility passed.');
