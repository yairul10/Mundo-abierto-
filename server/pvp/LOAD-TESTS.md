# Pruebas de carga de Cosmos Legacy

El ejecutor `load-test.mjs` crea pilotos sintéticos que usan el protocolo real de entrada y WebSocket. Se desplazan alrededor de los jefes, disparan dos láseres y ocho drones por ráfaga, lanzan seis misiles y envían ping cada segundo. No renderiza modelos 3D ni mide FPS de teléfonos.

## Ejecución local

Desde `server/pvp`, instalar las dependencias del proyecto y ejecutar:

```bash
node load-test.mjs --players=10,20,30,50 --seconds=25 --output=results.json
node load-test.mjs --players=30,50 --capacity=50 --seconds=25 --output=expanded.json
```

Cada escenario local crea un runtime y una base SQLite nuevos. El primero conserva el límite real de 24 jugadores; el segundo cambia a 50 únicamente el módulo cargado en el simulador. No modifica `world-rules.mjs` ni la capacidad publicada. Se prueban los mundos `normal` y `test`, que tienen distintas estrategias de persistencia y distintos enemigos.

En esta sesión `npm ci` falló descargando `youch-core@0.3.4` de la dependencia Miniflare alpha. Se instaló Miniflare 4.20260730.0 en un directorio temporal y se seleccionó con `MINIFLARE_MODULE=/ruta/node_modules/miniflare/dist/src/index.js`. El simulador usa fecha de compatibilidad 2026-07-01. Las pruebas remotas usan la fecha real 2026-10-11. No son runtimes idénticos.

## Cloudflare aislado

El ejecutor rechaza el dominio de producción y exige un Worker dedicado cuyo nombre empiece por `cosmos-loadtest-`, además de `--isolated=yes`. Esto es una barrera adicional: comprobar también que todos sus namespaces son nuevos y no referencian producción.

```bash
LOAD_TEST_KEY='clave-temporal' node load-test.mjs --url=https://cosmos-loadtest-NOMBRE.SUBDOMINIO.workers.dev --isolated=yes --realm=test --capacity=50 --players=10,20,30,50 --seconds=25 --output=cloud.json
```

La copia temporal usada el 26 de octubre de 2026 contiene los ocho módulos de `server/pvp` del commit indicado en el informe. Solo se ajustó la capacidad a 50, la protección de acceso mediante clave y vencimiento, el límite HTTP de admisión, y el sufijo de sala `loadRun` para separar escenarios. Sus Durable Objects se crearon en namespaces propios. La versión final del ejecutor añade ese identificador a la entrada y al socket; no hay cambios en los endpoints publicados del juego. Los escenarios iniciales de 10 y 20 se ejecutaron antes de añadir ese sufijo y sin pilotos simultáneos de otras pruebas.

La copia remota exige la clave en `X-Load-Key` para entrar y `loadKey` en el socket, y cierra nuevas solicitudes tras 20 minutos. No compartir ni guardar la clave en Git. Cada escenario dura entre 10 y 120 segundos y admite como máximo 50 bots. Se detiene la progresión remota si el escenario anterior registra errores o RTT p95 superior a 1500 ms. Al terminar se envía `leave`, se cierran los sockets y se debe eliminar el Worker temporal con sus namespaces. Las claves de invitado son aleatorias y solo existen en memoria del ejecutor.

## Interpretación

- RTT p50/p95 mide ida y vuelta del ping de aplicación desde el generador, incluida la cola del servidor. No equivale al ping desde Chile ni a la latencia entre dos jugadores.
- El intervalo p95 entre snapshots ayuda a detectar pausas, pero un flujo de snapshots regular no garantiza que los inputs se procesen a tiempo.
- Los bytes son payload JSON agregado de todos los bots y cubren admisión, ejecución y cierre. Excluyen TLS, cabeceras y overhead WebSocket. No son el consumo facturable de Cloudflare.
- CPU y RSS de cada fila corresponden al generador Node, excluyendo workerd. La repetición local de 50 incluye además un registro separado mediante `RUSAGE_CHILDREN`; su RSS es el máximo individual, no la suma de los procesos.
- `connected` cuenta conexiones abiertas durante admisión; `maxPlayers` confirma cuántas se observaron a la vez. Las desconexiones durante la ejecución aparecen como errores.
- Las observaciones de enemigos dañados confirman actividad de combate; no son número de impactos ni de jefes derrotados. Los bots tienen mucho casco para sostener la carga y equipamiento fuerte de nivel 105.
- Son pruebas cortas desde un generador. No certifican estabilidad durante horas, red móvil, escalabilidad regional, restauración tras reinicios, coste diario, CPU facturada ni rendimiento gráfico del cliente.

Los JSON y el informe están en `load-results/`. Algunos escenarios locales exploratorios se solaparon; la repetición `isolated-local-50.json` se ejecutó sin otro generador local para confirmar el problema. No comparar sus latencias como si fueran un benchmark de hardware idéntico a Cloudflare.
