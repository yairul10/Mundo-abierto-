import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {configurePcManifest} from '../mobile/test-app/pc-manifest.mjs';
test('PC raw-mouse feature and optional touch hardware do not exclude mobile devices',()=>{
 const source='<manifest><uses-feature android:name="android.hardware.touchscreen" android:required="true"/><application/></manifest>',actual=configurePcManifest(source);
 for(const feature of ['android.hardware.type.pc','android.hardware.touchscreen','android.hardware.touchscreen.multitouch','android.hardware.faketouch'])assert.ok(actual.includes('android:name="'+feature+'" android:required="false"'));
 const again=configurePcManifest(actual);assert.equal((again.match(/android:name="android.hardware.type.pc"/g)||[]).length,1);assert.ok(!again.includes('required="true"'));
});
test('Android preparation generates runtime PC detection and lifecycle hooks without changing the release number',()=>{
 const root=mkdtempSync(join(tmpdir(),'cosmos-pc-')),base=join(root,'android/app');
 try{
 mkdirSync(join(base,'src/main/res/values'),{recursive:true});writeFileSync(join(base,'src/main/AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"/></application></manifest>');writeFileSync(join(base,'src/main/res/values/strings.xml'),'<resources/>'.replace('/>','></resources>'));writeFileSync(join(base,'build.gradle'),'android { defaultConfig { versionCode 1\nversionName "1.0" } }');
 const env={...process.env};delete env.CI;delete env.MUNDO_KEYSTORE;
 execFileSync(process.execPath,[fileURLToPath(new URL('../mobile/test-app/prepare-android.mjs',import.meta.url))],{cwd:root,env,stdio:'pipe'});
 const java=readFileSync(join(base,'src/main/java/com/cosmoslegacy/game/PlayGamesPlugin.java'),'utf8');assert.ok(java.includes('com.google.android.play.feature.HPE_EXPERIENCE'));assert.ok(java.includes('public void platform(PluginCall call)'));
 const activity=readFileSync(join(base,'src/main/java/com/cosmoslegacy/game/MainActivity.java'),'utf8');assert.ok(activity.includes('cosmos:app-paused'));assert.ok(activity.includes('super.onPause()'));assert.ok(readFileSync(join(base,'build.gradle'),'utf8').includes('versionName "1.1.48"'));
 }finally{rmSync(root,{recursive:true,force:true})}
});
