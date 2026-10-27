# Revisión de normal y pruebas — 27 de octubre de 2026

## Corregido

| Comportamiento | Antes | Ahora |
|---|---|---|
| Actualización del mundo normal | Dependía de mensajes y alarmas | Ciclo de 100 ms, igual que pruebas |
| Guardado de normal | Serializaba/escribía todo el mundo con cada mensaje | Caché y checkpoint cada 5 s, igual que pruebas |
| Publicación de snapshots en Cloudflare | El límite de 10 Hz solo se aplicaba a pruebas; main ya lo había corregido | Se aplica a ambos modos también en el servidor publicado |
| Último piloto sale | Pruebas detenía el ciclo en un tick posterior | Ambos fuerzan guardado y detienen el ciclo al salir |
| Recuperación del objeto | Podía recuperar pilotos marcados como conectados sin un socket vivo | Reconcilia el estado con sockets realmente abiertos |
| Fallo de transacción de recompensas | Se vaciaba el array antes de terminar la transacción | Se vacía después de confirmar, permitiendo reintentar |

La simulación activa impide hibernar al Durable Object. Se detiene cuando no quedan pilotos; no se promete hibernación durante combate ni un coste concreto. Un reinicio abrupto puede perder hasta unos cinco segundos de estado transitorio. Las recompensas se confirman junto al estado correspondiente en una transacción inmediata, y cambios de equipo, entrada y salida fuerzan guardado.

## Diferencias intencionales conservadas

- Identidades/salas, progreso, recompensas pendientes e inventarios independientes.
- Herramientas QA y posibilidad de cerrar solo pruebas con `TEST_SERVER_ENABLED`.
- Normal con su jefe cooperativo; pruebas con dos Titanes del Nexo, dos Colosos Pro y refuerzos en evaluación.
- Límite publicado de 24 jugadores y mismas reglas de protección, habilidades y equipo.

## Diferencias entre main y el código publicado

Se descargaron y compararon los ocho módulos publicados. Había diferencias anteriores a esta tarea en `cooperative-boss.mjs`, `arena-enemies.mjs` y `shared-world.mjs`: main incluye cambios de regeneración, participación del primer atacante y XP de refuerzos que el Worker publicado todavía no tenía.

Para esta corrección, el despliegue conserva exactamente los otros siete módulos publicados y su esquema de recibos. Solo aplica la corrección técnica a `shared-world.mjs`, sin publicar de paso nuevos valores o reglas de jefes/recompensas. En main se aplica la misma lógica técnica sobre su esquema actual, que ya incluye XP. Estas diferencias de contenido entre main y Cloudflare quedan pendientes de una publicación de contenido específica.

Despliegue de la corrección: `74dd703f6b5440a989c3827a76d725a9` en `mundo-abierto-pvp`. Se conservaron todos los bindings, namespaces, salas, interruptor de pruebas y configuración de observabilidad. Cloudflare confirmó cero namespaces creados, borrados, renombrados o transferidos.

## Validación

- Diez comprobaciones pasan: seis casos de caché, checkpoint, reintento tras fallo y recuperación, más combate, reglas del mundo, habilidades y recibos del cliente.
- Integración WebSocket/SQLite en ambos modos: snapshots y patrulla sin mensajes del cliente, daño real, salida antes del checkpoint, reinicio del runtime y reconexión con vida/instancia del jefe conservadas.
- Integración de arena: dos pilotos, refuerzos acotados, créditos/materiales y reenvío privado del mismo recibo tras reinicio.
- Las dos integraciones también pasan sobre una copia del código exacto publicado con el parche, conservando sus módulos anteriores de jefes y recompensas.
- Carga local con 20 pilotos, 25 s por modo: sin errores. RTT p95 160 ms en normal y 108 ms en pruebas; no es medición desde Chile ni garantía de rendimiento prolongado. Datos en `parity-load-results.json`.
- Miniflare utilizado: 4.20260730.0 y compatibilidad 2026-07-01 por fallo de descarga de la dependencia alpha del repositorio. Cloudflare conserva fecha 2026-10-11.
- Dos pruebas antiguas de contenido siguen fallando sin modificaciones: `tests/cooperative-boss.test.mjs` y `tests/pvp-arena-enemies.test.mjs`. No se presentan como aprobadas ni se alteran sus expectativas en esta corrección.

No se repitieron las cargas remotas de 30/50 pilotos ni se incrementó la capacidad del mapa.
