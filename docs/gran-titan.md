# Gran Titán · v217

Jefe offline del Cementerio de Naves (nivel 40), patrulla un circuito de radio 2800 m a 70 m/s y altura entre 30 y 210 m, lejos de la base. Posición y progreso de patrulla se conservan al guardar. Usa el barco aportado por el jugador, optimizado de 7.004.940 a 1.431.768 bytes conservando sus 39.998 triángulos.

Ocho compuertas independientes: dos lanzadores de lanzas y dos de bombas por costado. Apertura superior seguida de extensión, disparo y retracción. Se dispara por el costado más próximo al jugador. Las piezas se crean con código y no requieren Blender.

## Combate

- Neutral hasta recibir daño del jugador o sus drones. Abandona el combate al entrar en zona segura, cambiar de mapa o separarse más de 2000 m.
- Alcance de disparo: el mismo COMBAT_RANGE del jugador (1200 m). No ataca al atracar, aterrizar o entrar en zona segura.
- Ciclo de 8 s: aviso mediante apertura, disparo a los 2,5 s, cierre tras los 4 s. Alterna lanzas y bombas.
- Seis lanzas a 570 m/s: siete posibles trayectorias con una vía lateral libre que cambia por ráfaga; la trayectoria central siempre apunta a la posición de la nave al disparar. Colisión de segmentos para evitar atravesar al jugador entre fotogramas. Al impactar engancha la nave durante 3 s, con el cable, daño periódico e inmunidad posterior de 5 s compartidos con los Arponeros; permite seguir disparando.
- Cuatro bombas por ataque, con esferas de aviso de radio 150 m, menos opacas y detonación a los 3,5 s; una bomba apunta directamente a la posición de la nave y otras tres rodean ese punto a 220 m; objetivos fijados al disparar, de modo que moverse permite escapar.
- Refuerzos: una Catapulta, un Arponero y un Acechador tras 12 s de combate y cada 30 s después. Máximo seis vivos; reutiliza enemigos caídos.
- Vida base 80.000; daño de lanza 320 y bomba 450. Aumentan un 2% por nivel desde 40 hasta 105; factor máximo 2,3.
- Recompensa base 30.000 créditos, 45.000 XP y 40 cajas. Créditos y XP comparten el mismo factor; cajas constantes. A nivel 105: 69.000 créditos y 103.500 XP antes de potenciadores.
- Reaparición a los tres minutos. Vida proporcional y enfriamiento se guardan en `granTitanState`. Proyectiles transitorios se eliminan al cambiar de sector o morir el jefe; no se duplican premios.

## Misiones

Dos contratos nuevos en el sistema existente: Recuperación del Cementerio (10 Catapultas, 10 Arponeros, 6 Acechadores) y Caída del Gran Titán (un jefe, premio adicional único de 100.000 créditos y 40.000 XP). Conservan las condiciones de acceso del panel de contratos existente.

## Alcance visual y validación

Conserva la geometría original del casco: no reconstruye sus bordes deformados. Reduce el brillo y la intensidad de normales, añade puertas y lanzadores independientes adaptados a sus huecos. Modelado artístico adicional del casco queda pendiente.

Validación: ocho suites Node y arranque WebGL en Chromium; pruebas del combate real para cantidades de proyectiles, límite de refuerzos, premio único y persistencia. Regresión v217 en el juego real: patrulla, neutralidad, lanza dirigida contra jugador quieto, inmovilización, bomba que daña al permanecer quieto y evasión al abandonar el área. Renders con compuertas abiertas y cerradas.

## Proyectiles y avisos visuales (v227)

Las lanzas tienen punta y eje metálicos, estabilizadores, anillos luminosos y estela de energía. Las bombas tienen carcasa blindada, aletas, bandas metálicas y núcleo incandescente. Los avisos usan un contorno circular orientado a cámara, marcas y un arco de carga que cambia a rojo antes de detonar; reemplazan las esferas de alambre. La explosión muestra un destello, onda expansiva y fragmentos luminosos durante 0,65 s.

Los gráficos se construyen con geometrías pequeñas y materiales locales, sin nuevas descargas de modelos o texturas. Se liberan geometrías y materiales al impactar, expirar o cambiar de mapa. Se mantienen seis lanzas, cuatro bombas, velocidad 570, mecha 3,5 s, radio 150, daño, parálisis y cadencia originales.
