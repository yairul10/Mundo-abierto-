# App Android de pruebas
APK de depuración para Android 7 o superior. Abre la versión de GitHub Pages con internet, en horizontal y pantalla completa.
El guardado es propio de la app; no importa automáticamente la partida de Chrome. Las mejoras web llegan sin reinstalar el APK.
Esta configuración con URL remota es para pruebas, no para publicar en Google Play.

## Descargar
En GitHub > Actions > Android APK de prueba, abrir la ejecución correcta y descargar el artefacto Mundo-Abierto-pruebas-APK. Descomprimir e instalar app-debug.apk.
El workflow se inicia cuando cambia esta carpeta; también se puede ejecutar manualmente con Run workflow.

## Compilar
Node 22+, Java 21 y Android SDK 36:
```sh
npm install
npm run android:prepare
cd android
bash gradlew assembleDebug
```
La carpeta android se genera a partir de Capacitor 8.0.0. No se incluye una firma de producción. Los APK de distintas ejecuciones usan claves debug distintas; no borrar la app con una partida importante para reinstalar. Mantener este primer APK mientras se actualiza el juego web.
