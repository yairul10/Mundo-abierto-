# Servidor PvP de Mundo Abierto
Backend de prueba 1 contra 1, separado de Gallina Cósmica. Desplegado en https://mundo-abierto-pvp.jairog940.workers.dev el 11 de octubre de 2026.
**Todavía no está conectado al menú ni a la arena 3D del juego.** No da monedas, copas ni XP y no modifica las partidas offline. Estadísticas de prueba iguales para ambos pilotos; naves, drones, misiles, rangos y recompensas requieren la siguiente etapa de integración.

## Arquitectura
Worker `mundo-abierto-pvp`. Durable Object SQLite `ArenaRoom` por sala. `ArenaLobby` por región (sa, na, eu, other) para la cola casual. Las regiones separan colas; no obligan una ubicación física de despliegue.
Conexiones WebSocket con hibernación; no hay intervalos permanentes de simulación. El servidor procesa entradas, limita desplazamiento y transmite snapshots al recibir mensajes válidos. El cliente futuro debe interpolarlos y enviar entradas a 20 Hz y ping al menos cada 5 segundos.
Vida 600, velocidad 220 m/s, radio 1500 m, láser 20 de daño, recarga 500 ms y alcance 1200 m. Raycast simplificado con radio de impacto de 35 m. El cliente no envía posiciones autoritativas ni decide vida/daño.
La simulación por entradas es un prototipo; antes de PvP competitivo deben añadirse simulación uniforme, compensación de latencia, identidad persistente y pruebas con móviles reales.

## API
- GET /health: estado y versión.
- POST /rooms con {"name":"Piloto"}: crea sala de seis dígitos.
- POST /rooms/123456/join con {"name":"Otro piloto"}: reserva segundo asiento. Máximo dos.
- POST /matchmake con {"name":"Piloto","region":"sa"}: reserva una sala o empareja con la espera de esa región. La entrada de cola vence a los 60 segundos; un asiento reservado vence con la sala.
- GET /rooms/123456/socket: conexión WebSocket.

Las reservas devuelven room, playerId, token y expiresAt. Conectar con:
```js
const socket = new WebSocket(
  'wss://mundo-abierto-pvp.jairog940.workers.dev/rooms/'+room+'/socket',
  ['mundo-v1', token]
);
```
El token es privado y no debe mostrarse en logs ni colocarse en la URL. No existe un listado público de salas.
La partida comienza cuando ambos jugadores conectan. Cada socket recibe snapshots con type:"state", status, serverTime, players (id,name,hp,pos,connected), winner y reason.

Mensajes cliente:
```json
{"type":"input","seq":1,"move":[0,0,-1]}
{"type":"fire","direction":[0,0,-1]}
{"type":"ping","time":123}
{"type":"leave"}
```
move debe ser vector de longitud <=1 y seq creciente. direction debe ser un vector unitario. Movimiento y disparos se aceptan solo en active.
La desconexión permite reconectar con el mismo token durante unos 12 segundos. Ausencia de actividad/pings 15 segundos finaliza la partida. Duración máxima 3 minutos; salas de espera 10 minutos. El abandono da victoria al rival, sin recompensas persistentes. Las salas terminadas se limpian tras 60 segundos.

## Seguridad y costes
Origins admitidos: https://yairul10.github.io, https://localhost, http://localhost y capacitor://localhost. Los clientes sin Origin pueden conectar; esto no sustituye autenticación.
Tickets aleatorios, comparación segura, máximo un socket por asiento, mensajes <=1024 caracteres, cuerpos HTTP <=2048 bytes, máximo 35 mensajes/s/socket.
Binding API_LIMIT limita por IP a 60 peticiones/minuto (límite local de Cloudflare, no cuota global exacta). Health no usa el limitador.
Solo tickets temporales de invitado: no es una autenticación de cuentas ni una protección completa contra bots/abuso. No debe otorgar premios hasta incorporar identidad y validación.
Se usa el plan existente, no se cambió facturación. El uso se suma al de Gallina Cósmica en la misma cuenta. Ningún Worker anterior fue modificado.

## Pruebas y despliegue
Desde server/pvp: npm ci y npm test. Miniflare está fijado en package-lock; solo se usa para probar.
Pruebas locales con workerd/SQLite/WebSockets: origins, capacidad, tickets inválidos, sockets duplicados, daño del servidor, límites de movimiento, abandono y emparejamiento.
Pruebas reales de Cloudflare: health, sala con dos conexiones, rechazo de tercer asiento/token inválido, daño de 20 aunque el cliente envíe 999999, resultado y emparejamiento.
deployment.json conserva los metadatos de subida multipart de la API de Cloudflare. El módulo principal es worker.mjs y las clases usan exports SQLite. Activar workers.dev solo para este Worker. No incluir claves o tokens de la cuenta en el repositorio.

## Próxima integración
Añadir cliente y arena separada en 3D, botones Buscar rival/Crear sala/Unirse, interpolación, reconexión y regreso a partida offline. En el APK se deberá permitir este host HTTPS/WSS en CSP connect-src; hoy el paquete offline permite solo el mismo origen.

## Prueba de equipamiento local (0.2.0)
La arena abre index.html?pvp=1 y usa game3d.js: los mismos controles, cámara, fijación, naves, drones, misiles, robot y habilidades de la partida normal. La reserva importa un perfil compacto del guardado local. Los proyectiles, impactos, daño, defensa, vida, energía y reparación los resuelve combat.mjs en el servidor. La partida PvP bloquea las escrituras del progreso offline. No hay recompensas ni cuentas; la propiedad de las mejoras locales aún no está autenticada, por lo que no es un modo competitivo seguro.

Ejecutar en server/pvp: node test.mjs; node profile-test.mjs; node combat.test.mjs. Miniflare carga worker.mjs y combat.mjs como módulos explícitos.
