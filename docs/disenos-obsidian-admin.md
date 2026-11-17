# Diseños de Obsidian

El selector de diseños aparece para el administrador verificado por `adminShipAllowed` al aterrizar en cooperativo. Incluye Original, Carmesí, Imperial y diseños de países. Es una prueba visual local durante la sesión: conserva estadísticas, mejoras, geometría, colisiones y protocolo de red. Los demás clientes ven el diseño original.

## Prueba Chile sobre el modelo existente

Se reutilizan ancestral-fighter.glb, ancestral-portal.glb y ancestral-inner-ring.glb. La pintura reconoce el dorado del atlas para convertir bordes y detalles en rojo, y asigna blanco y azul según la orientación de las placas y la zona del casco. Conserva el relieve y el sombreado de las texturas originales. No vuelve a convertir una imagen ni reemplaza los GLB.

Las banderas con estrella se proyectan sobre dos zonas superiores del casco: delantera y trasera. Los segmentos de color de cada aro usan su propio marco local para acompañar el giro. El núcleo, los motores y la estela mantienen energía azul. El acabado Chile reduce reflejos mediante materiales propios; elegir Original restaura los materiales de base.

Esta fase usa máscaras de pintura en el material y conserva las UV existentes. No es un repintado manual de cada isla UV ni un archivo de textura nuevo.

## Comparación visual

Abrir `obsidian-design-preview.html` permite comparar Original y Chile sobre los GLB reales, girar el modelo y seleccionar vista delantera o trasera. La página no lee ni escribe partidas y no concede permisos del juego.

## Validación

Las pruebas cubren autorización, aislamiento y restauración de materiales, conservación de geometría/atlas, uso del marco de cada aro y continuidad de las rotaciones opuestas. La compilación y revisión visual se comprueban por separado.


### Prueba Chile 503
Se hornean tres texturas RGB de 1024×1024 en los UV originales mediante `tools/bake-obsidian-chile.py`. Las zonas de pintura se definen en coordenadas de cada pieza y se elimina la máscara de color dorado que provocaba manchas. Es pintura por zonas geométricas, no un trabajo manual de cada placa. Se conserva el relieve de los mapas originales y no se cambian posiciones, índices ni animaciones. El núcleo tiene bandas emisivas azules sin bloom. La vista de prueba ajusta la cámara al ancho del celular para evitar recortar la nave.

Prueba 504: blanco limitado a placas superiores; cañones y motores azules, escapes oscuros y líneas de energía. Núcleo con filamentos irregulares suaves, visor ampliado y número de prueba visible para identificar caché antigua.

Prueba 505: se recuperan la luminancia completa del atlas, los canales cian en sus UV originales y los mapas de rugosidad/metal originales. El visor reduce el zoom cuando la caja proyectada alcanza el borde. Sigue siendo una prueba procedimental, sin pintura manual de placas.
