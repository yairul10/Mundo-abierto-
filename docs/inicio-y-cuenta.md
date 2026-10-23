# Inicio y cuenta (Android 1.1.4)

La pantalla inicial utiliza `assets/cosmos-start-background.webp`, una versión del arte recibido sin botones dibujados. Los dos botones son HTML accesible y desaparecen al confirmar la entrada; el fondo permanece hasta que se cargan la nave y los recursos iniciales del sector actual. Los demás sectores conservan su carga diferida.

La primera entrada a la partida normal permite elegir invitado o Google Play. Invitado muestra una advertencia y conserva el guardado local existente; no inicia sincronización de partidas. La elección se recuerda en `cosmosLegacy.accountChoice.v1`. Desde el menú de nave, **Cuenta y guardado en la nube** permite volver a elegir.

Google Play requiere la aplicación Android y autorización del servidor. Se consulta la nube antes de inicializar el mundo. Si hay diferencias, el jugador elige la nube o el dispositivo; ninguna diferencia se resuelve mediante sobrescritura automática. Al recuperar la nube se valida su contenido y, antes de reemplazar el guardado local, se conserva una copia exacta verificada en `cosmosLegacy.beforeCloudRestore.v1`. Se recuperan los campos permanentes del cliente de nube, con aparición segura en Aurora; no se restauran posiciones, jefes ni el diario local de otro guardado.

La sincronización comienza después de cargar el mundo, cada 15 segundos. La sesión de servidor permanece en memoria. Los conflictos de revisión y las sesiones caducadas pausan las subidas y muestran un aviso en el menú; los errores de red conservan la partida local. Si la conexión inicial falla, se ofrece reintentar o entrar como invitado. PvP y QA no ejecutan este flujo ni escriben partidas nube.

El combate y el piloto se detienen mientras existe la pantalla inicial. A los 60 segundos de carga lenta se permite seguir esperando o entrar voluntariamente mientras terminan los recursos; no se retira automáticamente el fondo por tiempo transcurrido.

## Verificación

- `node --test tests/*.test.mjs server/pvp/*.test.mjs`
- `cd mobile/test-app && npm ci && npm run web:offline`
- En Android: primera elección, cancelar advertencia, invitado sin internet, Google con/sin copia, comparar partidas, recuperar recursos y naves, reiniciar, cambiar a invitado y volver a Google. Comprobar también la entrada/salida de PvP y QA.
- La prueba del cliente cubre conflicto sin subidas, elección explícita, revisión, respaldo, restauración, copia inválida y falta de almacenamiento.
