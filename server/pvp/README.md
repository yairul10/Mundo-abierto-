# Mapa PvP compartido · Mundo Abierto

Contenido v220, Worker 0.3.0. Servidor: https://mundo-abierto-pvp.jairog940.workers.dev. Independiente de Gallina Cósmica.

## Acceso y reglas

En el Cementerio hay un segundo portal en (40400, 200, -2050), además del regreso a Ascuas. A 100 m se activa en tres segundos. Guarda la partida offline a 350 m del portal antes de entrar en `index.html?pvp=1`. El portal de regreso está en (0, 120, 850) del mapa compartido y también carga tres segundos. El botón de salida permite volver aunque falle la conexión.

Todos entran al mismo objeto `ROOMS.getByName('shared-cemetery-v1')`. Capacidad inicial: 24 conexiones/reservas; si está lleno se informa, sin crear mapas separados silenciosamente. Radio del mapa: 4500 m. Base en el origen, zona segura esférica de 650 m, aparición en (0, 120, 0).

Sin cuentas ni Google. El cliente genera una clave aleatoria privada de 256 bits y la guarda en localStorage. El servidor deriva un ID público estable de 96 bits mediante SHA-256 y emite un ticket temporal diferente para cada conexión. El apodo es editable y el sufijo del ID distingue nombres iguales. El secreto no aparece en snapshots ni URLs. Borrar datos o desinstalar genera otro invitado; web y APK tienen almacenes separados. El servidor no mantiene una cuenta recuperable.

Selecciona un piloto desde «Pilotos / nave» o toca su nave. Fuera de la base y a menos de 1200 m se puede pedir duelo; expira en 20 segundos, puede rechazarse y no afecta a espectadores. Al aceptar: vida/energía completas, cuenta de tres segundos y pelea en el mismo sitio. Máximo tres minutos. Solo los dos participantes pueden dañarse. Un piloto no puede participar en dos duelos; varios pares sí pueden combatir a la vez. Entrar a la base cancela el duelo. Desconectarse o rendirse lo termina. El vencido por destrucción reaparece en la base, el ganador permanece donde está; ambos se restauran y quedan protegidos.

## Equipamiento de prueba

Las seis naves se pueden escoger en la base. Perfiles fijos de nivel 40 calculados por el servidor sobre casco 490, ataque 88, defensa 44 y velocidad 220; conservan los multiplicadores de cada nave. Energía 295, dos drones y tres misiles por salva, sin robot, explorador, formaciones ni especializaciones. Las habilidades conservan sus efectos de clase. No se importan estadísticas editables del guardado. Sin créditos, XP, botín, copas ni pérdidas. Nunca se escriben naves, mejoras, vida ni resultados PvP en la partida individual.

## Implementación

`js/shared-session.js`: invitado, conexión, UI, invitaciones, ping, entradas 20 Hz, reconciliación, regreso y reconexión. `game3d.js`: controles originales, múltiples naves remotas, nombres, selección, radar, base y portal. `css/shared-world.css`: interfaz táctil.

`shared-world.mjs`: Durable Object, SQLite, tickets, snapshots públicos, mensajes limitados, presencia y limpieza. `world-rules.mjs`: consentimiento, cuenta regresiva, perfiles fijos, duelos independientes, fin y reaparición. Reutiliza `combat.mjs` para proyectiles y habilidades, aislando los jugadores/balas por duelo. El servidor calcula movimiento, cadencias, daño, críticos, energía e impactos. Las posiciones, estadísticas y daño enviados por el cliente no se aceptan como autoridad.

WebSockets con hibernación; el estado se persiste tras cada mensaje. La simulación avanza por entradas y alarmas de mantenimiento, sin bucle permanente. El cliente se pausa si deja de recibir estados. Tras pérdida de conexión pide un ticket nuevo con el mismo invitado. Se cierra una presencia sin mensajes tras 15 segundos; las reservas sin conexión caducan tras 30 segundos. Una misma identidad no abre dos conexiones simultáneas.

Se conservan los exports/bindings ArenaRoom y ArenaLobby para mantener los namespaces existentes; no se borra almacenamiento anterior. El lobby, cola y salas del prototipo fueron retirados. Las rutas antiguas responden 410; `pvp.html` redirige al nuevo mapa. El APK empaqueta motor y recursos locales; HTTPS/WSS del host PvP está permitido por CSP. Internet es necesario para este mapa.

## API

- GET /health: versión y modos.
- POST /world/join: `{guestKey, name, shipId}` → `{playerId, token, expiresAt}`.
- GET /world/socket: WebSocket con subprotocolos `['mundo-world-v1', token]`.
- Mensajes cliente: input, invite, reply, ship, name, volley, ability, surrender, ping, leave.
- Mensajes servidor: world, volley, pong, error. Los snapshots nunca incluyen tickets ni claves privadas.

## Validación

Desde la raíz: `node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs`.

Desde esta carpeta: `npm ci && npm test`. Integración real con Miniflare: invitados, tres conexiones, identidad estable, rutas antiguas retiradas, perfiles del servidor, movimiento, consentimiento, cuenta regresiva, impactos, espectadores, cambio de nave en base y desconexión. La prueba web de desarrollo verifica dos clientes Three.js, selección de nave, vuelo, invitación, duelo, rendición y guardado offline intacto. Una prueba entre teléfonos reales sigue siendo necesaria para valorar latencia y controles de cada equipo.
