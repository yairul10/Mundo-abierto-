# Cuenta Google obligatoria en PvP

El PvE continúa como invitado y sin conexión. PvP requiere la aplicación Android con Google Play Games: la web no tiene ese proveedor de autenticación y muestra un aviso en lugar de aceptar una identidad de invitado.

El cliente solicita un código de Google y lo intercambia en el servicio de identidad existente. El token de sesión se conserva solo en memoria y se envía en Authorization al entrar al mapa; nunca en URL ni en guardado local. Esto no activa ni reemplaza el guardado nube de quien eligió jugar PvE como invitado.

El Worker PvP consulta `/v1/play-games/me` por el service binding `PLAY_IDENTITY`. El servicio verifica la firma y expiración usando su SESSION_SIGNING_KEY existente. No se copia ese secreto al Worker PvP. La identidad RPC es impuesta por el servidor: se ignoran accountId/playerId declarados en el cuerpo del cliente. Sin sesión, con sesión inválida o sin servicio configurado, la entrada falla de forma cerrada.

Las salas derivan el ID de `google-play:` más el UUID interno de cuenta con SHA-256. El mismo usuario tiene el mismo ID aunque cambie el nombre o el dispositivo; las salas normal/pruebas continúan independientes. Los sockets anteriores sin cuenta se rechazan al reconectar o mandar un mensaje. No se concede una excepción invitado para el modo de pruebas publicado.

## Activación coordinada

1. Actualizar el servicio de identidad conservando sus rutas de respaldo de invitado: añadir la ruta GET /v1/play-games/me desde server/cloud-save/play-games-identity-worker.mjs a la composición publicada existente. No reemplazar el Worker compuesto completo por ese archivo aislado.
2. Añadir al Worker PvP el binding de servicio `PLAY_IDENTITY` hacia `cosmos-legacy-lite-test`. Conservar los bindings de Durable Objects, rate limit y secretos ya existentes.
3. Publicar los módulos account.mjs, chat.mjs y los módulos PvP actualizados. Desplegar el cliente Android junto al servidor; clientes antiguos dejarán de entrar a PvP.
4. Configurar CHAT_ADMIN_KEY y probar en instalación Play interna con dos cuentas. Validar misma identidad tras reiniciar y sanciones tras reconectar.

Este cambio no despliega ni modifica secretos automáticamente. Las pruebas de integración locales usan un servicio de identidad ficticio explícito en test-identity.mjs, que nunca se importa desde los módulos de producción.

## Progreso anterior

El inventario PvE y las naves ya guardadas localmente no se borran y se siguen importando. Los recibos pendientes del antiguo ID invitado permanecen en SQLite bajo ese ID; no se reasignan automáticamente ni por un ID proporcionado por el cliente. Preparar una migración autenticada de esos recibos antes de activar el cambio si hay premios sin reclamar. Los bloqueos y sanciones previos bajo ID invitado requieren la misma consideración. La identidad estable no valida por sí sola la legitimidad del inventario importado: esa protección sigue siendo un trabajo aparte.
