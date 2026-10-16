# PvP abierto · Cosmos Legacy

Contenido 256, Worker 0.4.0. Servidor: https://mundo-abierto-pvp.jairog940.workers.dev. Independiente de Gallina Cósmica.

## Mapa y protección

Radio total de 3.000 m. Se conserva la estación existente y su base protegida de 650 m. Fuera de la base todos los pilotos vulnerables pueden atacarse, sin invitaciones, desafíos, equipos ni duelos privados.

Una nave recién aparecida en la base está protegida. Salir elimina inmediatamente esa protección. Al volver a cruzar hacia dentro empieza un intervalo fijo de 5.000 ms: durante él puede causar y recibir daño. Ni disparar, recibir impactos, usar habilidades ni mandar mensajes reinician el intervalo. Salir antes lo cancela; la siguiente entrada inicia uno nuevo. Al vencer el plazo se bloquean tanto el daño recibido como el causado, incluyendo proyectiles ya lanzados. El servidor conserva el instante de entrada en SQLite; el cliente recibe únicamente el indicador `protected`, sin fecha límite ni conteo de protección en pantalla.

El hangar, los cambios de nave y la selección de habilidades requieren estar dentro de la base y haber recuperado la protección. El aterrizaje mantiene las plataformas y la aproximación existentes. Nadie puede usar el hangar para anticipar esos cinco segundos.

Al destruir una nave solo esa nave reaparece con casco y energía completos en la base. El atacante permanece donde estaba y conserva su vida. No hay créditos, XP, botín, premios ni pérdidas por combatir. Las compras y el ensamblaje dentro del hangar siguen usando el inventario offline real y su editor separado.

## Equipo y combate

Se importan únicamente las naves poseídas, estadísticas y mejoras offline, drones, formación, mascota, robot reparador y especializaciones. El casco PvP es exactamente ×20 del casco offline, incluida Fortaleza, y nunca se vuelve a multiplicar sobre un perfil PvP. El daño, la defensa, la velocidad y la energía no se multiplican. Las reparaciones porcentuales usan ese máximo.

Los disparos recorren físicamente el mapa y chocan con el primer enemigo vulnerable en su trayectoria. Los misiles usan el objetivo indicado y validado por el servidor. Interferencia solo afecta a ese objetivo, no bloquea globalmente las armas porque otro piloto la tenga activa. Paralizado exige seleccionar un objetivo vulnerable a menos de 1.200 m. Las seis habilidades mantienen sus efectos y recargas. El servidor controla posiciones, energía, límites de ráfaga, cadencias, críticos, trayectorias y daño.

## Acceso y conexión

Hay portales desde Cementerio y desde Aurora (este último aparece a nivel 40). La vuelta conserva el mapa y la posición offline guardados. Se mantiene el ID de invitado, tickets temporales, reconexión y capacidad de 24 conexiones por mundo, sin crear mapas extra silenciosamente.

Los modos normal y pruebas usan objetos distintos (`shared-cemetery-v1` y `shared-cemetery-test-v1`). `TEST_SERVER_ENABLED=false` permite desactivar solo las pruebas. No se muestran ni se persisten claves de invitado en snapshots; los tokens nunca se publican.

`SharedWorld` sigue usando SQLite y WebSockets con hibernación. La simulación avanza con entradas y alarmas existentes; no se añade un bucle permanente. Se mantienen los bindings y exports `ArenaRoom` y `ArenaLobby`, sin eliminar namespaces ni almacenamiento. Las invitaciones de clientes antiguos se rechazan con `open_pvp`.

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
