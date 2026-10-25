# Asignación de los nuevos modelos PvP

Asignación confirmada por el usuario el 25 de octubre de 2026. Los números
corresponden a la lámina `naves-comparacion.jpg` mostrada en la conversación.

| Número | Archivo aportado | Modelo en el repositorio | Versión PvP de | Función |
| --- | --- | --- | --- | --- |
| 2 | spacefighter (3).glb | assets/models/pvp-ofensiva.glb | Segadora | Ofensiva |
| 3 | starfighter (1).glb | assets/models/pvp-agil.glb | Centella | Ágil |
| Nueva | spikedspaceship.glb | assets/models/pvp-defensiva.glb | Bastión | Defensiva |

El modelo número 1 (`spaceship (9).glb`, gris y rojo con puntas largas) fue
rechazado para esta flota. No incorporarlo como la defensiva. La asignación
anterior de Spacefighter a defensiva queda reemplazada por esta decisión.

## Estadísticas acordadas

Las nuevas naves suman 0,1 puntos a cada multiplicador de su equivalente PvE.
Conservan esos valores completos en PvP. Al entrar a PvE se restan 0,5 puntos
a cada multiplicador; no se aplica esa reducción al entrar a PvP.
Solo se ensamblan en la base PvP y conviven con las naves originales.

| Modelo | Entorno | Casco | Ataque | Defensa | Velocidad |
| --- | --- | ---: | ---: | ---: | ---: |
| Ofensiva (2) | PvP | 1,20 | 1,95 | 1,05 | 1,15 |
| Ofensiva (2) | PvE | 0,70 | 1,45 | 0,55 | 0,65 |
| Ágil (3) | PvP | 1,05 | 1,20 | 0,95 | 1,95 |
| Ágil (3) | PvE | 0,55 | 0,70 | 0,45 | 1,45 |

## Estado

Integración publicada en el contenido 314: Azote (ofensiva), Égida (defensiva)
y Vértigo (ágil), con catálogo, miniaturas, ensamblaje PvP, habilidades,
identidades del servidor y balance separado por entorno. Modelos con texturas
PNG de hasta 1024 px; geometría conservada. Cada nave utiliza la misma receta
de su equivalente PvE. `spaceship (10).glb` tampoco se utiliza: el usuario
eligió finalmente `spikedspaceship.glb` para la defensiva.

GitHub y servidor PvP publicados. Web desplegada correctamente. Pendiente comprobar las naves
dentro del juego. Consulta `comparativa-naves.md` para la tabla completa.
