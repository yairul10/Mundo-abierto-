# Enemigos de Mundo Abierto
Datos del código del juego, versión 156.

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
