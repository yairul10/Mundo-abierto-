# Pruebas y comprobaciones manuales

Actualizado para el contenido de `3d-20261015-223`. Ejecutar desde la raíz con Node 22 o superior:

```sh
node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs
```

No requiere instalar dependencias. El workflow Android ejecuta este comando antes de preparar SDK, firma y APK; si falla, la compilación se detiene. Los cambios en `tests/**` y en el módulo/prueba de combate PvP también activan ese workflow.

## Cobertura actual

| Prueba | Qué comprueba |
| --- | --- |
| advanced-enemy-stats | Escalado avanzado de 2 %, límite ×2,5 y conservación del porcentaje de vida del Coloso |
| graveyard | Arpón, daño continuo, inmunidad, muerte del dueño, parejas, bomba coordinada, evasión, zona segura y limpieza |
| hangar-systems | Recetas, propiedad, economía, duración, posiciones, ventajas y cambios de vida sin acumulación |
| pvp-hangar | Compras canónicas, guardado sin casco ×5, posición/jefes/misiones conservados, bloqueo durante duelos y actualización de equipo |
| pvp-loadout | Flota propia, mejoras y formación offline, casco ×5 sin acumulación, copia sin modificar el guardado |
| server/pvp/combat | Perfil de equipamiento, láseres, cadencia, daño del servidor, misiles, Titán y reparación |

La prueba del Cementerio usa objetos simplificados de Three.js. Deben incluir las operaciones utilizadas por el código, como grupos, anillos y recorrido de hijos. Un fallo de esos objetos simulados no demuestra por sí solo un fallo del motor real.

Al cambiar el máximo de vida, se conserva el porcentaje: 20000/40000 equivale a 24000/48000 o 40000/80000. La prueba distingue ambos casos y comprueba también la reducción del máximo y la vida cero.

## Integración PvP

Con las dependencias del servidor instaladas:

```sh
cd server/pvp
npm ci
node test.mjs
node --test world-rules.test.mjs
node combat.test.mjs
```

`test.mjs` requiere Miniflare/workerd y prueba HTTP, SQLite, WebSockets, invitados en un mismo mapa, consentimiento, movimiento, daño, espectadores y desconexión. Las pruebas de reglas y combate no requieren dependencias. `npm test` del servidor ejecuta los tres comandos.

## Comprobación manual

- Abrir en horizontal, volar, disparar y usar misiles; probar también controles táctiles.
- Viajar entre los cuatro mapas: entradas desde niveles 10, 30 y 40; carga a 100 m durante tres segundos.
- Aterrizar, reparar, comprar una mejora y volver a despegar.
- Equipar Titán y Espectro; comprar drones, explorador y robot; cambiar formaciones sin acumular ventajas.
- Verificar Catapulta: brazo, liberación de bomba, advertencia y evasión del área.
- Verificar Arponero: cable desde el carrete, salida/recuperación del arpón, inmovilización y liberación.
- Verificar Coloso: encaje de cuatro puertas, apertura, salida de refuerzos y misil guiado.
- Cerrar y abrir: conservar posición, sector, inventario, campañas y estado del Coloso.
- Instalar APK y abrir primero en modo avión: los cuatro sectores y modelos deben estar disponibles. Activar internet para el PvP.
- En dos dispositivos: crear/unirse o buscar rival, comprobar equipamiento, disparos, ping, desconexión, resultado y regreso a la partida individual.

Las pruebas unitarias y la compilación no sustituyen la inspección gráfica ni una partida PvP real. Mantener documentación y pruebas junto a cada cambio de sistema, sin alterar expectativas únicamente para ocultar errores de lógica.

## v224 · Selector de partida y pruebas temporales

- Al entrar con pruebas habilitadas: elegir **Partida normal** o **Servidor de prueba**. La pantalla explica que sus progresos no se transfieren.
- Desde Nave → Cambiar de partida, alternar entre ambos; los créditos y materiales QA deben permanecer exclusivamente en su partida.
- En pruebas se conservan los botones actuales para obtener créditos/materiales, añadir niveles, equipar drones y restaurar la nave. Se identifican con la etiqueta SERVIDOR DE PRUEBA.
- Entrar al portal PvP desde cada entorno: solo aparecen pilotos del mismo entorno. El hangar lee y escribe el guardado correspondiente. Casco ×5 se aplica exclusivamente en PvP.
- Con `TEST_SERVER_ENABLED=false`, no aparece el selector ni las herramientas QA. La partida normal abre directamente. Una partida de pruebas abierta se guarda y vuelve a normal al detectar el cierre (máximo 60 segundos con conexión). El servidor rechaza sus accesos desde el cambio.
- Volver a `true`: reaparece la elección y se recupera el guardado QA anterior. No se borra ninguno de los dos progresos.
- Sin conexión: la partida normal funciona; no se ofrece el servidor de prueba si no se puede comprobar su disponibilidad.

