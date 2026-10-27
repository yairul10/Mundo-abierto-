# Misiones unificadas · v218

El botón de misiones abre una sola lista desplazable. Desaparecen las pestañas Aurora/Cinturón/Ascuas/Contratos y los botones Aceptar/Cancelar. Todas las misiones desbloqueadas progresan automáticamente en paralelo; al completarse entregan su premio una sola vez y dejan de aparecer. Se indica el próximo nivel de desbloqueo.

El guardado `quests.board` migra las campañas antiguas (misiones completadas por índice, progreso y banderas de visita/borde) y los contratos completados o activos, sin repetir premios ni borrar los datos originales. La migración solo ocurre una vez. Se respetan las restricciones por sector y no se cuentan bajas para misiones aún bloqueadas.

Campañas disponibles desde nivel 1, 10 y 30; contratos anteriores desde 8/15/40 según sector. Ya no exigen completar diez Colosos para acceder al Cementerio.

Se añaden nueve objetivos del Cementerio: llegada, aterrizaje, 40 cajas, exploración del borde y cinco contratos largos:

| Nivel | Objetivo | Créditos | XP |
| --- | --- | ---: | ---: |
| 40 | 80 Catapultas | 200000 | 30000 |
| 45 | 100 Arponeros | 250000 | 40000 |
| 50 | 80 Acechadores | 250000 | 40000 |
| 55 | 150 Catapultas, 150 Arponeros, 100 Acechadores | 500000 | 80000 |
| 60 | 5 Grandes Titanes | 300000 | 100000 |

Los cinco premios suman 1500000 créditos, más los créditos/recursos propios de cada enemigo. Son contratos únicos, no repetibles; objetivos paralelos pueden contar una misma baja. Se conservan los contratos anteriores de recuperación y del primer Gran Titán.

Centella rompe un arpón activo al activar Sobrecarga con energía suficiente (40). Permite escapar de Arponeros y Gran Titán y conserva +40% de cadencia; la inmunidad posterior de 5 segundos se comparte con el sistema existente. No cambia Fortaleza de Bastión ni Furia de Segadora.

Validación: pruebas de migración, persistencia, premios únicos, restricciones de nivel/sector, objetivos especiales, presupuesto de premios y habilidad. Navegador WebGL: arranque, lista sin pestañas, tarjetas completadas ocultas, desbloqueo por nivel, progreso migrado y liberación de Centella con comprobación de energía. Vista móvil 844 × 390 revisada.
