import {readFileSync,writeFileSync} from 'node:fs';
const manifestPath='android/app/src/main/AndroidManifest.xml';
let manifest=readFileSync(manifestPath,'utf8');
manifest=manifest.replace('<activity','<activity android:screenOrientation="sensorLandscape"');
writeFileSync(manifestPath,manifest);
const javaPath='android/app/src/main/java/io/github/yairul10/mundoabierto/offline/MainActivity.java';
writeFileSync(javaPath,`package io.github.yairul10.mundoabierto.offline;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
    @Override public void onCreate(Bundle state) { super.onCreate(state); immersive(); }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
}
`);
console.log('Android preparado en horizontal y pantalla completa');

const gradlePath='android/app/build.gradle';
const code=Number(process.env.GITHUB_RUN_NUMBER)||2;
let gradle=readFileSync(gradlePath,'utf8').replace(/versionCode\s+1/,'versionCode '+code).replace(/versionName\s+"1.0"/,'versionName "0.2.0"');
writeFileSync(gradlePath,gradle);
