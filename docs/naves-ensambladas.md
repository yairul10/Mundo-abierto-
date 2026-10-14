# Naves ensambladas · v209

La flota conserva Aurora, Titán y Espectro. Desde nivel 40 se añaden tres naves permanentes: Segadora (roja), Bastión (azul) y Centella (turquesa). El jugador puede ensamblar las tres, en cualquier orden, desde Hangar → Ensamblaje. Cada una descuenta su propia receta una sola vez y puede volver a equiparse sin costo.

| Nave | Casco | Ataque | Defensa | Velocidad | Habilidad |
| --- | ---: | ---: | ---: | ---: | --- |
| Segadora | ×1,10 | ×1,85 | ×0,95 | ×1,05 | Furia: ×1,6 daño principal, ×1,3 daño recibido durante 5 s; 65 energía |
| Bastión | ×2,50 | ×1,00 | ×2,00 | ×0,85 | Fortaleza: −70 % daño durante 6 s; 55 energía |
| Centella | ×0,95 | ×1,10 | ×0,85 | ×1,85 | Sobrecarga: +30 % cadencia durante 5 s; 40 energía |

Multiplicadores sobre las estadísticas base del jugador, incluyendo sus mejoras y nivel. Se conserva el porcentaje de casco al cambiar; los bonos anteriores se reemplazan, no se acumulan. Segadora y Bastión reutilizan las especializaciones de Espectro y Titán; Centella reutiliza las de Aurora, con niveles de mejora propios para cada nave.

Cada receta pide nivel 40, 350000 créditos, 1500 Chatarra, 450 Aleación, 120 Núcleos y 30 Componentes ancestrales, además de:

| Nave | Núcleos de demolición | Bobinas de anclaje | Cristales de puntería |
| --- | ---: | ---: | ---: |
| Segadora | 100 | 100 | 100 |
| Bastión | 100 | 100 | 100 |
| Centella | 100 | 100 | 100 |

Las probabilidades de botín especial siguen siendo 25 % Catapulta, 25 % Arponero y 20 % Acechador. Los materiales deben recogerse. La receta y sus cantidades aparecen en el hangar junto al inventario disponible.

Los modelos completos aportados por el usuario están centrados, normalizados y orientados hacia el mismo eje de disparo. Texturas WebP de hasta 1024 px; Segadora tiene además simplificación geométrica. Se cargan solo cuando se necesitan para el jugador o rival. No contienen piezas articuladas separadas: esta versión no anima pinzas ni añade corte automático del arpón.

El APK incluye los tres modelos; el modo individual funciona offline. El servidor PvP reconoce las seis identidades y valida las habilidades según su arquetipo. Las compras y el ensamblaje permanecen en el guardado individual.

Pruebas: `node --test tests/*.test.mjs server/pvp/combat.test.mjs`, integración HTTP/WebSocket del servidor y carga de los modelos en navegador con WebGL.
