# Guerras de clanes organizadas por el administrador

Un evento abierto por entorno a la vez, categoría 2v2 o 5v5, hasta 32 clanes.
El administrador abre las inscripciones desde Clanes → Guerras y elige categoría.
Líder u oficial inscribe exactamente 2 o 5 miembros del mismo clan (sin suplentes).
Puede actualizar/retirar la lista mientras la inscripción permanezca abierta.
El admin pulsa Sortear e iniciar: emparejamiento aleatorio y 5 minutos de aviso.
Un clan impar queda sin rival y no recibe victoria. Si vuelve al próximo evento,
se evita dejarlo otra vez como el clan impar cuando hay otros candidatos.
No hay calendario automático, créditos, apuestas ni puntos de misiones por guerras.

Autenticación: Google Play obligatorio. Autoridad admin desde CHAT_ADMIN_IDS,
aceptando ID de cuenta o el ID de piloto derivado que ya utiliza la moderación.
El cliente no puede otorgarse permisos mediante el cuerpo de la petición.
GET /wars/status consulta el evento/historial; POST /wars/status comunica presencia.
POST /wars/action admite open/register/withdraw/start/cancel. Solo admin inicia;
solo líder/oficial registra, y todos los seleccionados deben ser miembros del clan.
POST /wars/join genera ticket solo para el participante asignado por el servidor.
Los perfiles/equipamiento siguen la validación de PvP y no admiten nave admin.
Los códigos y las listas completas de cuenta no se exponen a otros equipos.

Actividad: app visible y alguna entrada de usuario en los últimos 90 segundos;
latidos cada 5 segundos, conexión caducada tras 25 segundos sin latido.
El servidor congela la presencia al vencer los cinco minutos y revalida membresías.
Entran los activos, aunque queden 1v2 o 3v5. Un equipo sin activos pierde por ausencia;
ambos ausentes anulan el encuentro, sin ganador. No se usan bots ni botón Listo.
El mapa da hasta 45 segundos para cargar a los participantes seleccionados.
Después hay 5 segundos de protección; no entran inscritos tardíos tras empezar.
Los equipos están fijados por clan, independientemente del orden de conexión.

Formato: mejor de tres rondas; restablece casco, escudo y habilidades cada ronda.
Ronda: máximo 5 minutos, desempate por vivos y después fracción total casco+escudo.
Los empates se repiten. Límite global de evento: 30 minutos; sin ganador al vencerlo.
Si alguien pierde conexión se conservan los 20 segundos de reconexión de PvP.
Entre rondas se retiran ausentes vencidos y siguen los restantes si ambos clanes
siguen presentes. La retirada de todo un equipo termina por abandono/desconexión.
El resultado se conserva en historial (últimos 20 eventos; UI consulta últimos 10).

El coordinador usa una instancia del namespace LOBBIES, separada por entorno.
ArenaLobby hereda ClanWarLobby y conserva todos los métodos de CoopLobby.
La alarma persistente realiza el inicio y recoge resultados aun sin paneles abiertos;
se reprograma tras fallos, y configurar la sala es idempotente para el mismo roster.
Las arenas usan ROOMS y las funciones de combate existentes. No hay tabla D1 nueva.

El aviso llega dentro del juego a los 5 minutos, 1 minuto y 10 segundos. Inscritos
no pueden abrir otra arena/expedición durante la cuenta atrás. El progreso local se
guarda antes del traslado; el personaje sale de su conexión anterior y entra a la
arena asignada. Al terminar vuelve automáticamente tras 8 segundos o con el botón.
Se restaura la URL previa cooperativa/PvE; si venía de una arena normal que ya pudo
terminar, vuelve al mapa PvE guardado. Si una expedición anterior ya no admite entrar,
se conserva su recuperación/recompensas y se puede volver al PvE desde el botón normal.
La marca de salida evita que el aviso vuelva a trasladar a quien abandonó la guerra.
Los jugadores sin esta compilación no envían presencia y se consideran ausentes.

Validación: node --test tests/clan-wars*.test.mjs
Runtime: node server/clan-wars/runtime-test.mjs (Miniflare, D1 y DO SQLite reales).
Las rutas /fixture de ese test solo existen en su módulo temporal de pruebas.
