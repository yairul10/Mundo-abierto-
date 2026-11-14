# Clanes — paso 2: almacenamiento

Reglas: 20 miembros, un clan por cuenta de Google Play y por entorno; crear cuesta
200.000 créditos. Roles: leader/officer/member. Ingreso: open/request/invite.
Los clanes de prueba están separados de los normales mediante la clave realm.

`migrations/0001-clans.sql` es aditiva e idempotente. Se aplica al D1 enlazado como
CLANS_DB (la misma base de identidad/guardados, tablas nuevas con prefijo clan).
No modifica player_saves. Las claves únicas impiden doble pertenencia y las
restricciones SQL impiden superar el cupo incluso con escrituras concurrentes.

`GET /clans/me?realm=normal|test` verifica la sesión de Google Play y devuelve
el clan de la cuenta autenticada, permisos, solicitudes propias e invitaciones
vigentes. Solo líder/oficial ven solicitudes de ingreso del clan. No se aceptan
IDs de cuenta ni roles del cliente. Invitados no tienen acceso.

Esta fase no expone escrituras ni cobra créditos. La creación se habilitará en el
paso 4 junto con débito validado por servidor y recibo idempotente; una cifra de
créditos o un recibo enviado por el cliente nunca autoriza crear un clan.
El menú, altas/bajas y cambios de roles corresponden a los siguientes pasos.

Las futuras escrituras deben usar D1 batch para sus cambios relacionados y
revalidar el rol/cupo en la misma transacción (no reutilizar permisos leídos antes).
La transferencia de liderazgo debe cambiar ambos roles en una sola transacción.
La tabla de recibos conserva la operación aunque posteriormente se disuelva el clan.

Validación: node --test tests/clan-storage.test.mjs

Paso 3: menú Clanes en ☰ (mapa individual), Mi clan y búsqueda por nombre/etiqueta.
GET /clans/search?q= devuelve hasta 20 clanes. GET /clans/detail?id= devuelve
la ficha y miembros con identificador corto de piloto, sin solicitudes ni invitaciones.
Ambas rutas requieren Google Play y aíslan realm. Crear/ingresar se añade después.

Paso 4: POST /clans/create (Servidor 1, Google Play) crea el clan y su líder.
El cliente sincroniza primero el progreso y bloquea sus envíos durante la compra.
0002-clan-payments.sql valida revisión y saldo en D1 y descuenta 200.000 créditos
mediante triggers en el mismo batch que clan, membresía y recibo. operationId hace
los reintentos idempotentes y clanPurchases viaja en el progreso de nube.
Las creaciones inciertas se conservan localmente para comprobar el mismo recibo.
No se habilita creación de pago en el servidor de prueba (no comparte su economía
con player_saves). POST /clans/edit permite al líder editar descripción y admisión
con revisión optimista, sin un nuevo cobro. Las altas/bajas se implementan después.

Paso 5: POST /clans/membership admite join/request/cancelRequest, approve/reject,
invite/acceptInvite/declineInvite/cancelInvite y leave. El actor siempre se deriva
de Google Play. Las escrituras vuelven a comprobar los permisos en SQL, los cupos
se validan mediante triggers y cada cuenta conserva una sola membresía por realm.
Las solicitudes pendientes (máximo 5 por cuenta) e invitaciones se limpian al ingresar.
Las invitaciones duran 7 días y requieren que el invitador siga siendo líder/oficial.
El menú muestra el ID completo propio para compartirlo, solicitudes e invitaciones.
La salida del líder queda bloqueada hasta implementar la transferencia del paso 6.
0003-clan-membership.sql es una migración aditiva e idempotente.

Paso 6: POST /clans/admin admite promote/demote/kick/transfer/disband. Solo el
líder cambia cargos, transfiere o disuelve. Un oficial solo expulsa miembros
normales; ningún actor puede expulsarse a sí mismo ni expulsar al líder.
0004-clan-administration.sql valida permisos y aplica la acción dentro de un
único INSERT con triggers atómicos. Transferir degrada al líder anterior a oficial
y asciende al destinatario sin exponer un estado sin líder entre peticiones.
operationId conserva recibos incluso tras disolver, para que un reintento no
repita la acción. La disolución elimina las membresías y pendientes por cascada;
conserva los recibos de pago y no devuelve créditos. El menú confirma expulsión
y transferencia; disolver exige escribir la etiqueta del clan.

Paso 7: POST /clans/badges consulta etiquetas por lotes de hasta 24 pilotos.
Requiere sesión verificada, separa los entornos y obtiene la pertenencia desde D1.
HUD, naves, selección y grupos muestran [TAG] Nombre sin cambiar el nombre guardado.
El cliente actualiza cada 30 segundos y fuerza la consulta tras cambios propios.
No se agregan lecturas D1 a cada fotograma ni a cada disparo del servidor de combate.