Validación automática: `node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs`, `node server/pvp/test.mjs` y `node mobile/test-app/prepare-offline.mjs`.

## v225 · Diario de actividad y Gran Titán

El menú Nave, el hangar y el menú del mapa PvP permiten abrir el diario. Conserva las últimas 200 acciones por guardado, con fecha/hora local y filtros; registra enemigos destruidos y sus premios, misiones completadas, compras y mejoras, ensamblaje, ventas, reparaciones y ayudas QA. Las operaciones rechazadas no generan entradas. Guardar o volver a abrir el diario no duplica registros. Las compras desde el hangar PvP se guardan en el diario de la partida de origen. Las acciones anteriores a esta versión no se reconstruyen.

Gran Titán: vida base 160.000 (antes 80.000); mantiene el 2 % por nivel desde 40 y el límite 105, con 368.000 de vida máxima. Las recompensas y el daño no cambian. Los guardados con vida anterior conservan su porcentaje mediante la migración existente.

## v226 · Vida original del Gran Titán

Se restaura la vida base a 80.000 (184.000 al nivel 105). Se conservan recompensas, daño, escalado y diario de 200 acciones. La migración mantiene el porcentaje de vida de los guardados de v225.

## v227 · Gráficos de ataques del Gran Titán

Verificar lanzas metálicas con punta orientada al movimiento y estela, cuatro bombas blindadas, avisos circulares sin malla y transición a rojo. Detonación con onda y destello breves; debe seguir dañando al quedarse en el centro. Los avisos conservan radio 150 y mecha 3,5 s; las lanzas conservan velocidad 570. Al cambiar de mapa o morir el Titán, no quedan proyectiles ni efectos. Prueba de navegador con WebGL: seis lanzas, cuatro bombas, orientación, parámetros conservados, daño al jugador inmóvil y liberación de geometrías/efectos, sin errores.

## v228 · Pantalla horizontal al pasar al PvP en navegador

La versión web usa un documento exterior estable para mantener la pantalla completa y la orientación mientras el juego navega entre Cementerio y PvP. El juego interno se mantiene en un único marco del mismo origen; no se crean marcos anidados al entrar, volver o recargar. El botón horizontal del juego interno delega en el documento exterior. La APK conserva el arranque directo y su orientación nativa.

Probar desde un navegador móvil: activar horizontal, escoger normal o pruebas, atravesar el portal con su cuenta de 3 segundos, conectar a PvP y volver al Cementerio. La pantalla completa debe permanecer, sin repetir el aviso de giro ni modificar el guardado. Al girar realmente el dispositivo a vertical o salir manualmente de pantalla completa, se mantiene el aviso de orientación cuando corresponda. La comprobación de versión permanece en ambos documentos para evitar HTML antiguo en caché.

## v357 · Velocidad del láser de las naves

El láser principal de todas las naves viaja a 1.495 unidades/s (antes 1.150; +30 %), tanto en PvE como en el combate validado por el servidor PvP. Se conservan daño, cadencia, alcance, misiles y velocidad de los drones. El Android empaqueta el código: necesita una nueva compilación instalada; el cambio del servidor PvP también requiere desplegar Cloudflare.

Comprobar con naves básicas, ensambladas y admin: disparos manuales y con blanco fijado, alcance de 1.200 m y misiles sin cambios. En dos clientes PvP, verificar la velocidad del disparo local y remoto tras desplegar el servidor.

## v358 · Acelerador del láser y recetas PvP

Láser principal de todas las naves: 4.000 unidades/s de base; cinco mejoras de +440 hasta 6.200. Se compra únicamente atracado en la base PvP, en Tienda → Mejoras. Costes por nivel: 100.000/200.000/400.000/800.000/1.500.000 créditos y 5/10/20/40/80 núcleos del Nexo. El nivel se guarda en upgrades.laserSpeed y se aplica en PvE y PvP al cambiar de nave. Servidor valida el nivel entre 0 y 5. Drones, misiles, daño, cadencia y alcance no cambian. La detección de impactos recorre el segmento del láser entre fotogramas, también contra el volumen del Gran Titán.

Recetas: Azote requiere 100 núcleos de demolición; Égida, 100 bobinas de anclaje; Vértigo, 100 cristales de puntería. Cada una conserva 500.000 créditos, 1.500 chatarra, 450 aleación, 120 núcleos de energía, 30 componentes ancestrales y 50 núcleos del Nexo. Obsidian conserva su receta.

