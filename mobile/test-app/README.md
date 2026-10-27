# Mundo Abierto Offline
APK de prueba para Android 7 o superior, con los cuatro mapas, modelos, imágenes y Three.js 0.180.0 incluidos. La partida individual no necesita red ni una primera carga conectada. El PvP de prueba requiere internet.
El juego usa el contenido local de Capacitor, sin URL remota. Una política de contenido permite recursos locales y el host HTTPS/WSS del servidor PvP; el motor, imágenes y modelos están incluidos.

## Descargar
GitHub > Actions > Android APK offline > artefacto Mundo-Abierto-Offline-APK. Descomprimir e instalar app-debug.apk.
La app tiene un identificador distinto de la antigua versión online. Su partida es propia y no se transfiere automáticamente desde Chrome o la app online.
Para recibir cambios hay que instalar un APK nuevo. El workflow usa la firma permanente guardada en el secreto ANDROID_SIGNING_BUNDLE; no genera una clave temporal. Las actualizaciones requieren conservar firma e identificador de aplicación.

## Compilar
Node 22+, Java 21, SDK Android 36:
```sh
npm ci
npm run android:prepare
cd android
bash gradlew assembleDebug
```
El paquete web se crea desde los archivos vigentes del repositorio. El empaquetador comprueba que no falten recursos y que los GLB no dependan de archivos externos.
El workflow se ejecuta al cambiar el juego (js, css, assets, index.html, version.json), el empaquetado, las pruebas o su propio YAML. Ejecuta las pruebas de lógica antes de compilar y también se puede iniciar manualmente.

Desde la raíz, antes de compilar:
```sh
node --test tests/*.test.mjs server/pvp/combat.test.mjs
```

La versión de contenido procede de version.json. Android conserva versionName 0.2.0 y usa GITHUB_RUN_NUMBER como versionCode en CI; son identificadores distintos.

## Prueba en dispositivo
Instalar, activar modo avión antes de abrir, comprobar entrada, los cuatro mapas, portal, bases, enemigos, Coloso y sus puertas, Catapulta/Arponero, luna, combate y guardado al cerrar y abrir. Compilar e inspeccionar el paquete no sustituye esta prueba gráfica.

