# Optimización sin pérdida · contenido 327

- 12 modelos, 24 texturas PNG RGB de 8 bits convertidas a WebP sin pérdida. Se verificó igualdad de resolución y píxeles y se compararon todos los bufferViews de geometría byte por byte. Ahorro de archivos: 6.075.548 bytes.
- 5 recursos reemplazados/sin referencias de ejecución excluidos de Android, conservando los originales en git: 7.531.355 bytes. Lista en `mobile/test-app/package-assets.mjs`.
- Three.js 0.180: se empaquetan el módulo WebGL, su núcleo, GLTFLoader y BufferGeometryUtils, con licencia. Se resuelven sus importaciones y reexportaciones. Motor: 23.198.868 → 2.156.846 bytes.
- Reducción total de contenido sin comprimir: 34.648.925 bytes. El ahorro en APK/AAB y en Google Play es diferente por su compresión y distribución.
- No se modificaron mallas, resolución de texturas, sonidos ni estadísticas de juego. Se conservaron Android 1.1.6 y versionCode 354.

## Validación

`node mobile/test-app/prepare-offline.mjs` verifica las referencias explícitas y los modelos autocontenidos. El paquete incluye 50 modelos y los 4 módulos del motor. `tests/offline-packaging.test.mjs` verifica dependencias transitivas, comentarios/cadenas, exclusiones y conservación de fuentes. Los 12 GLB modificados se cargaron con GLTFLoader 0.180 y se decodificaron sus 27 imágenes incrustadas.

`tools/optimize-lossless-textures.py` permite repetir la conversión. Requiere Pillow; solo utiliza codificaciones menores y rechaza imágenes de mayor profundidad o con perfil ICC. No requiere decodificadores nuevos: el juego ya utiliza EXT_texture_webp.
