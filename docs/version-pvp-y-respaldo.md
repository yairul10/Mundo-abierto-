# Compatibilidad PvP y estado del respaldo — contenido 333

La configuración pública /game-config anuncia minPvpClientVersion. El cliente comprueba ese valor antes de cruzar el portal y al conectar; el servidor verifica clientVersion al solicitar el ticket, antes de acceder a la sala. Un valor ausente, inválido o anterior al mínimo recibe HTTP 426 con update_required. El mínimo controla compatibilidad de protocolo: no se fuerza actualizar por cada ajuste cosmético y no demuestra la integridad del binario.

El cliente compatible muestra un diálogo de actualización con acceso a Google Play y opción de seguir en PvE. Las APK anteriores que no incluyen este diálogo no pueden mostrarlo retroactivamente; el servidor sí rechaza su entrada. Durante las pruebas, instalar desde GitHub Actions si el nuevo AAB aún no está publicado en Google Play. No borrar datos ni desinstalar para actualizar.

Cuenta y guardado en la nube muestra el resultado real de sincronizar: respaldo confirmado al recibir stored, sin cambios pendientes, error de conexión o pausa. Un login Google para PvP autentica al piloto pero no activa el respaldo de una sesión PvE elegida como invitado. El servidor guarda el progreso propio en Cloudflare/D1 asociado a la identidad de Google Play, no en el servicio Saved Games de Google.

Modo de pruebas/QA usa un guardado distinto y no sincroniza la partida normal. Un conflicto o una sesión vencida pausa las escrituras; los errores de red conservan el progreso local y se reintentan periódicamente y al recuperar conexión. Si la nube contiene menos avance, elegir conservar el dispositivo y comprobar el mensaje de respaldo confirmado antes de borrar datos o cambiar de teléfono.

Pruebas: rechazos de cliente sin versión, versión inválida/obsoleta, aceptación de versión compatible, configuración pública y rechazo antes de autenticar/abrir sala. La nueva comprobación no cambia el inventario, las recetas ni las recompensas.
