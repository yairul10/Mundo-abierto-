# Prueba de diseños de Obsidian

En la base PvP, el administrador verificado por `adminShipAllowed` ve el selector Original / Carmesí / Imperial en la pantalla inicial de servicios. Cada botón abre una vista 3D y selecciona el diseño de vuelo para la Obsidian durante la sesión. No concede la nave, modifica estadísticas, escribe el guardado ni añade campos al protocolo PvP. Los jugadores normales no ven el selector. En esta fase los otros clientes siguen viendo el diseño original.

Las máscaras suaves del shader distinguen el turquesa y el dorado del atlas para recolorear energía y detalles conservando iluminación, metal, rugosidad y normales. El casco se oscurece. Núcleo, motores y estela se recolorean por separado. Los materiales son propios del modelo local; los clones remotos recuperan materiales y colores originales. Original restaura los recursos de base. No hay nuevas texturas ni modelos por diseño.

Validación: pruebas de autorización y restauración de materiales; renderizado con Three.js 0.180.0 de los tres diseños sobre los GLB reales sin errores de shader. Las máscaras son una primera aproximación por color, no un acabado manual de cada isla UV. Próxima fase posible: refinar máscaras y definir disponibilidad, persistencia por cuenta y visibilidad para otros jugadores.
