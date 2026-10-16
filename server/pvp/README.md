# Mapa PvP compartido · Mundo Abierto

Contenido v223, Worker 0.3.6. Servidor: https://mundo-abierto-pvp.jairog940.workers.dev. Independiente de Gallina Cósmica.

## Acceso y reglas

En el Cementerio hay un segundo portal en (40400, 200, -2050), además del regreso a Ascuas. A 100 m se activa en tres segundos. Guarda la partida offline a 350 m del portal antes de entrar en `index.html?pvp=1`. El portal de regreso está en (0, 120, 850) del mapa compartido y también carga tres segundos. El botón de salida permite volver aunque falle la conexión.

Todos entran al mismo objeto `ROOMS.getByName('shared-cemetery-v1')`. Capacidad inicial: 24 conexiones/reservas; si está lleno se informa, sin crear mapas separados silenciosamente. Radio del mapa: 4500 m. Base en el origen, acceso a hangar/equipamiento a 650 m del centro (sin círculo visible), aparición en (0, 120, 0).

Sin cuentas ni Google. El cliente genera una clave aleatoria privada de 256 bits y la guarda en localStorage. El servidor deriva un ID público estable de 96 bits mediante SHA-256 y emite un ticket temporal diferente para cada conexión. El apodo es editable y el sufijo del ID distingue nombres iguales. El secreto no aparece en snapshots ni URLs. Borrar datos o desinstalar genera otro invitado; web y APK tienen almacenes separados. El servidor no mantiene una cuenta recuperable.

Toca la nave de otro jugador o su nombre, a cualquier lado de la pantalla; aparece una tarjeta pequeña con «Pedir duelo». No hay lista de selección de pilotos. En la base también se pueden pedir y aceptar duelos, a menos de 1200 m; la invitación expira en 20 segundos, puede rechazarse y no afecta a espectadores. Al aceptar: vida/energía completas, cuenta de tres segundos y pelea en el mismo sitio. Sin límite de tiempo: continúa hasta la destrucción de una nave, rendición o desconexión. Solo los dos participantes pueden dañarse, incluso dentro de la base; no pueden refugiarse en una zona segura durante el duelo. Un piloto no puede participar en dos duelos; varios pares sí pueden combatir a la vez. Desconectarse o rendirse lo termina. El vencido por destrucción reaparece en la base, el ganador permanece donde está; ambos se restauran y quedan protegidos.

## Equipamiento de prueba

El botón «Equipar» permite elegir apodo y nave en la base; el menú se cierra al recibir o aceptar una invitación. Solo aparecen las naves que posee el jugador en su partida offline. Al entrar se importa una copia del equipo: nivel, estadísticas, drones, formación y sus ventajas, explorador, robot reparador, misiles y especializaciones de cada nave. «Equipar» permite cambiar entre las naves propias mientras se está en la base y fuera de un duelo. El botón «Abrir hangar» abre el hangar completo en la base, fuera de un duelo: comprar, mejorar, vender, reparar, ensamblar y equipar. Usa los créditos y materiales reales del guardado offline; las operaciones se conservan en ambos modos. Mientras el hangar está abierto, el servidor detiene el movimiento y bloquea invitaciones. Al cerrarlo publica el equipo actualizado sin salir del mapa.

El casco máximo de cada nave es exactamente veinte veces su casco offline, incluida la bonificación de Fortaleza. Entra con ese casco y energía completos. Daño, defensa, velocidad y mejoras conservan sus valores y efectos; no se multiplican por veinte. Las reparaciones porcentuales se aplican al nuevo máximo. Los potenciadores que estaban activos al entrar se copian para la sesión y no consumen tiempo del guardado offline.

El servidor conserva el perfil original sin multiplicar en una plantilla por nave; equipar, aceptar duelos, reaparecer y reconectar reconstruyen desde esa plantilla. Nunca se aplica ×20 sobre un perfil PvP ya multiplicado. Las plantillas están limitadas por tipos, rangos y una flota de seis IDs reconocidos, pero proceden del guardado offline: esta prueba de invitados no autentica el progreso individual. Movimiento, energía, cadencia, impactos y daño se resuelven en el servidor; no se aceptan daño o posiciones arbitrarios en mensajes de combate. Sin premios, créditos, XP, botín ni pérdidas. Las operaciones del hangar sí se escriben en el guardado normal/QA correspondiente. Para ello se usa un editor separado con estadísticas offline, conservando la posición, sector y estado de jefes guardados. El casco ×20, la posición online y el daño de los duelos nunca se guardan como progreso offline. La selección rápida de nave fuera del hangar sigue limitada a la sesión PvP.

## Implementación

`js/pvp-hangar.js`: editor canónico del hangar y guardado sin multiplicación, con conservación del mundo offline. `js/pvp-loadout.js`: copia y plantillas del equipo offline por nave propia. `js/shared-session.js`: invitado, conexión, UI, invitaciones, ping, entradas 20 Hz, reconciliación, regreso y reconexión. `game3d.js`: controles originales, múltiples naves remotas, nombres, selección, radar, base y portal. `css/shared-world.css`: interfaz táctil.

`shared-world.mjs`: Durable Object, SQLite, tickets, snapshots públicos, mensajes limitados, presencia y limpieza. `world-rules.mjs`: consentimiento, cuenta regresiva, importación del equipo y casco ×20, duelos independientes, fin y reaparición. Reutiliza `combat.mjs` para proyectiles y habilidades, aislando los jugadores/balas por duelo. El servidor calcula movimiento, cadencias, daño, críticos, energía e impactos. Las posiciones, estadísticas y daño enviados por el cliente no se aceptan como autoridad.

