# Mundo Abierto Offline
APK de prueba para Android 7 o superior, con los tres mapas, modelos, imágenes y Three.js 0.180.0 incluidos. No necesita red ni una primera carga conectada.
El juego usa el contenido local de Capacitor, sin URL remota. Una política de contenido bloquea solicitudes externas en la pantalla del juego.

## Descargar
GitHub > Actions > Android APK offline > artefacto Mundo-Abierto-Offline-APK. Descomprimir e instalar app-debug.apk.
La app tiene un identificador distinto de la antigua versión online. Su partida es propia y no se transfiere automáticamente desde Chrome o la app online.
Para recibir cambios hay que instalar un APK nuevo. El workflow conserva la clave de prueba en caché para permitir actualizar sin borrar datos mientras esa caché siga disponible.

## Compilar
Node 22+, Java 21, SDK Android 36:
```sh
npm ci
npm run android:prepare
cd android
bash gradlew assembleDebug
```
El paquete web se crea desde los archivos vigentes del repositorio. El empaquetador comprueba que no falten recursos y que los GLB no dependan de archivos externos.
El workflow se ejecuta con cambios en mobile/test-app o su propio YAML y se puede ejecutar manualmente para incorporar actualizaciones del juego.

## Prueba en dispositivo
Instalar, activar modo avión antes de abrir, comprobar entrada, los tres mapas, portal, bases, enemigos, Coloso, luna, combate y guardado al cerrar y abrir. Compilar e inspeccionar el paquete no sustituye esta prueba gráfica.
