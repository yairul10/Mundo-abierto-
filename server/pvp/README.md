# PvP abierto · Cosmos Legacy

Worker 0.6.0. Servidor: https://mundo-abierto-pvp.yairul17.workers.dev. Independiente de Gallina Cósmica.

## Mapa y protección

Radio total de 3.000 m. Se conserva la estación existente y su base protegida de 650 m. Fuera de la base todos los pilotos vulnerables pueden atacarse, sin invitaciones, desafíos, equipos ni duelos privados.

Una nave recién aparecida en la base está protegida. Salir elimina inmediatamente esa protección. Al volver a cruzar hacia dentro empieza un intervalo fijo de 5.000 ms: durante él puede causar y recibir daño. Ni disparar, recibir impactos, usar habilidades ni mandar mensajes reinician el intervalo. Salir antes lo cancela; la siguiente entrada inicia uno nuevo. Al vencer el plazo se bloquean tanto el daño recibido como el causado, incluyendo proyectiles ya lanzados. El servidor conserva el instante de entrada en SQLite; el cliente recibe únicamente el indicador `protected`, sin fecha límite ni conteo de protección en pantalla.

El hangar, los cambios de nave y la selección de habilidades requieren estar dentro de la base y haber recuperado la protección. El aterrizaje mantiene las plataformas y la aproximación existentes. Nadie puede usar el hangar para anticipar esos cinco segundos.

Al destruir una nave solo esa nave reaparece con casco y energía completos en la base. El atacante permanece donde estaba y conserva su vida. No hay premios ni pérdidas por destruir jugadores. Las compras y el ensamblaje dentro del hangar siguen usando el inventario offline real y su editor separado.

## Jefe cooperativo

El Titán del Nexo aparece en `[0,120,-1800]`, fuera de la base, con 1.000.000 PV compartidos y sin regeneración. Usa el cuerpo `nexo_body.glb` (battlemech) y dos instancias del mismo `nexo_arm.glb`. Geometría y materiales de ambos brazos se comparten; cada hombro conserva su objetivo y articulación independientes. El servidor publica los dos objetivos válidos antes del disparo para orientar los cañones y mostrar carga de energía. Los láseres rojos gruesos nacen en cada boca y las flamas rojas animadas salen de los dos propulsores inferiores. Texturas optimizadas: ambos archivos suman unos 6,4 MB frente a los 23,7 MB originales, sin modificar la geometría. Solo despierta al recibir daño. Cada 3 segundos elige hasta dos pilotos conectados y vulnerables distintos con mayor vida **actual** a 1.200 m; aplica a cada uno 5.000 de daño base a través de las defensas, escudos y habilidades normales. El hangar y la protección de la base bloquean sus ataques. No dispara ráfagas acumuladas tras inactividad. Patrulla a unos 80 m/s por una ruta fuera de la base y, en combate con pilotos vulnerables a su alcance, se teletransporta cada 20 segundos. El servidor elige el destino dentro de esa ruta; conserva vida y contribuciones. Los saltos y su destello se sincronizan y persisten junto al resto del estado. Un solo piloto recibe un solo golpe por ráfaga.

Láseres, misiles, drones y mascota usan las trayectorias y funciones de combate existentes. El servidor registra únicamente daño efectivo (sin contar sobre-daño, mensajes de daño del cliente ni golpes a jugadores). El premio total de 1.000.000 créditos se reparte proporcionalmente: causar el 25 % concede 250.000 créditos; los redondeos conservan exactamente el total. No hay cajas ni premio por el último golpe. Los participantes conservan su contribución al morir o salir.

La derrota y los recibos de premio se guardan juntos en una transacción SQLite. Los recibos se envían solo a su participante y se reintentan hasta recibir confirmación autenticada. El cliente guarda créditos e identificadores en una sola escritura antes de confirmar; reconectarse no duplica el premio y un fallo de almacenamiento permite reintentar. El hangar conserva sus compras y las estadísticas offline sin escalar. Pruebas y normal mantienen jefes y premios independientes. La identidad y el progreso siguen siendo locales al dispositivo: no se añade una cuenta sincronizada entre dispositivos.

Reaparece con vida completa 5 minutos después de morir, con una nueva ronda de participación. El estado se conserva mediante checkpoints y las recompensas se escriben inmediatamente en una transacción. Ambos modos usan el mismo ciclo de simulación mientras hay pilotos conectados.

## Equipo y combate

Se importan únicamente las naves poseídas, estadísticas y mejoras offline, drones, formación, mascota, robot reparador y especializaciones. El casco PvP es exactamente ×20 del casco offline, incluida Fortaleza, y nunca se vuelve a multiplicar sobre un perfil PvP. El daño, la defensa, la velocidad y la energía no se multiplican. Las reparaciones porcentuales usan ese máximo.

Los disparos recorren físicamente el mapa y chocan con el primer enemigo vulnerable en su trayectoria. Los misiles usan el objetivo indicado y validado por el servidor. Interferencia solo afecta a ese objetivo, no bloquea globalmente las armas porque otro piloto la tenga activa. Paralizado exige seleccionar un objetivo vulnerable a menos de 1.200 m. Las seis habilidades mantienen sus efectos y recargas. El servidor controla posiciones, energía, límites de ráfaga, cadencias, críticos, trayectorias y daño.

