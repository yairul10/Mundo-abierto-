# Enemigos, sectores y economía

Estado revisado contra el código de `3d-20261012-188`. Fuentes principales: `js/game3d.js`, `js/graveyard.js` y `js/hangar-systems.js`. Los valores son del modo individual; el PvP utiliza su propio combate de prueba.

## Sectores y portales

| Sector | Nivel para entrar desde el anterior | Radio | Enemigos |
| --- | ---: | ---: | --- |
| Aurora | 1 | 3000 m | 34 Exploradores y 19 Asaltantes |
| Cinturón Perdido | 10 | 3000 m | 20 Guardianes y 19 Destructores |
| Ascuas | 30 | 4500 m | 16 Destructores, 10 Devastadores y un Coloso |
| Cementerio de Naves | 40 | 4500 m | 12 Catapultas y 12 Arponeros, emparejados |

Los portales se activan al permanecer a 100 m o menos durante tres segundos. El mensaje aparece a 350 m o menos. Los retornos no exigen nivel. Cada sector tiene estación y zona segura; fuera del radio del sector se aplica daño de frontera de 8 por segundo.

## Modelos del Cementerio (v188)

La Estación de Recuperación usa `assets/models/estacion_recuperacion.glb`, con casco y torre de control. Dos plataformas del modelo existente `landingpad_optimizado.glb` se ensamblan a los brazos laterales, con puntos de aterrizaje independientes del casco.

`assets/models/restos_anillo.glb` se reutiliza en ocho posiciones fijas, con tamaños y giros distintos, fuera de la aproximación de la base y del corredor del portal. Geometría compartida entre copias; texturas WebP de hasta 1024 px (mapas ORM de 512 px). Las piezas procedurales siguen disponibles si falla una carga.

Los dos archivos suman 5708196 bytes frente a los 24959412 bytes originales; se conservan geometría y UV. Los cuatro mapas y estos modelos también se incluyen en el APK offline.

## Valores base

| Enemigo | ID | Vida base | Daño base | Velocidad | Créditos | XP | Cajas |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Explorador | scout | 35 | 5 | 120 m/s | 10 | 18 | 1 |
| Asaltante | raider | 70 | 10 | 150 m/s | 20 | 36 | 2 |
| Guardián | sentinel | 140 | 20 | 90 m/s | 40 | 72 | 4 |
| Destructor | destroyer | 280 | 35 | 110 m/s | 80 | 130 | 6 |
| Devastador | devastator | 196 | 70 | 155 m/s | 120 | 195 | 6 |
| Catapulta | catapult | 3000 | 300 por explosión | 75 m/s | 170 | 260 | 8 |
| Arponero | harpooner | 5000 | 50 por segundo enganchado | 130 m/s | 145 | 225 | 7 |
| Coloso Portanaves | carrier | 40000 | 150 por misil | Inmóvil | 10000 | 15000 | 30 |

Daño antes de defensa, habilidades y otros modificadores. Los valores de recompensas son base, con el Coloso escalando desde nivel 30 hasta 105.

## Escalado de vida y daño

Enemigos básicos: vida = redondear(base × mínimo(5; 1 + 0,10 × máximo(0; nivel − 1))). El Devastador tiene el 70 % de la vida calculada de un Destructor. El daño de estos enemigos no aumenta por nivel.

Coloso, Catapulta y Arponero: multiplicador = mínimo(2,5; 1 + 0,02 × máximo(0; nivel − nivel base)). Es un aumento lineal del 2 % de la base por nivel posterior, no interés compuesto.

| Enemigo | Nivel base | Vida a ese nivel | Vida en nivel 40 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| Coloso | 30 | 40000 | 48000 | 100000 desde nivel 105 |
| Catapulta | 40 | 3000 | 3000 | 7500 desde nivel 115 |
| Arponero | 40 | 5000 | 5000 | 12500 desde nivel 115 |

El misil del Coloso, la explosión de la Catapulta y el daño por segundo del Arponero usan ese mismo multiplicador con su nivel base respectivo. Se aplica la defensa del jugador antes de los demás modificadores de daño.

