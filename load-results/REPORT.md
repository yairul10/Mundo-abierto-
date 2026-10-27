# Resultados de carga — 26 de octubre de 2026

Código base: `36fc915bad9136b72175b4ed927ba8959b6c145e` (main). Pruebas terminadas el 26 de octubre en Chile, 27 de octubre UTC.

## Cloudflare: copia aislada, mundo de prueba

| Pilotos simultáneos | Duración activa | RTT p50 | RTT p95 | Intervalo snapshots p95 | Payload recibido agregado | Errores |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 20 s | 31 ms | 58 ms | 108 ms | 22.3 MB | 0 |
| 20 | 25 s | 69 ms | 208 ms | 134 ms | 150.8 MB | 0 |
| 30 | 25 s | 93 ms | 203 ms | 180 ms | 289.0 MB | 0 |
| 50 | 25 s | 8845 ms | 16290 ms | 918 ms | 464.1 MB | 0 |

10, 20 y 30 pilotos completaron estas pruebas cortas con combate efectivo y sin errores registrados. Con 50 el servidor mantuvo conexiones, pero el RTT p95 llegó a 16,3 segundos: no es una configuración jugable. No se amplió el límite publicado de 24 jugadores.

## Local: límite publicado de 24

| Mundo | Intentos | Conectados | Rechazados por cupo | RTT p95 | Errores |
|---|---:|---:|---:|---:|---:|
| normal | 10 | 10 | 0 | 45 ms | 0 |
| normal | 20 | 20 | 0 | 361 ms | 0 |
| normal | 30 | 24 | 6 | 808 ms | 0 |
| normal | 50 | 24 | 26 | 1108 ms | 0 |
| test | 10 | 10 | 0 | 39 ms | 0 |
| test | 20 | 20 | 0 | 77 ms | 0 |
| test | 30 | 24 | 6 | 198 ms | 0 |
| test | 50 | 24 | 26 | 123 ms | 0 |

Los intentos de 30 y 50 no simulan esa cantidad simultánea con configuración publicada: solo entran 24. Los excedentes reciben `world_full` correctamente.

## Local: capacidad ampliada solo en memoria

| Mundo | Pilotos | Duración | RTT p95 | Errores |
|---|---:|---:|---:|---:|
| normal | 30 | 20 s | 1801 ms | 0 |
| normal | 50 | 20 s | 11361 ms | 0 |
| test | 30 | 20 s | 1213 ms | 0 |
| test | 50 | 20 s | 13531 ms | 0 |

Repetición independiente de 50 pilotos durante 30 segundos: RTT p95 17.6 s y 50 cierres `1008` (límite de mensajes). El generador manda aproximadamente 13 mensajes/s por piloto, por debajo de 40/s; al acumularse y procesarse tarde pueden concentrarse en ventanas del servidor. Esa explicación es una hipótesis a perfilar, no una causa demostrada.

El registro de recursos de esa repetición incluye 40,90 s de CPU de procesos hijos en 30,77 s de reloj y un máximo individual de aproximadamente 311 MiB RSS. No corresponde a CPU ni memoria facturada por Cloudflare.

## Validación y límites

- Sintaxis del ejecutor validada con `node --check`.
- Cuatro suites existentes pasan: combate, reglas del mundo, habilidades y recibos de recompensas.
- Dos suites existentes fallan sin cambios en código de juego: `tests/cooperative-boss.test.mjs` espera preapuntado a tres pilotos y recibe una lista vacía; `tests/pvp-arena-enemies.test.mjs` espera recompensa 220 y recibe 2400. No se corrigieron dentro de esta tarea de medición.
- No se midió CPU facturada, escrituras SQL facturadas ni cuota diaria real. No extrapolar un coste mensual exacto de estos JSON.
- El Worker temporal se eliminó al terminar; el Worker y las salas de producción no se modificaron. La copia usó namespaces propios, clave temporal y vencimiento de 20 minutos.
- Las pruebas iniciales locales tuvieron cierto solapamiento. La repetición independiente confirma la degradación a 50; los números locales no son equivalentes a Cloudflare.

## Siguiente trabajo recomendado

Mantener por ahora el límite de 24. Perfilar colas de inputs, simulación y serialización antes de subirlo. Revisar el envío del estado completo a todos los pilotos, la selección por distancia de entidades y la persistencia del mundo normal, que se ejecuta por mensaje. Después repetir 10/20/30/50 y realizar una prueba prolongada y otra desde un teléfono real. Son recomendaciones derivadas del código y de estas mediciones; no cambios ya aplicados.

Método y comandos: [LOAD-TESTS.md](../server/pvp/LOAD-TESTS.md).