Pruebas: node --test tests/laser-upgrade.test.mjs tests/assembled-ships.test.mjs tests/pvp-hangar.test.mjs tests/pvp-loadout.test.mjs tests/pvp-fleet.test.mjs tests/fleet-progression.test.mjs server/pvp/combat.test.mjs. Manual: comprar en PvP, salir y reconectar, alternar nave y mapa, comprobar 4.000–6.200 unidades/s y disparos a objetivos pequeños con FPS bajos. Android requiere nueva compilación y el servidor PvP requiere desplegar el módulo combat.mjs actualizado.

## v359 · Modos de la mascota

Botón 🛰 junto al zoom, visible al comprar el Dron Explorador: Ambos → Atacar → Recoger. Cambia durante el vuelo y se guarda por partida en explorerMode. Ambos conserva la prioridad de disparo manual, defensa y después recogida. Recoger ignora blancos manuales y amenazas, no dispara; Atacar asiste al jugador y se defiende, pero no recoge cajas ni cuando no hay enemigos. Las zonas seguras no permiten ataques de la mascota. Los drones de combate normales conservan su comportamiento.

El modo persiste al abrir/cerrar el hangar PvP, cambiar de nave, volver al PvE y recargar. Probar botón táctil una vez por toque, ausencia sin mascota, recogida mientras el jugador dispara y modo Atacar con cajas al lado. Prueba automática: node --test tests/companion-mode.test.mjs tests/pvp-hangar.test.mjs tests/pvp-loadout.test.mjs.

## v360 · Impactos PvP al disparar en movimiento

Se transmite el punto de puntería junto con el origen visual de la nave. El servidor valida el origen predicho dentro de una tolerancia limitada por velocidad, valida que el punto esté en el rayo enviado y reconstruye la dirección desde su propia boca de disparo. Nunca acepta la posición del cliente como posición real del proyectil. Los clientes anteriores siguen usando el rayo original. Para blancos con posición suavizada, el cliente usa la última posición recibida del servidor al calcular la asistencia. Se conservan dispersión, daño, alcance, velocidad y cadencia. Misiles conservan su guiado.

Prueba tests/pvp-moving-fire.test.mjs: reproduce fallo del protocolo anterior con origen desplazado y acierto inmóvil; verifica aciertos laterales, verticales y longitudinales en enemigos de radio 35, láser 4.000/6.200, mascota, y rechazo de orígenes alejados y puntos fuera del rayo. Prueba manual pendiente en dos dispositivos: volar de lado y hacia atrás al disparar a refuerzos del Gran Titán, contrastar impactos y barra de vida con la nave inmóvil, con distintos ping. La corrección completa necesita actualizar la app y desplegar combat.mjs en Cloudflare.

## v361 · Joystick configurable también en PvP

Acomodar botones del hangar PvP incluye ahora el joystick, con una vista previa del mismo tamaño que el control real. Se mantienen las posiciones de los cinco botones de guardados anteriores y se agrega el joystick en su ubicación original. Guardar, cancelar y restablecer siguen disponibles. El centro del joystick se limita según su tamaño para no quedar recortado por el borde; al redimensionar se vuelven a aplicar esos límites. PvE mantiene su lista y guardados actuales. Prueba: node --test tests/control-editor-joystick.test.mjs. Prueba manual en teléfono: aterrizar, mover el joystick, guardar, despegar, comprobar movimiento y reabrir la app.

## v362 · Iconos de habilidades y botones listos

Las habilidades de nave ofensiva y defensiva tienen ahora iconos propios: potencia ascendente (shipFury.svg) y fortaleza (shipShield.svg). Furia y Escudo instantáneo de PvP conservan sus imágenes anteriores, sin repetirlas en el botón de habilidad de nave. Los seis poderes PvP y tres tipos de habilidad de nave tienen asignaciones diferentes. El estado listo no muestra «Lista · 1/2»; conserva el nombre accesible y muestra temporizador únicamente durante recarga o activación. Pruebas: node --test tests/combat-buttons.test.mjs tests/pvp-skill-labels.test.mjs. Iconos SVG renderizados para inspección visual. Verificar en teléfono con Segadora + Furia y Bastión + Escudo instantáneo, también en el editor de controles.

## v363 · Reinicio de la partida de pruebas

El guardado al salir restauraba la partida QA después de borrar su clave y recargar. El reinicio QA ahora bloquea las escrituras del juego antes de borrar mundoAbierto.qaPlayer y mantiene ese bloqueo durante la recarga. Rechaza ejecutarse en partida normal o PvP y libera el bloqueo si el almacenamiento falla. El mensaje identifica que solo se reinicia la partida de pruebas. No modifica mundoAbierto.player ni perfiles de cuenta. Prueba: node --test tests/test-progress-reset.test.mjs. Verificación manual: servidor de prueba → Nave → Reiniciar, confirmar, comprobar nivel 1 y progreso inicial; alternar a normal y comprobar su progreso conservado. No se ha reiniciado ninguna partida del usuario desde herramientas.
