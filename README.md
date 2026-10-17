# Mundo Abierto

Juego espacial 3D en desarrollo para navegador y Android. Estado revisado contra el código de la versión `3d-20261012-188`.

## Juego actual

- Vuelo 360° con teclado y controles táctiles, cámara de seguimiento, minimapa y HUD. El juego requiere orientación horizontal.
- Cuatro sectores: Aurora, Cinturón Perdido, Ascuas y Cementerio de Naves. Estaciones con aterrizaje, zonas seguras y portales.
- Combate con láseres, misiles, enemigos normales, Coloso Portanaves y parejas de Catapulta/Arponero.
- Naves jugables Aurora, Titán y Espectro; habilidades, mejoras, drones de combate, explorador y robot reparador.
- Hangar con siete formaciones, venta de materiales y potenciadores temporales.
- Campañas, contratos largos, créditos, experiencia e inventario.
- Guardado local automático y modo QA con partida separada.
- Mapa PvP compartido con ID de invitado, portales desde Aurora (nivel 40) y Cementerio, y combate abierto fuera de la base. Sin pérdidas por PvP; naves y mejoras offline y casco ×20. El Titán del Nexo cooperativo comparte 1.000.000 PV: despierta al atacarlo, golpea cada 3 s a los dos pilotos vulnerables con más vida actual a 1.200 m (daño base 5.000 por piloto, defensas normales), y reaparece 5 min después de morir. Su premio total de 1.000.000 créditos se reparte según daño efectivo, con recibos persistentes por participante y guardado sin duplicados al reconectar. Posición: 0, 120, −1.800; patrulla y se teletransporta cada 20 s en combate, sin cajas ni premio por matar jugadores.

## Ejecutar

La web se sirve desde la raíz del repositorio; abrir mediante un servidor HTTP con soporte de módulos JavaScript. El motor activo es `js/game3d.js`, cargado por `index.html`, con Three.js 0.180.0. `js/game.js` conserva el prototipo 2D y no es el punto de entrada del juego actual.

El navegador obtiene Three.js de un CDN. El APK empaqueta el motor, imágenes y modelos para jugar los cuatro mapas sin internet; el PvP requiere conexión.

## Documentación

- [Naves ensambladas (v211)](docs/naves-ensambladas.md)
- [Enemigos, sectores y economía](docs/wiki-enemigos.md)
- [Experiencia por nivel](docs/progresion-xp.md)
- [Pruebas y comprobaciones manuales](docs/pruebas.md)
- [APK Android y empaquetado](mobile/test-app/README.md)
- [Mapa PvP abierto](server/pvp/README.md)

## Durante el desarrollo

Las estadísticas y precios vigentes están en el código. Al cambiar mapas, enemigos o sistemas, actualizar sus documentos y pruebas en el mismo cambio. Los ejemplos históricos deben identificarse como tales; no confundir la versión del paquete Android/PvP con el identificador de contenido de `version.json`.

