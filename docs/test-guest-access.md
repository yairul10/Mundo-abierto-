# Invitados temporales en el servidor de prueba

Activar `TEST_GUEST_ACCESS=true` en el Worker permite tokens `test-guest-` únicamente en `realm=test`, mientras `TEST_SERVER_ENABLED` siga habilitado. El servidor normal siempre verifica Google. Cambiar `TEST_GUEST_ACCESS=false` revoca el acceso de invitados, incluidas sus conexiones existentes al siguiente mensaje.

El navegador crea una clave aleatoria por pestaña en sessionStorage. El servidor deriva una identidad de prueba; ignora identidades declaradas por el cliente, no migra recompensas de invitados y no concede acceso admin. El progreso local usa `mundoAbierto.qaPlayer`, separado de la partida normal.

Acceso: `index.html?pvp=1&guesttest=1`. Este cambio habilita el mapa online existente; la caverna de `cooperative-test.html` continúa como vista local hasta su integración multijugador.

Validación: `node --test server/pvp/test-guests.test.mjs`.
