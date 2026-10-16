import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
const manifestPath='android/app/src/main/AndroidManifest.xml';
let manifest=readFileSync(manifestPath,'utf8');
manifest=manifest.replace('<activity','<activity android:screenOrientation="sensorLandscape"');
writeFileSync(manifestPath,manifest);
const javaPath='android/app/src/main/java/io/github/yairul10/mundoabierto/offline/MainActivity.java';
writeFileSync(javaPath,`package io.github.yairul10.mundoabierto.offline;
import android.os.Bundle;
import android.view.WindowManager;
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
    @Override public void onCreate(Bundle state) { super.onCreate(state); getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); immersive(); }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
}
`);
console.log('Android preparado en horizontal y pantalla completa');

const gradlePath='android/app/build.gradle';
const code=Number(process.env.GITHUB_RUN_NUMBER)||2;
let gradle=readFileSync(gradlePath,'utf8').replace(/versionCode\s+1/,'versionCode '+code).replace(/versionName\s+"1.0"/,'versionName "0.2.0"');
writeFileSync(gradlePath,gradle);

if(process.env.MUNDO_KEYSTORE){
 let signed=readFileSync(gradlePath,'utf8');
 signed=signed.replace('android {',`android {
    signingConfigs {
        permanent {
            storeFile file(System.getenv("MUNDO_KEYSTORE"))
            storePassword System.getenv("MUNDO_KEY_PASSWORD")
            keyAlias System.getenv("MUNDO_KEY_ALIAS")
            keyPassword System.getenv("MUNDO_KEY_PASSWORD")
        }
    }
`);
 signed=signed.replace(/buildTypes\s*\{/, 'buildTypes {\n        debug { signingConfig signingConfigs.permanent }');
 writeFileSync(gradlePath,signed);
}else if(process.env.CI){
 throw new Error('No se permite compilar en CI sin firma permanente');
}


// Icono de Cosmos Legacy: recursos persistentes copiados tras generar Android.
// Los archivos se suben a mobile/test-app/icons/mipmap-*/ic_launcher.png.
const iconBase='icons';
const androidRes='android/app/src/main/res';
const densities=['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'];
const iconsPresent=densities.filter(d=>existsSync(`${iconBase}/mipmap-${d}/ic_launcher.png`));
if(iconsPresent.length===densities.length){
 for(const density of densities){
  const from=`${iconBase}/mipmap-${density}/ic_launcher.png`;
  const to=`${androidRes}/mipmap-${density}`;
  mkdirSync(to,{recursive:true});
  copyFileSync(from,`${to}/ic_launcher.png`);
  copyFileSync(from,`${to}/ic_launcher_round.png`);
  // Android adaptive icons usan ic_launcher_foreground; sustituirlo también.
  copyFileSync(from,`${to}/ic_launcher_foreground.png`);
 }
 // Recursos adaptativos: la imagen original va en drawable-nodpi, sin referencia circular.
 const drawable=`${androidRes}/drawable-nodpi`;
 mkdirSync(drawable,{recursive:true});
 copyFileSync(`${iconBase}/mipmap-xxxhdpi/ic_launcher.png`,`${drawable}/cosmos_launcher_foreground.png`);
 const to=`${androidRes}/mipmap-anydpi-v26`;
 mkdirSync(to,{recursive:true});
 const xml=`<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/black" />
    <foreground android:drawable="@drawable/cosmos_launcher_foreground" />
</adaptive-icon>
`;
 writeFileSync(`${to}/ic_launcher.xml`,xml);
 writeFileSync(`${to}/ic_launcher_round.xml`,xml);
 console.log('Icono Cosmos Legacy aplicado a Android en todas las densidades');
}else if(iconsPresent.length){
 throw new Error(`Iconos incompletos: ${iconsPresent.length}/5. Faltan recursos en mobile/test-app/icons`);
}else{
 console.log('Icono personalizado pendiente: usando icono predeterminado de Capacitor');
}
