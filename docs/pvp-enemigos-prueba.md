# Enemigos compartidos de PvP · prueba 329

Disponible únicamente en `realm=test`. La partida normal conserva su Titán del Nexo y su recompensa actual.

## Población inicial

- Dos Titanes del Nexo separados al norte: 1.000.000 PV cada uno, descarga total 34.500 cada 3 segundos repartida entre hasta tres pilotos elegibles. Recompensa total de cada jefe: 1.100.000 créditos.
- Dos Colosos Pro separados al sur: 200.000 PV, misil guiado de daño base 750 cada 5 segundos. Recompensa total de cada uno: 55.000 créditos y 66 materiales básicos aleatorios.
- Los valores del Coloso Pro toman el Coloso PvE de nivel 105: factor 2,5 y multiplicador Pro 2. Los créditos y los materiales agregan 10 %. Los materiales conservan probabilidades 53/28/15/4 para chatarra/aleación/núcleo/reliquia.
- Oleadas de dos refuerzos al alcanzar 70 %, 40 % y 10 % de vida: asaltantes, guardianes y destructores. Máximo seis por Coloso durante todo el combate. Cada refuerzo reparte 220 créditos; no entrega puntos ni materiales. Los supervivientes desaparecen al morir su Coloso.
- Todos los jefes son neutrales hasta recibir daño. Los refuerzos atacan a los participantes de su propio Coloso, permanecen cerca de él y respetan la base protegida. Los NPC no se dañan entre sí.
- Reaparición de jefes a los 5 minutos. Cada ronda usa un identificador diferente.

## Sincronización y premios

El servidor simula y publica las pruebas a 10 Hz. Cada jefe tiene vida, ronda, objetivos, ataques y contribuciones independientes. Se guarda un punto de recuperación cada 5 segundos, además de entradas, salidas y cambios de equipamiento. Ante un reinicio inesperado puede recuperarse hasta 5 segundos de estado de combate anterior.

Las bajas con premio escriben atómicamente el estado y los recibos en SQLite antes de entregarlos. Créditos y materiales se reparten por daño real; no por último impacto. El cliente guarda botín e identificadores juntos antes del ACK. Una reconexión o reinicio reenvía recibos pendientes sin duplicar premios ya aplicados.

## Pruebas

- `tests/pvp-arena-enemies.test.mjs`: aislamiento normal/pruebas, cuatro jefes, oleadas limitadas, premios/materiales, base segura, guiado y colisión autoritativa de misiles y ausencia de fuego amigo.
- `server/pvp/arena-test.mjs`: dos clientes WebSocket, misma vida, refuerzos, premios y repetición exacta del recibo después de reiniciar SQLite/servidor.
- `server/pvp/test.mjs`: regresión de combate, hangar y premios del mapa normal.
- Carga local de los GLB con Three.js: dos Nexo, dos Colosos con ocho puertas y modelos de refuerzos.

Probar desde la web seleccionando Servidor de prueba y entrando por el portal PvP. Recargar para obtener el contenido 329. No se incorporan aún puntos PvP, grupos, chat ni clanes.
