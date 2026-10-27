# PvP: zonas, duelos, rescates y clasificaciones

Contenido **335**, Android **1.1.9 (357)**, protocolo PvP **2**. Se aplica a la partida normal y al servidor de pruebas, con progreso, resultados y clasificaciones separados por servidor.

## Mapa

Las distancias son horizontales desde el centro de la base. El límite exterior del mapa queda en 2.950 m.

| Radio | Zona | Reglas |
| --- | --- | --- |
| 0–650 m | Base | Sin combate, salvo los participantes de un duelo ya aceptado. No se puede abrir el hangar durante el duelo. |
| Más de 650–1.800 m | PvE | Los NPC y los pilotos se dañan entre sí. Otros jugadores no pueden dañarte salvo duelo aceptado. |
| Más de 1.800–2.950 m | Hostil | Combate libre entre jugadores y contra el Titán del Nexo. |

Dos franjas de combate de 1.150 m de ancho. Los límites aparecen como circunferencias y membranas suaves en el mundo y en el minimapa. La interfaz identifica la zona actual. Los NPC se mantienen en su franja y el servidor cancela proyectiles que crucen sus límites.

## Enemigos

- **Zona PvE:** dos Colosos Pro (200.000 PV) y un **Gran Titán Pro** (368.000 PV). El Gran Titán usa su propio modelo, puertas y motores, con ataques guiados autoritativos contra hasta dos pilotos, 75.900 créditos y un fondo de 113.850 XP por daño efectivo. Se neutraliza al recuperar toda su vida. Los tres mejores contribuidores reciben 3 núcleos; los Colosos conservan 1 y sus oleadas limitadas.
- **Zona hostil:** un **Titán del Nexo** de 1.000.000 PV, con su patrulla y teletransporte acotados a esta zona, 1.100.000 créditos repartidos por daño y 3 núcleos para los tres mejores contribuidores.
- Los jefes reaparecen a los cinco minutos. Los recibos de créditos, XP y materiales mantienen su deduplicación y persistencia SQLite. Los premios pendientes no se borran al cambiar la distribución del mapa.

## Duelo voluntario

Se solicita seleccionando otro piloto en la zona PvE, a un máximo de 1.200 m. Requiere aceptación y ocho segundos sin combate por ambos participantes. Hay una cuenta regresiva de tres segundos, solicitudes de veinte segundos y un intervalo de treinta segundos entre solicitudes. Se pueden rechazar y bloquear las solicitudes desde el control de duelos.

Los participantes quedan aislados del daño de terceros y de NPC. Al entrar en la base siguen siendo vulnerables exclusivamente a su rival. No pueden atracar. El duelo termina por destrucción, rendición, desconexión o salida hacia la zona hostil; ambos regresan a base con casco y energía restaurados. No hay cobro, pérdidas, XP, núcleos ni puntos de clasificación.

## Destrucción y rescate

Tanto en PvE como en zona hostil se elige entre:

- **Aurora:** hasta 1.000 créditos; se cobra solo el saldo disponible si es inferior, incluso cero.
- **Base PvP:** exactamente 5.000 créditos; no está disponible con menos saldo. Requiere poder verificar la cuenta y la versión PvP antes de cobrar desde PvE.

Al morir en PvP, el servidor conserva la muerte pendiente, incluso al reconectar. Emite un recibo de rescate inmutable y espera confirmación de la escritura local antes de restaurar la nave. El cliente guarda el débito y el identificador juntos y nunca vuelve a cobrar el mismo recibo. Un traslado desde PvE se confirma solo al recibir la entrada efectiva al mapa; si no se completa, se devuelve una sola vez el cobro y se conserva la elección de rescate. Una muerte pendiente se recuerda en el dispositivo para continuar la elección al reabrir la app, sin salir del combate mediante el portal.

La economía y el equipo siguen siendo locales con respaldo en nube: **el saldo, nivel y equipamiento importados aún no constituyen una economía completamente autoritativa ni un sistema antitrampas completo**. Las bajas, el daño simulado, los límites por rival y los contadores de clasificación sí se resuelven en servidor. No se manipulan partidas de producción para probar estas funciones.

## Premios y tops

Solo una baja de jugador en zona hostil, fuera de duelo, puede premiarse.

- Ganador menor de nivel 200: víctima de al menos el 60 % de su nivel, redondeando hacia arriba.
- Ganador de nivel 200 o superior: víctima de nivel 150 o superior, independientemente del nivel del ganador.
- Hasta tres bajas premiadas por pareja **ganador/víctima** en una ventana móvil de cinco horas. No hay límite diario global.
- Premio: XP equivalente al 1 % de la XP necesaria para el nivel actual del ganador, redondeada al entero más cercano. No entrega créditos ni núcleos por matar jugadores.

**Top de bajas válidas** y **top de XP PvP** muestran los primeros 50 y tu posición, aunque quedes fuera. No cuentan XP de misiones, de enemigos ni de duelos. El resultado, los contadores, el recibo de XP y el estado se escriben en una misma transacción SQLite. Las pruebas usan la misma lógica y almacenan sus propios tops.

## Validación

Pruebas de fronteras, proyectiles, niveles 199/200, 60 % con redondeo, límite de tres bajas y expiración exacta de cinco horas, duelos en base e inmunidad a terceros/NPC, rechazo de hangar durante duelo, cobros, cuota de almacenamiento, reintentos, subida de nivel por XP y fallo/rollback transaccional. Recorridos reales con WebSockets y SQLite validan muerte, menú de rescate, reconexión, recibos y clasificaciones; otra prueba cubre ambos mundos y sus NPC compartidos.
