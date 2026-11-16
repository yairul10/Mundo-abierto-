# AUTO y repetición cooperativa

- Inferno figura como objetivo seleccionable del AUTO PvE en el Cementerio.
  Las selecciones guardadas anteriormente se conservan sin añadir objetivos que
  el usuario no había elegido.
- AUTO PRO sigue restringido a las cuentas autorizadas por el servidor. Puede
  acercarse a los NPC fuera del rango de detalle gráfico: la ocultación visual
  por rendimiento ya no elimina sus objetivos de navegación. El combate sigue
  comprobando zona, distancia y permisos, y no modifica daño/recompensas.
- «Ajustar AUTO» permite repetir en una privada nueva después de tres Colosos,
  Inferno Pro, Gran Titán Pro o el mapa completo. Los puntos intermedios exigen
  que todos los jefes anteriores estén realmente muertos en el snapshot del
  servidor; no se deduce por posición, visibilidad ni recompensa local.
- Solo el piloto automático cambia de sala. Una partida común conserva su avance
  para el resto del grupo; no se reinicia al entrar/salir un jugador. Crear una
  privada solicita una instancia nueva. Al finalizar una común, el emparejamiento
  puede crear otra común si no queda una abierta disponible.
- Antes de repetir se intenta sincronizar el progreso (espera máxima de 2,5 s).
  Los premios siguen usando recibos locales/servidor y su recuperación pendiente
  al entrar en otra sala. Un fallo conocido del guardado de premios bloquea la
  repetición. No se borran ni fusionan partidas de nube.
- La reanudación utiliza una marca de sesión de un solo uso, ligada a cuenta y
  entorno, que caduca a los 90 segundos y solo se acepta al crear una privada.
  La autorización AUTO PRO vuelve a comprobarse después de conectar. No se
  reactiva por una recarga ordinaria ni en otra cuenta.
- Control manual, pérdida de foco y agotamiento de las vidas detienen AUTO.
  Abrir sus ajustes lo detiene; «Guardar e iniciar» lo activa expresamente.
  No reinicia arenas, duelos ni guerras de clanes. Si una reconexión o carga tarda
  más que la marca de reanudación, el jugador debe iniciar AUTO manualmente.

Validación: decisiones del piloto y checkpoints, orden de sincronización/salida,
solicitud de privada nueva, autorización de cuenta/entorno/expiración, cancelación
manual y errores de almacenamiento. Pendiente probar ciclos completos en la
app, incluyendo recibos de recompensa tardíos y reconexiones reales. No requiere
cambiar ni desplegar el servidor; usa las rutas existentes de crear privada.
