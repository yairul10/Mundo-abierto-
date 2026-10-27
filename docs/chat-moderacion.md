# Chat del mapa — contenido 330

Chat de texto por sala PvP, con separación normal/pruebas. Botón Chat arriba a la izquierda; reglas aceptadas antes de enviar, máximo 240 caracteres y un envío cada dos segundos. No admite enlaces. No se promete filtrado automático de todos los contenidos abusivos: hay revisión mediante reportes.

Cada mensaje de otro piloto ofrece Reportar y Bloquear. Los bloqueos se guardan en el servidor por identidad y se pueden revocar en Jugadores bloqueados. El historial devuelve los últimos 50 mensajes no borrados de las últimas 24 horas. Se conservan como máximo 500 mensajes sin reporte y se conserva la evidencia reportada. Los reportes no producen sanciones automáticas.

## Administración

Configurar `CHAT_ADMIN_IDS` con el ID PvP autorizado (visible en Chat → Tu ID; varios IDs separados por coma), y un secreto largo y aleatorio `CHAT_ADMIN_KEY` en el Worker; nunca incluirlo en código, capturas, URL ni guardado local. Sin ese secreto o sin IDs autorizados el servidor rechaza el acceso de moderador y el envío de mensajes, evitando activar un chat sin herramientas de moderación. En Chat → Administración se introduce la clave, que se borra del campo al enviar y no se persiste en el cliente. El servidor exige además que la cuenta esté en CHAT_ADMIN_IDS, incluso si alguien conoce la clave. El permiso dura esa conexión; hay que autenticarse de nuevo al reconectar. No se concede acceso por nombre ni por ID enviado por el cliente.

El panel muestra los últimos 100 reportes con autor, identificador, mensaje, motivo y estado. Permite descartar, borrar el mensaje, silenciar 1 hora/24 horas, banear del chat indefinidamente y quitar el silencio. Las acciones quedan auditadas en SQLite. El ban afecta a la escritura del chat, no expulsa del juego. Cambiar apodo o reconectar no anula la sanción.

PvP requiere una sesión Google Play verificada en el servidor. El identificador interno es estable por cuenta; los reportes, bloqueos y sanciones se conservan al cambiar de apodo o dispositivo. Otra cuenta Google continúa siendo otra identidad. Antes del lanzamiento público, definir retención/borrado de evidencia y actualizar declaraciones de privacidad, público objetivo y contenido interactivo de Play Console. La aceptación de reglas no sustituye atender los reportes.

## Despliegue y validación

Añadir `chat.mjs` a los módulos publicados junto a `shared-world.mjs`. No sustituir namespaces ni salas. La creación de tablas es aditiva y no toca premios/inventarios. El cliente y servidor deben actualizarse juntos. Probar primero en un Worker aislado y con dos dispositivos. Este cambio de repositorio no despliega Cloudflare.

`node --test tests/*.test.mjs server/pvp/*.test.mjs` comprueba persistencia SQLite, bloqueos, reportes, permisos, sanciones tras reconstrucción, borrado, revocación y validación del texto. Prueba manual: abrir chat en dos móviles, aceptar reglas, enviar, reportar, bloquear/desbloquear, acceder al panel y silenciar al emisor; volver a conectar y comprobar la sanción. Verificar teclado y controles de vuelo en horizontal.