Los enemigos normales recalculan su vida al reaparecer. El Coloso también actualiza su máximo durante la sesión y conserva su porcentaje de vida restante cuando cambia el máximo o se carga un guardado. Ejemplo: 20000/40000 pasa a 24000/48000; un Coloso destruido permanece con cero.

Créditos y XP de enemigos distintos del Coloso: redondear(base × mínimo(2,5; 1 + 0,035 × máximo(0; nivel − 1))). El máximo se alcanza en nivel 44. Los potenciadores de XP se aplican al otorgar experiencia. El número de cajas no escala.

## Combate de los enemigos básicos

Activan combate a menos de 1200 m y fuera de zonas seguras. Se acercan hasta unos 800 m, disparan a más de 80 m y causan daño de contacto a menos de 65 m.

Intervalos: Explorador 2,8–3,5 s; Asaltante 2–2,7 s; Guardián, Destructor y Devastador 1,5–2,2 s. Proyectiles a 1250 m/s, salvo el Guardián a 1050 m/s; duran 1,8 s. El Devastador no se vuelve agresivo hasta recibir daño.

Reaparecen ocho segundos después de morir. Los refuerzos del Coloso tienen reglas distintas. Las bajas por láser, misil o dron comparten la recompensa.

## Catapulta y Arponero

Comparten escuadra. El Arponero sigue el flanco de su Catapulta a unos 150 m; una Catapulta emparejada espera a que enganche el arpón para atacar. Si pierde al compañero puede atacar sola.

- Arpón a 650 m/s, con cable desde el carrete del modelo modular.
- Enganche de tres segundos: inmoviliza el movimiento, pero permite disparar. Daño continuo base de 50 por segundo.
- Al liberarse hay cinco segundos de inmunidad frente a otro enganche. Destruir al Arponero o entrar en condiciones seguras libera el cable.
- El enganche activa la Catapulta compañera: carga de 1,4 s y vuelo de bomba de 1,5 s, con advertencia de anillos.
- Explosión de daño base 300 dentro de 180 m. Salir del área evita el impacto.
- El modelo modular de Catapulta anima el brazo y la bomba; el Arponero usa casco de Catapulta, lanzador, carrete y arpón independientes.

## Coloso Portanaves

Inmóvil, con vida base 40000 desde nivel 30. Dispara misiles guiados de daño base 150 cada cinco segundos cuando el jugador está a alcance de combate y fuera de condiciones seguras. Velocidad del misil: 650 m/s; duración: cuatro segundos.

Abre sus cuatro compuertas al primer impacto. Los refuerzos salen por turnos desde los hangares. Se guardan vida, máximo, fases, posición, temporizador de reaparición y refuerzos vivos, incluido su estado de lanzamiento.

| Activación | Refuerzos nuevos |
| --- | --- |
| Primer impacto | 2 Guardianes |
| Vida ≤90 % | 5 Asaltantes |
| Vida ≤70 % | 4 Guardianes |
| Vida ≤50 % | 8 Guardianes |
| Vida ≤30 % | 7 Destructores |
| Vida ≤10 % | Mantiene diez Guardianes adicionales y reemplaza sus bajas |

Las fases se activan una sola vez por aparición, incluso si un impacto cruza varios umbrales. Los refuerzos anteriores pueden seguir vivos.

Premio por destrucción: 10000 créditos y 15000 XP base desde nivel 30, con aumento lineal del 2 % por nivel y tope ×2,5 en nivel 105. Vida, daño y recompensa comparten ese multiplicador: desde nivel 105, 100000 de vida, 375 de daño base por misil, 25000 créditos y 37500 XP base. El botín se mantiene en 30 cajas, además del botín de los refuerzos. Los potenciadores de XP se aplican después del premio base. Reaparece tras 120 segundos; el tiempo fuera del juego cuenta. Los refuerzos supervivientes permanecen en Ascuas y no reaparecen al ser eliminados.

