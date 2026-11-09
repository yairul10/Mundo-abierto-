# Primera etapa: snapshots incrementales

El cliente solicita `snapshotDelta: 1` al entrar. El servidor solo utiliza el protocolo con clientes de versión 4 o superior que lo soliciten. Los clientes anteriores siguen recibiendo snapshots completos y conservan la compatibilidad visual de la nave admin. Un cliente nuevo también admite un servidor anterior.

La primera actualización de cada conexión es un `world` completo. Después, `worldDelta` incluye únicamente campos cambiados de jugadores y enemigos, altas, bajas y orden de entidades; el resto del mundo solo se incluye cuando cambia. El cliente reconstruye el mismo `world` que recibían los controles, minimapa, combate, grupos y efectos. No cambia la simulación, el límite de 24 jugadores ni la frecuencia máxima de 10 snapshots por segundo.

La comparación utiliza una copia JSON independiente para que las mutaciones del siguiente tick no alteren la referencia anterior. El delta se calcula una sola vez por broadcast y se comparte entre sockets compatibles; no se almacena un mundo por jugador. Si el delta es mayor que el snapshot completo se envía el completo. Un socket nuevo, una reconstrucción del objeto o un fallo de envío obliga a enviar otra base completa. Los mensajes WebSocket mantienen su orden; la base no depende de confirmaciones de inputs. La capacidad negociada se conserva en el attachment del socket.

## Validación

- Prueba sintética de 24 jugadores, 100 ticks con movimiento y daño: 689.731 bytes completos frente a 179.260 bytes con deltas (74 % menos). Mide JSON de estado, sin cabeceras WebSocket, mensajes de disparos ni chat; no predice capacidad, latencia ni ahorro de factura.
- Reconstrucción exacta de cambios de perfil, movimiento, daño, muertes, altas, bajas, campos eliminados, eventos y grupos.
- WebSockets reales en Miniflare: clientes completos e incrementales reciben el mismo mundo en normal y pruebas; movimiento, salida, reconexión y reconstrucción desde SQLite.
- `npm run test:network` ejecuta las pruebas específicas. Los fixtures cargan el grafo real de imports del Worker, incluidos módulos compartidos con el navegador.

En este entorno, la instalación de la dependencia Miniflare fijada por el proyecto falla por un paquete no disponible. Se validó el runtime con Miniflare 4.20260730.0 y `COSMOS_COMPAT_DATE=2026-07-01`, mediante las variables de override que ya utilizan los fixtures. No se cambia la dependencia ni la fecha de compatibilidad del despliegue.

## Publicación y siguiente etapa

Hay que publicar el Worker junto con `snapshot-delta.mjs` y entregar el nuevo cliente con `world-snapshot.js`. Ambos extremos conservan el fallback completo durante la actualización. Este cambio de código por sí solo no publica una nueva APK ni despliega Cloudflare.

El filtrado por cercanía queda para una etapa posterior: debe conservar minimapa, grupos, selección de objetivos y ataques de largo alcance. Antes de aumentar la capacidad hay que repetir las pruebas de carga y medir CPU, latencia y tráfico con el protocolo nuevo.
