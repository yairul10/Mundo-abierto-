# Servidor PvP de Mundo Abierto

Prototipo 1 contra 1 separado de Gallina Cósmica. Estado del código revisado para el contenido `3d-20261012-187`; Worker versión `0.2.0`. Host configurado: https://mundo-abierto-pvp.jairog940.workers.dev. Esta referencia describe el repositorio, no certifica el estado del despliegue remoto.

## Integración actual

El botón PvP del juego abre `pvp.html`, con Buscar rival, Crear sala y Unirse por código de seis dígitos. La reserva usa un perfil compacto del guardado local normal o QA y abre `index.html?pvp=1`. La arena reutiliza `game3d.js`: controles, cámara, fijación, nave, drones, misiles, robot y habilidades.

`js/pvp-session.js` administra ticket, conexión, entradas a un máximo de 20 Hz, predicción, estados, ping y hasta tres reintentos de conexión. El servidor resuelve movimiento, proyectiles, impactos, daño, energía y reparación. El modo PvP bloquea escrituras al progreso individual; no concede créditos, copas ni XP.

El APK incluye lobby y arena; permite HTTPS/WSS del servidor en la política de contenido. La partida individual sigue funcionando offline, pero el PvP necesita internet.

## Arquitectura

Worker `mundo-abierto-pvp`. Durable Object SQLite `ArenaRoom` por sala y `ArenaLobby` por región (sa, na, eu, other). Las regiones separan colas; no fuerzan una ubicación física. El lobby del cliente actual usa sa.

WebSockets con hibernación. La simulación y los estados avanzan al recibir mensajes; el combate subdivide el tiempo en pasos de hasta 25 ms y limita el tiempo procesado por mensaje. No hay un bucle permanente de simulación. Radio de arena: 1500 m; alcance de láser: 1200 m; duración máxima: tres minutos.

## Perfil y combate

Con perfil local, cada piloto conserva estadísticas propias limitadas por el servidor: casco, energía, ataque, defensa, velocidad, nave, drones, explorador, robot, misiles y especializaciones. La propiedad de ese equipamiento aún no está autenticada.

Láser principal: dos proyectiles con daño base de 50 % del ataque cada uno; dron/explorador: 20 %; misil: tres veces el ataque. Cadencias base: láser 680 ms, explorador 680 ms y misil 7000 ms, con modificadores de habilidad. El servidor valida cantidad de proyectiles, dirección, origen relativo, cadencia y daño. Estos valores corresponden a `combat.mjs`, no a las reglas antiguas de prueba.

Sin perfil se conserva la ruta de compatibilidad: vida 600, velocidad 220, disparo `fire` de daño 20 cada 500 ms. El objeto `rules` de los snapshots todavía describe esa ruta; para equipamiento local se usan `players[].profile` y el estado del jugador.

## API y protocolo

- GET /health: estado, versión y modo.
- POST /rooms: crea sala con nombre y profile opcional.
- POST /rooms/123456/join: reserva segundo asiento; máximo dos.
- POST /matchmake: recibe nombre, region y profile opcional.
- GET /rooms/123456/socket: WebSocket.

Las reservas devuelven room, playerId, token y expiresAt. La entrada de cola vence a los 60 segundos; la sala de espera dura hasta diez minutos. El ticket se guarda temporalmente en sessionStorage.

```js
const socket = new WebSocket(
  'wss://mundo-abierto-pvp.jairog940.workers.dev/rooms/' + room + '/socket',
  ['mundo-v1', token]
);
```

El token es privado: no colocarlo en la URL ni en logs. No hay listado público de salas. La partida comienza cuando ambos pilotos conectan.

Mensajes actuales:

```json
{"type":"input","seq":1,"move":[0,0,-1],"aim":[0,0],"firing":false}
{"type":"volley","weapon":"laser","shots":[{"offset":[0,0,-58],"direction":[0,0,-1]},{"offset":[0,0,-58],"direction":[0,0,-1]}]}
{"type":"ability"}
{"type":"ping","time":123}
{"type":"leave"}
```

Move debe tener longitud ≤1 y seq debe aumentar. Volley admite laser, missile y explorer; los detalles se validan en `combat.mjs`. El cliente no decide vida ni daño. La ruta antigua `fire` solo se acepta sin perfil.

El servidor envía `state` con status, serverTime, startedAt, jugadores, perfiles, vida, energía, posición, orientación y resultado; `volley` comunica proyectiles y `pong` devuelve el tiempo del ping.

El cliente intenta reconectar con el mismo ticket. El servidor finaliza tras unos 12 segundos de desconexión o 15 sin actividad, evaluados por alarmas. El abandono da victoria al rival. Las salas terminadas se limpian tras 60 segundos. El cliente vuelve a la partida individual al salir.

## Límites y estado de prueba

Origins admitidos: https://yairul10.github.io, https://localhost, http://localhost y capacitor://localhost. También se admiten clientes sin Origin; esto no acredita identidad.

Tickets aleatorios, máximo un socket por asiento, mensajes de hasta 8192 caracteres, cuerpos HTTP de hasta 4096 bytes y hasta 35 mensajes/s/socket. API_LIMIT limita por IP a 60 solicitudes/minuto según `deployment.json`; health no usa el limitador. No es una cuota global exacta.

El perfil proviene del guardado local. No es un modo competitivo con propiedad verificada, cuentas ni recompensas persistentes. Antes de añadir premios se requiere identidad y validación de equipamiento; la calidad de red y sensación de combate requieren pruebas reales.

## Pruebas

Desde la raíz, sin instalar dependencias:

```sh
node --test tests/*.test.mjs server/pvp/combat.test.mjs
```

Para integración completa, desde server/pvp:

```sh
npm ci
node test.mjs
node profile-test.mjs
node combat.test.mjs
```

Miniflare está fijado en package-lock y carga Worker y combate como módulos. `test.mjs` cubre health, origins, capacidad, tickets, sockets duplicados, combate sin perfil, movimiento, abandono y cola. `profile-test.mjs` comprueba perfiles diferentes y proyectiles del servidor. `combat.test.mjs` verifica la lógica de equipamiento y armas sin iniciar Miniflare. El script actual `npm test` ejecuta únicamente `test.mjs`.

Ver [comprobaciones manuales](../../docs/pruebas.md) para la prueba con dos dispositivos. El workflow APK ejecuta las pruebas sin dependencias; no ejecuta las dos integraciones Miniflare ni certifica el servidor remoto.

## Despliegue

`deployment.json` conserva los metadatos para subida multipart de la API Cloudflare. El módulo principal es worker.mjs; las clases usan SQLite. El servidor sigue separado del Worker de Gallina Cósmica. No incluir claves o tokens de la cuenta en el repositorio.

Actualizar esta referencia al cambiar cliente, protocolo o equipamiento. El historial de despliegues debe distinguirse del comportamiento vigente del código.