## Acceso y conexión

Hay portales desde Cementerio y desde Aurora (este último aparece a nivel 40). La vuelta conserva el mapa y la posición offline guardados. Se mantiene el ID de invitado, tickets temporales, reconexión y capacidad de 24 conexiones por mundo, sin crear mapas extra silenciosamente.

Los modos normal y pruebas usan objetos distintos (`shared-cemetery-v1` y `shared-cemetery-test-v1`). `TEST_SERVER_ENABLED=false` permite desactivar solo las pruebas. No se muestran ni se persisten claves de invitado en snapshots; los tokens nunca se publican.

`SharedWorld` usa SQLite y la API de WebSockets con hibernación. Ambos modos mantienen un ciclo de simulación de 100 ms mientras haya pilotos conectados; se detiene cuando sale el último. Ese ciclo activo impide hibernar: usar la API de hibernación no significa que una sala en combate esté dormida. Se mantienen los bindings y exports `ArenaRoom` y `ArenaLobby`, sin eliminar namespaces ni almacenamiento. Las invitaciones de clientes antiguos se rechazan con `open_pvp`.

## Comprobaciones

Desde la raíz:

```sh
node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs server/pvp/skills.test.mjs
```

Desde esta carpeta, con las dependencias instaladas:

```sh
npm test
```

Las pruebas verifican combate entre varios pilotos, selección de misiles, impactos al primer objetivo, protección a los 5.000 ms exactos, ausencia de reinicio por disparos/impactos, persistencia de la entrada, reaparición individual, hangar, separación normal/pruebas y ausencia de conteo en el cliente. La prueba WebSocket usa Miniflare y los módulos reales.

Para probar en Android: actualizar la APK y reconectar al PvP; usar dos o tres dispositivos, salir de la base, dispararse, volver a ella y comprobar que durante cinco segundos sigue habiendo daño y después se bloquea en ambas direcciones. Repetir entrando y saliendo antes de vencer el plazo y usando habilidades. Los pilotos dentro del hangar deben quedar protegidos.

Prueba cooperativa: entrar con dos dispositivos al mismo modo, volar hacia el jefe, disparar con ambos y comprobar la misma barra de vida. Al derrotarlo, cada uno debe recibir su porcentaje del millón de créditos; reconectar no debe repetir el abono. Verificar también ataques cada 3 s a los dos pilotos con mayor vida actual, retirada hacia la base, reaparición del jefe y compras de hangar mientras llega un premio.

## Cuenta personal y formaciones en vuelo (313)
Servidor en la cuenta personal yairul17. Los mapas normal y de prueba conservan namespaces separados. El servidor anterior queda intacto; sus salas y premios pendientes no se migran. El inventario local se importa al entrar. `WORLD.formationSwitch` anuncia el cambio en vuelo; el servidor valida las formaciones adquiridas y conserva la proporción de casco, energía y recargas.

## Paridad técnica entre normal y pruebas

Los dos modos usan ahora la misma caché del mundo, el mismo ciclo de 10 actualizaciones por segundo y checkpoints SQLite cada cinco segundos, en lugar de escribir todo el mundo por cada mensaje en normal. El límite de envío de snapshots sigue siendo 10 Hz. La entrada y salida de pilotos, los cambios de equipamiento y las recompensas fuerzan el guardado cuando corresponde; las recompensas y su estado del jefe se confirman en una sola transacción antes de enviarlas. Un fallo de transacción conserva los recibos pendientes para reintentar.

El último piloto que sale fuerza un checkpoint y detiene el ciclo. Al reconstruir el objeto se comprueban los sockets que siguen abiertos para no conservar pilotos fantasma como conectados. Los mensajes reanudan el ciclo si el objeto fue reconstruido. Un reinicio abrupto puede retroceder hasta unos cinco segundos de estado transitorio del combate/posición; las recompensas ya confirmadas y los cambios de equipamiento guardados inmediatamente no dependen de ese intervalo. No se añade guardado en nube del progreso offline.

Se conservan como diferencias intencionales el inventario local de pruebas, las ayudas QA, los nombres separados de salas, el interruptor para cerrar pruebas y los enemigos en evaluación. Normal mantiene un Titán del Nexo; pruebas mantiene dos Titanes del Nexo y dos Colosos Pro con sus refuerzos y recompensas. Este cambio no publica automáticamente ese contenido experimental en la partida normal ni transfiere progreso entre modos.

Validación específica: `npm run test:parity`, más `arena-test.mjs` para recompensas, materiales y reconexión tras reiniciar SQLite. En el entorno de validación se utilizó Miniflare 4.20260730.0 y fecha 2026-07-01 por el fallo de descarga de la dependencia alpha; los scripts admiten `COSMOS_MINIFLARE` y `COSMOS_COMPAT_DATE` sin cambiar la configuración desplegada (2026-10-11). Dos pruebas antiguas de expectativas de contenido siguen fallando en main: `cooperative-boss.test.mjs` y `pvp-arena-enemies.test.mjs`; no se alteran sus expectativas para ocultar esos fallos.
