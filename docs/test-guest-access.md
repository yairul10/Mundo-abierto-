# Prueba cooperativa online

`TEST_GUEST_ACCESS=true` permite invitados del navegador únicamente en `realm=test`, mientras `TEST_SERVER_ENABLED` esté habilitado. El servidor normal sigue verificando Google. Cambiar `TEST_GUEST_ACCESS=false` revoca el acceso de invitados.

La clave de invitado se conserva por pestaña en sessionStorage. La partida local de prueba usa `mundoAbierto.qaPlayer`. No se migran recompensas de invitados a cuentas normales ni se conceden privilegios admin.

Acceso: `index.html?pvp=1&guesttest=1`. Es el mapa multijugador existente con sus controles, naves y base, adaptado en pruebas a un corredor delimitado por nubes. Hay tres Colosos Pro a 1.200, 2.500 y 3.800 m; los jugadores no pueden hacerse daño entre sí. El servidor normal conserva el mapa PvP circular.

La antigua página `cooperative-test.html` redirige al mapa online. Se retiró el prototipo separado.

Validación: `node --test server/pvp/test-guests.test.mjs server/pvp/cooperative-corridor.test.mjs` y `node tests/pvp-arena-enemies.test.mjs`.
