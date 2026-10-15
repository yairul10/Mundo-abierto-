# Gran Titán · v216

Jefe offline del Cementerio de Naves (nivel 40), situado a 2300 m al este y 1900 m al norte del centro del sector, altura 120 m. Usa el barco aportado por el jugador, optimizado de 7.004.940 a 1.431.768 bytes conservando sus 39.998 triángulos.

Ocho compuertas independientes: dos lanzadores de lanzas y dos de bombas por costado. Apertura superior seguida de extensión, disparo y retracción. Se dispara por el costado más próximo al jugador. Las piezas se crean con código y no requieren Blender.

## Combate

- Alcance de activación: el mismo COMBAT_RANGE del jugador (1200 m). No ataca al atracar, aterrizar o entrar en zona segura.
- Ciclo de 8 s: aviso mediante apertura, disparo a los 2,5 s, cierre tras los 4 s. Alterna lanzas y bombas.
- Seis lanzas a 570 m/s: siete posibles trayectorias con una vía central libre que cambia por ráfaga. Colisión de segmentos para evitar atravesar al jugador entre fotogramas.
- Cuatro bombas por ataque, con esferas de aviso de radio 125 m y detonación a los 3,5 s; objetivos fijados al disparar.
- Refuerzos: una Catapulta, un Arponero y un Acechador tras 12 s de combate y cada 30 s después. Máximo seis vivos; reutiliza enemigos caídos.
- Vida base 80.000; daño de lanza 320 y bomba 450. Aumentan un 2% por nivel desde 40 hasta 105; factor máximo 2,3.
- Recompensa base 30.000 créditos, 45.000 XP y 40 cajas. Créditos y XP comparten el mismo factor; cajas constantes. A nivel 105: 69.000 créditos y 103.500 XP antes de potenciadores.
- Reaparición a los tres minutos. Vida proporcional y enfriamiento se guardan en `granTitanState`. Proyectiles transitorios se eliminan al cambiar de sector o morir el jefe; no se duplican premios.

## Misiones

Dos contratos nuevos en el sistema existente: Recuperación del Cementerio (10 Catapultas, 10 Arponeros, 6 Acechadores) y Caída del Gran Titán (un jefe, premio adicional único de 100.000 créditos y 40.000 XP). Conservan las condiciones de acceso del panel de contratos existente.

## Alcance visual y validación

Conserva la geometría original del casco: no reconstruye sus bordes deformados. Reduce el brillo y la intensidad de normales, añade puertas y lanzadores independientes adaptados a sus huecos. Modelado artístico adicional del casco queda pendiente.

Validación: ocho suites Node y arranque WebGL en Chromium; pruebas del combate real para cantidades de proyectiles, límite de refuerzos, premio único y persistencia. Renders con compuertas abiertas y cerradas.
