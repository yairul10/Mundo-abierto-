# Enemigos de Mundo Abierto
Datos del código del juego, versión 158.

| Característica | Explorador | Asaltante | Guardián | Destructor |
|---|---:|---:|---:|---:|
| Identificador interno | scout | raider | sentinel | destroyer |
| Mapa | Aurora (1) | Aurora (1) | Cinturón Perdido (2) | Cinturón Perdido (2) |
| Cantidad activa | 24 | 14 | 14 | 14 |
| Vida base | 35 | 70 | 140 | 280 |
| Vida máxima con escalado | 175 | 350 | 700 | 1400 |
| Daño base por disparo | 5 | 10 | 20 | 35 |
| Velocidad de movimiento (m/s) | 120 | 150 | 90 | 110 |
| Velocidad de proyectil (m/s) | 1250 | 1250 | 1050 | 1250 |
| Intervalo entre disparos (s) | 2,8–3,5 | 2–2,7 | 1,5–2,2 | 1,5–2,2 |
| Créditos base por baja | 10 | 20 | 40 | 80 |
| XP base por baja | 18 | 36 | 72 | 130 |
| Cajas por baja | 1 | 2 | 4 | 6 |
| Nivel mínimo mostrado | 1 | 3 | 5 | 8 |
| Distancia inicial al centro del sector (m) | 850–2920 | 1200–2920 | 1700–2920 | 1700–2920 |

## Escalado
La vida se calcula al aparecer o reaparecer: redondear(vida base × mínimo(5; 1 + 0,10 × (nivel del jugador − 1))). Llega al multiplicador máximo en nivel 41. Un enemigo ya presente mantiene la vida con la que apareció.
Los créditos y XP se calculan al morir: redondear(recompensa base × mínimo(2,5; 1 + 0,035 × (nivel del jugador − 1))). El máximo se alcanza en nivel 44.
El nivel de la etiqueta es el mayor entre el nivel mínimo de la tabla y el nivel del jugador. El daño, velocidad y cantidad de cajas no escalan con el nivel.

## Comportamiento común
- Activan combate a menos de 1200 m del jugador y fuera de las zonas seguras.
- Se acercan mientras están a más de 800 m. No persiguen si el jugador sale del alcance de combate.
- Disparan si están a más de 80 m; cada proyectil vive 1,8 s y tiene dispersión aleatoria.
- A menos de 65 m causan daño de contacto por segundo.
- Daño previo a otras defensas/habilidades: máximo(1; daño base − defensa del jugador × 0,25).
- Reaparecen 8 s después de morir, con posición aleatoria nueva y vida recalculada.
- No atacan durante aterrizaje, estando atracado o dentro de la zona segura.
- Alcance de fijación del jugador: 1200 m, con el enemigo dentro de la zona central de la pantalla.
- Las bajas de láseres, misiles y drones comparten la recompensa normal.

## Botín
Cada caja elige de forma independiente: Chatarra espacial 53 %, Aleación reforzada 28 %, Núcleo de energía 15 %, Componente ancestral 4 %.
Las cajas duran 90 s; la nave las recoge a menos de 90 m. El dron explorador recoge a menos de 45 m.

## Contratos largos
Se desbloquean al completar las 9 misiones de Aurora y las 8 del Cinturón.
Toda la lista aparece a la vez; solo se puede aceptar una misión. Sus objetivos avanzan simultáneamente, en cualquier orden, después de aceptarla. Cancelar borra el progreso y no da recompensa.
El progreso persiste al cerrar o cambiar de mapa. Cada contrato se completa una sola vez.
Las cajas de la misión 2 se pueden recoger en cualquiera de los dos mapas, también mediante el dron explorador.

| Misión | Objetivos | Créditos extra | XP extra |
|---|---|---:|---:|
| 1 | 20 Asaltantes y 30 Exploradores | 14000 | 1750 |
| 2 | 50 Exploradores, 10 Asaltantes y 40 cajas | 18000 | 2150 |
| 3 | 50 Guardianes | 40000 | 5000 |
| 4 | 30 Destructores, 20 Guardianes y 80 Exploradores | 80000 | 10000 |
| 5 | 100 Asaltantes y 20 Destructores | 72000 | 9000 |

Premio adicional por objetivo: Explorador 200 créditos/25 XP, Asaltante 400/50, Guardián 800/100, Destructor 1600/200, caja 100/10. Estas recompensas son fijas y se suman a las recompensas normales por cada baja.

## Ascuas: tercer mapa
- Centro independiente, radio 4500 m (50 % más que los 3000 m de los mapas anteriores).
- Fondo de nebulosa roja optimizado en WebP, estación propia con dos plataformas y portal de retorno.
- Nuevo portal desde Cinturón Perdido: nivel mínimo 30; activación a 100 m durante 3 s.
- Población normal: 16 Destructores y 10 Devastadores. Un único Coloso Portanaves.

### Devastador (enemigo 5)
Vida base 196; vida real = redondear(vida real de un Destructor × 0,70). Daño base 70 (doble del Destructor); velocidad 155 m/s; intervalo de disparo 1,5–2,2 s.
No persigue ni dispara hasta recibir daño. Créditos base 120, XP base 195, 6 cajas; recompensas con el mismo escalado por nivel que los enemigos normales.

### Coloso Portanaves (enemigo 6)
20.000 de vida fija, inmóvil, sin disparos ni daño de contacto. Abre las compuertas al recibir el primer ataque.
La vida no se regenera al dejar de atacarlo, morir, salir del mapa o recargar la partida. Se guardan sus fases y los refuerzos vivos.

| Activación | Refuerzos nuevos |
|---|---|
| Primer impacto | 2 Guardianes |
| Vida ≤90 % | 5 Asaltantes |
| Vida ≤70 % | 4 Guardianes |
| Vida ≤50 % | 8 Guardianes |
| Vida ≤30 % | 7 Destructores |
| Vida ≤10 % | Mantiene un grupo adicional de 10 Guardianes; reemplaza las bajas |

Las fases anteriores se activan una sola vez, incluso si un impacto cruza varios umbrales.
Los refuerzos de oleadas anteriores pueden seguir vivos: el grupo permanente de 10 es adicional.
Recompensa final fija: 10.000 créditos, 15.000 XP y 30 cajas, además del botín de los refuerzos. Prima aproximada de 60–75 % sobre la proporción de vida/recompensa base del Destructor.
Al destruirlo, los refuerzos vivos permanecen rondando Ascuas; no reaparecen cuando son eliminados. El Coloso reaparece tras 120 segundos en una posición aleatoria, con 20.000 de vida y sus fases reiniciadas. Cada derrota vuelve a otorgar su premio, una sola vez por aparición. El temporizador, posición y refuerzos se guardan; el tiempo transcurrido fuera del juego también cuenta. La base de Ascuas incorpora una nueva pieza modular central con cuatro puertos para conectar ductos.

## Mascota exploradora: defensa automática
En todos los mapas responde al último enemigo que comienza a atacar al jugador, incluidos disparos y contacto. Sigue disparando cada 0,68 s aunque el jugador deje de disparar, mientras el objetivo siga vivo, visible, agresivo y a 1200 m o menos.
Daño por láser: 20 % del ataque del jugador. Se detiene al perder el objetivo, atracar, aterrizar o entrar en la zona segura. Los drones de combate conservan el disparo sincronizado con el jugador.
