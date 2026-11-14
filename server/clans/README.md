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
