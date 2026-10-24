# Inicio y cuenta (Android 1.1.4)

La versión Android se mantiene en `1.1.4` (`versionCode: 325`) durante estas correcciones previas a la subida a Google Play. Las compilaciones no incrementan automáticamente el código de versión; solo se cambia cuando el propietario lo solicita. El identificador de contenido web de `version.json` es independiente y sirve para actualizar la caché.

La pantalla inicial vuelve a utilizar `assets/loading-cosmos-legacy.webp` a pantalla completa (`cover`), sin bandas ni relleno borroso. La conversión WebP conserva el mismo arte y reduce el tamaño de descarga. Primero se consulta la configuración y, si hay servidor de pruebas habilitado, se elige el servidor. El fondo se descarga en paralelo y solo se muestra después de decodificarse completo; después aparecen las opciones de cuenta para la partida normal. Si el fondo falla o tarda más de 8 segundos, se permite continuar con color sólido sin bloquear la entrada. Al confirmar la entrada desaparecen y se muestra una barra con los recursos preparados hasta cargar la nave y el sector inicial. Los demás sectores conservan su carga diferida.

La primera entrada a la partida normal permite elegir invitado o Google Play. Invitado muestra una advertencia y conserva el guardado local existente; no inicia sincronización de partidas. La elección se recuerda en `cosmosLegacy.accountChoice.v1`. Desde el menú de nave, **Cuenta y guardado en la nube** permite volver a elegir.

Google Play requiere la aplicación Android y autorización del servidor. Se consulta la nube antes de inicializar el mundo. Si hay diferencias, el jugador elige la nube o el dispositivo; ninguna diferencia se resuelve mediante sobrescritura automática. Al recuperar la nube se valida su contenido y, antes de reemplazar el guardado local, se conserva una copia exacta verificada en `cosmosLegacy.beforeCloudRestore.v1`. Se recuperan los campos permanentes del cliente de nube, con aparición segura en Aurora; no se restauran posiciones, jefes ni el diario local de otro guardado.

La sincronización comienza después de cargar el mundo, cada 15 segundos. La sesión de servidor permanece en memoria. Los conflictos de revisión y las sesiones caducadas pausan las subidas y muestran un aviso en el menú; los errores de red conservan la partida local. Si la conexión inicial falla, se ofrece reintentar o entrar como invitado. PvP y QA no ejecutan este flujo ni escriben partidas nube.

El combate y el piloto se detienen mientras existe la pantalla inicial. A los 30 segundos de carga lenta se permite seguir esperando, reintentar o entrar voluntariamente mientras terminan los recursos; no se retira automáticamente el fondo por tiempo transcurrido.

## Verificación

- `node --test tests/*.test.mjs server/pvp/*.test.mjs`
- `cd mobile/test-app && npm ci && npm run web:offline`
- En Android: primera elección, cancelar advertencia, invitado sin internet, Google con/sin copia, comparar partidas, recuperar recursos y naves, reiniciar, cambiar a invitado y volver a Google. Comprobar también la entrada/salida de PvP y QA.
- La prueba del cliente cubre conflicto sin subidas, elección explícita, revisión, respaldo, restauración, copia inválida y falta de almacenamiento.

Si ambos modelos de la nave inicial fallan, su apariencia procedural se considera lista para permitir la entrada. Durante la espera no se renderiza continuamente una escena oculta, para dejar tiempo al procesamiento de modelos.
