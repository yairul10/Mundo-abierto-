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
