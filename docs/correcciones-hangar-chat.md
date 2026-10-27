# Hangar, identidad y chat — contenido 334 / Android 1.1.8 (356)

- El catálogo de materiales del ensamblaje incluye el núcleo del Nexo. Antes, una receta PvP sin desbloquear lanzaba una excepción al dibujarla; la tienda compartía esa actualización y podía quedar vacía. Cada sección dibuja ahora su contenido al abrirse y los materiales nuevos tienen una presentación de respaldo.
- Las naves Azote, Égida y Vértigo conservan 50 núcleos; Obsidian conserva 750. No cambia ningún coste ni se regalan materiales. El ensamblaje descuenta una sola vez y no equipa automáticamente.
- El apodo de entrada a PvP procede del perfil recibido al verificar la sesión de Google Play, en lugar del apodo local «Invitado». La sesión y el perfil se descartan juntos al reconectar tras una autorización inválida. No se modifica el guardado por cambiar el nombre visible.
- Las condiciones del chat desaparecen al aceptarlas. Se pueden consultar otra vez desde ⚙. Los mensajes tienen fondo transparente; las opciones de reportar y bloquear están en ⋯ junto al mensaje.
- El botón ⠿ mueve el chat y la esquina ◢ cambia su tamaño, con soporte de puntero y flechas del teclado. Tamaño, posición y tamaño de letra se guardan en este dispositivo y se ajustan a la pantalla al rotarla. Idioma, traducción, ID y administración están en ⚙.
- La cuenta administradora permanece en `c357c00c8b9bbe2d04d2ecd8`, correspondiente a yairulbosss (tres «s»). yairulboss (dos «s») es otra identidad y no obtiene permisos. La clave continúa siendo un secreto de Cloudflare y no se incluye en la app.

Validación: pruebas de todas las recetas, posiciones del chat y perfil verificado; recorrido del DOM con compras de las cuatro naves PvP, débitos exactos, límites por base, categorías de tienda, aceptación de condiciones, bloqueo, movimiento/tamaño persistentes e interfaz de administración. La autenticación real de Play Games y la entrada de la clave se verifican desde Android.