Modelo actual: `assets/models/coloso.glb` (2019032 bytes). Puertas: `assets/models/scifipanelcrate_optimizado.glb` (305792 bytes). `js/coloso-rig.js` adapta el casco y cuatro puertas con bisagras superiores, marcos naranjas y salidas independientes. Si falla una carga se conserva el respaldo.

## Botín

Cada caja elige un material: Chatarra 53 %, Aleación 28 %, Núcleo 15 %, Componente ancestral 4 %. Dura 90 segundos; la nave recoge a menos de 90 m y el explorador a menos de 45 m.

## Naves, drones y hangar

| Compra | Precio | Requisito |
| --- | ---: | --- |
| Titán | 200000 créditos | Nivel 15 |
| Espectro | 200000 créditos | Nivel 25 |
| Dron explorador | 300000 créditos | Compra independiente de los drones de combate |
| Drones de combate 1–8 | 100, 200, 1000, 5000, 15000, 40000, 100000, 200000 | Compra secuencial |
| Robot reparador, mejoras 1–5 | 5000, 10000, 20000, 40000, 80000 | Compra secuencial |

El explorador empieza con alcance 550 m y puede mejorarse hasta nivel 10. Responde automáticamente a amenazas válidas y dispara cada 0,68 s con daño del 20 % del ataque; su alcance de combate se limita al menor entre 1200 m y su alcance de exploración. Los drones de combate disparan con el jugador.

Abanico es gratis. Cada formación adicional cuesta 20000 créditos, 200 Chatarra, 70 Aleación, 25 Núcleos y 8 Componentes ancestrales:

| Formación | Ventaja |
| --- | --- |
| Escudo giratorio | −15 % de daño recibido |
| Punta de lanza | +20 % de daño de drones |
| Fortaleza | +15 % de vida máxima |
| Cazadora | +15 % de alcance de drones |
| Propulsora | +12 % de velocidad |
| Recuperación | +25 % de reparación del robot |

Requieren al menos un dron para aplicar ventajas. Cambiar de formación reemplaza el bono anterior; los cambios de vida máxima conservan el porcentaje de vida. Las ventajas de formación y potenciadores del hangar se desactivan en PvP.

Potenciadores de 15 minutos de vuelo: daño +15 % por 10000 créditos, resistencia −15 % por 10000 y XP +25 % por 15000. El tiempo se pausa en menús, atracado, durante aterrizaje, en segundo plano o en PvP. Comprar otra unidad suma duración sin acumular multiplicadores.

## Misiones

Campañas: nueve misiones de Aurora, ocho de Cinturón y nueve de Ascuas. Las dos últimas de Ascuas piden destruir un Coloso y diez Colosos, respectivamente. Esta última otorga 600000 créditos y 200000 XP base.

Los cinco contratos largos se desbloquean tras completar Aurora y Cinturón; se acepta uno a la vez. Sus objetivos avanzan después de aceptarlos, en cualquier orden. Cancelar borra el progreso. Cada contrato se completa una vez y persiste al cambiar de mapa o cerrar.

| Contrato | Objetivos | Créditos extra | XP extra |
| --- | --- | ---: | ---: |
| 1 | 20 Asaltantes y 30 Exploradores | 14000 | 1750 |
| 2 | 50 Exploradores, 10 Asaltantes y 40 cajas | 18000 | 2150 |
| 3 | 50 Guardianes | 40000 | 5000 |
| 4 | 30 Destructores, 20 Guardianes y 80 Exploradores | 80000 | 10000 |
| 5 | 100 Asaltantes y 20 Destructores | 72000 | 9000 |

Los premios de la tabla se calculan sumando estos valores por objetivo requerido: Explorador 200 créditos/25 XP, Asaltante 400/50, Guardián 800/100, Destructor 1600/200, caja 100/10. El total se entrega una vez al completar el contrato; mientras tanto cada baja conserva su recompensa normal.

## Verificación

Consultar [pruebas y comprobaciones manuales](pruebas.md). Las pruebas de lógica no certifican orientación de modelos, encaje de puertas ni apariencia del cable. Al añadir un mapa o enemigo, actualizar esta referencia en el mismo cambio.

