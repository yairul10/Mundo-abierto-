# Comparativa de naves · contenido 314

Implementación publicada en GitHub y servidor PvP. Web desplegada correctamente.

Los valores son multiplicadores sobre las estadísticas base del piloto, con su nivel y mejoras generales. ×1,00 = 100 % de la base. No incluyen formaciones, potenciadores ni efectos temporales. El servidor PvP conserva su factor adicional de casco ×20 y sus límites de estadísticas; estas tablas comparan los coeficientes de cada nave antes de esos ajustes.

## PvE

| Nave | Casco | Ataque | Defensa | Velocidad |
| --- | ---: | ---: | ---: | ---: |
| Aurora | ×1,00 | ×1,00 | ×1,00 | ×1,00 |
| Titán | ×1,80 | ×0,85 | ×1,50 | ×0,75 |
| Espectro | ×0,70 | ×1,35 | ×0,65 | ×1,40 |
| Segadora | ×1,10 | ×1,85 | ×0,95 | ×1,05 |
| Bastión | ×2,50 | ×1,00 | ×2,00 | ×0,85 |
| Centella | ×0,95 | ×1,10 | ×0,85 | ×1,85 |
| Obsidian | ×1,90 | ×1,75 | ×1,60 | ×1,20 |
| Azote | ×0,70 | ×1,45 | ×0,55 | ×0,65 |
| Égida | ×2,10 | ×0,60 | ×1,60 | ×0,45 |
| Vértigo | ×0,55 | ×0,70 | ×0,45 | ×1,45 |

## PvP

| Nave | Casco | Ataque | Defensa | Velocidad |
| --- | ---: | ---: | ---: | ---: |
| Aurora | ×0,50 | ×0,50 | ×0,50 | ×0,50 |
| Titán | ×1,30 | ×0,35 | ×1,00 | ×0,25 |
| Espectro | ×0,20 | ×0,85 | ×0,15 | ×0,90 |
| Segadora | ×0,60 | ×1,35 | ×0,45 | ×0,55 |
| Bastión | ×2,00 | ×0,50 | ×1,50 | ×0,35 |
| Centella | ×0,45 | ×0,60 | ×0,35 | ×1,35 |
| Obsidian | ×2,40 | ×2,25 | ×2,10 | ×1,70 |
| Azote | ×1,20 | ×1,95 | ×1,05 | ×1,15 |
| Égida | ×2,60 | ×1,10 | ×2,10 | ×0,95 |
| Vértigo | ×1,05 | ×1,20 | ×0,95 | ×1,95 |

## Habilidades nativas

Valores sin mejoras de especialización. Furia afecta al disparo principal, no a los misiles ni a los drones. Fortaleza se combina con la reducción pasiva del arquetipo Titán.

| Nave | Habilidad | Efecto | Duración | Energía |
| --- | --- | --- | ---: | ---: |
| Aurora | Sobrecarga | +30 % de cadencia | 5 s | 40 |
| Titán | Fortaleza | −70 % de daño recibido | 6 s | 55 |
| Espectro | Furia | ×1,6 daño principal; +30 % de daño recibido | 5 s | 65 |
| Segadora / Azote | Furia | ×1,7 daño principal; +20 % de daño recibido | 5 s | 65 |
| Bastión / Égida | Fortaleza | −80 % de daño recibido | 6 s | 55 |
| Centella / Vértigo | Sobrecarga | +40 % de cadencia y liberación del arpón; en PvP también elimina parálisis | 5 s | 40 |
| Obsidian | Sobrecarga ancestral | +30 % de cadencia | 5 s | 40 |

Las especializaciones siguen siendo independientes para cada nave. Aurora, Centella, Obsidian y Vértigo comparten el arquetipo de reactor/recuperación; Titán, Bastión y Égida, blindaje/reparación; Espectro, Segadora y Azote, crítico/evasión. Sus mejoras pueden alargar las habilidades. Las seis habilidades equipables del mapa PvP son adicionales y no se modifican.

## Nuevos modelos

| Nave | Archivo aportado | Equivalente PvE |
| --- | --- | --- |
| Azote · ofensiva | spacefighter (3).glb | Segadora |
| Égida · defensiva | spikedspaceship.glb | Bastión |
| Vértigo · ágil | starfighter (1).glb | Centella |

Se ensamblan solo en la base PvP, desde nivel 40, con la misma receta de sus equivalentes: 500.000 créditos, 1.500 chatarra, 450 aleación, 120 núcleos de energía, 30 componentes ancestrales y 100 de cada material especial del cementerio. Se equipan desde el Hangar. No reemplazan ni conceden las naves originales. Tienen +0,1 en cada multiplicador frente a su equivalente PvE y pierden 0,5 en cada multiplicador al usarse en PvE.

## Validación

36 archivos de pruebas pasan, incluyendo ensamblaje por zona, habilidades, limpieza de parálisis, propiedad, guardados, viajes repetidos entre entornos y coeficientes de las diez naves. Los tres GLB optimizados se cargaron y renderizaron localmente con sus texturas. Código publicado del servidor verificado: reconoce Azote, Égida y Vértigo con sus estadísticas y arquetipos. La prueba visual dentro del juego en navegador queda pendiente.