WebSockets con hibernación; el estado se persiste tras cada mensaje. La simulación avanza por entradas y alarmas de mantenimiento, sin bucle permanente. El cliente se pausa si deja de recibir estados. Tras pérdida de conexión pide un ticket nuevo con el mismo invitado. Se cierra una presencia sin mensajes tras 15 segundos; las reservas sin conexión caducan tras 30 segundos. Una misma identidad no abre dos conexiones simultáneas.

Se conservan los exports/bindings ArenaRoom y ArenaLobby para mantener los namespaces existentes; no se borra almacenamiento anterior. El lobby, cola y salas del prototipo fueron retirados. Las rutas antiguas responden 410; `pvp.html` redirige al nuevo mapa. El APK empaqueta motor y recursos locales; HTTPS/WSS del host PvP está permitido por CSP. Internet es necesario para este mapa.

## API

- GET /health: versión y modos.
- POST /world/join: `{guestKey, name, shipId, roster}` → `{playerId, token, expiresAt}`.
- GET /world/socket: WebSocket con subprotocolos `['mundo-world-v1', token]`.
- Mensajes cliente: input, invite, reply, ship, name, volley, ability, surrender, hangar, loadout, ping, leave.
- Mensajes servidor: world, volley, pong, error. Los snapshots nunca incluyen tickets ni claves privadas.

## Validación

Desde la raíz: `node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs`.

Desde esta carpeta: `npm ci && npm test`. Integración real con Miniflare: invitados, tres conexiones, identidad estable, rutas antiguas retiradas, perfiles del servidor, movimiento, consentimiento, cuenta regresiva, impactos, espectadores, cambio de nave en base y desconexión. La prueba web de desarrollo verifica dos clientes Three.js, selección de nave, toques a izquierda y derecha, petición manteniendo el joystick, rechazo, aceptación, cuenta de tres segundos, disparos y habilidades dentro de la base, muerte/reaparición y guardado offline intacto. Una prueba entre teléfonos reales sigue siendo necesaria para valorar latencia y controles de cada equipo.

### Partida normal y servidor de prueba (v224)

`GET /game-config` publica `{testServerEnabled: boolean}` sin caché. El binding de texto `TEST_SERVER_ENABLED` controla las pruebas: `true` (o ausente) las habilita; `false` las cierra. No es necesario distribuir otra APK para cambiarlo. El cliente consulta al entrar y cada 60 segundos. Si la consulta inicial falla, permite jugar la partida normal offline; no habilita pruebas con una configuración antigua.

`POST /world/join` recibe `realm: "normal" | "test"`; el WebSocket usa `/world/socket?realm=normal|test`. Normal conserva el objeto `shared-cemetery-v1` y pruebas usa `shared-cemetery-test-v1`. Sus jugadores, invitaciones, combates y tickets están separados. Las conexiones sin `realm` conservan la ruta normal por compatibilidad; las versiones anteriores deben actualizarse para usar la separación nueva. Al deshabilitar las pruebas se rechazan nuevas entradas y sockets de ese entorno; los sockets abiertos se cierran en su siguiente mensaje. La partida normal sigue disponible.

Los guardados locales permanecen en `mundoAbierto.player` y `mundoAbierto.qaPlayer`. El modo se fija por página para que otra pestaña no cambie el destino de los guardados del hangar. Cambiar de entorno guarda antes de recargar y no copia créditos, equipo ni materiales. Cerrar las pruebas conserva el guardado QA, sin convertirlo en progreso normal. QA mantiene sus botones de créditos, materiales, niveles, drones y reparación; las compras y el ensamblaje usan sus recursos separados. Esto sigue siendo un prototipo de invitados: no certifica el progreso offline frente a clientes modificados.

## Habilidades PvP (v231)

En Equipar se eligen dos habilidades distintas, solo en la base y fuera de un duelo. Se conservan por dispositivo y modo (normal/pruebas), además de la habilidad propia de la nave. Cada habilidad tiene 30 s de recarga desde su activación, sin coste de energía. Los botones muestran duración activa y recarga; las teclas 1 y 2 también las activan. Al terminar o comenzar un duelo se limpian sus efectos y recargas.

- Interferencia: 3 s sin fijación automática, mascota ni guiado de misiles; rompe también el guiado ya iniciado. No da invulnerabilidad a disparos manuales.
- Escudo instantáneo: daño recibido ×0,5 durante 3 s, adicional a defensas de nave/formación.
- Furia: daño de proyectiles ×2 durante 3 s (se calcula al impactar).
- Transferencia: cura el 50 % del casco realmente quitado al rival durante 5 s; no cuenta daño evitado ni exceso de daño al matar, ni supera el máximo.
- Paralizado: inmoviliza al oponente durante 3 s, dentro de 1200 m; conserva apuntado/disparo. La habilidad propia de Centella elimina esa parálisis cuando se activa con energía suficiente.
- Suerte: lanza automáticamente otra ráfaga completa de misiles, incluso si estaban recargando; concede una sola ráfaga y luego aplica su recarga normal de 7 s.

El servidor valida equipo, duelo, distancia, tiempos e impactos. Mensajes nuevos: `skills` con `{skills:[id,id]}` y `pvpSkill` con `{skill:id}`. Snapshots públicos: `equippedSkills`, `skillUntil`, `skillReadyAt`, `paralyzedUntil`; nunca se envían tokens ni plantillas privadas. `skills.mjs` define las reglas compartidas por la simulación y los snapshots; `js/pvp-skills-ui.js` presenta las reglas que anuncia el servidor.

Pruebas: `skills.test.mjs` cubre duraciones, límites y efectos; `test.mjs` comprueba equipo, activación, parálisis y recarga a través de WebSockets con Miniflare.
