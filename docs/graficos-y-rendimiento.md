# Gráficos y rendimiento (v229)

El menú ☰ de la nave incluye Gráficos: Automática, Baja, Media y Alta.
La elección se guarda en `mundoAbierto.graphics`, fuera de los guardados de pilotos.
Los cambios se aplican sin reiniciar la partida. Funciona en web y en el paquete Android offline.

| Calidad | DPR máximo | Píxeles máximos | Restos pequeños | Anillos/cascos | Chispas por explosión |
|---|---:|---:|---:|---:|---:|
| Baja | 0,75 | 1.000.000 | 1.300 m | 2.600 m | 3 |
| Media | 1 | 1.800.000 | 2.300 m | 3.900 m | 6 |
| Alta | 1,6 | 3.500.000 | 4.500 m | 6.500 m | 10 |

Baja y Media desactivan las dos luces dinámicas del motor Aurora. Los indicadores
de peligro, proyectiles, enemigos, daño, misiones y controles no dependen de la calidad.
MSAA está desactivado para evitar multiplicar la memoria del framebuffer.
Los restos se ocultan por distancia; esto reduce triángulos dibujados, pero no libera
los modelos ya cargados de memoria. Se mantienen recursos compartidos entre copias.

Automática empieza en Media. Tras ocho segundos de calentamiento, evalúa ventanas
de tres segundos: baja un escalón con dos ventanas por debajo de 38 FPS; sube con
30 segundos sostenidos por encima de 56 FPS. Respeta pausas de 15/30 segundos
entre ajustes. No evalúa pestañas ocultas, orientación bloqueada, menús ni carga de modelos.
Una recuperación WebGL reciente arranca en Baja, sin sobrescribir la preferencia.

La cola carga y monta un GLB secundario a la vez. Los modelos exclusivos del
Cementerio y los del Coloso/luna esperan a que su sector esté activo; los pendientes
no impiden cargar los recursos compartidos. No se descargan otra vez al volver al mapa.

Los dos grandes cascos destruidos conservan geometría, UV, materiales y colocación.
Sus cuatro texturas pasan de 2048 a 1024 px. Los archivos juntos pasan de
28.066.912 a 15.705.484 bytes (44% menos); los píxeles de estas texturas se reducen un 75%.
`tools/optimize-wreck-textures.py` permite reproducir el proceso desde los originales.

## Validación

- `node --test tests/*.test.mjs server/pvp/combat.test.mjs server/pvp/world-rules.test.mjs`
- `npm ci` y `npm run web:offline` en `mobile/test-app`.
- En un teléfono: comparar Baja/Media/Alta en el Cementerio y en el combate con
  Gran Titán, usando la Segadora; viajar a Aurora y regresar varias veces.
- Confirmar persistencia tras cerrar/reabrir, funcionamiento offline, legibilidad de
  ataques, y ausencia de pérdidas WebGL. Las pruebas automatizadas no sustituyen
  la medición de FPS/memoria en el dispositivo que mostró el fallo.
