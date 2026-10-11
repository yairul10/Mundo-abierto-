# Enemigos de Mundo Abierto
Datos del código del juego, versión 155.

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
Se desbloquean al completar las 9 misiones de Aurora y las 8 de nivel 10/Cinturón.
Una misión activa por perfil; puede cancelarse perdiendo su progreso, sin cobrar premio.
Cada contrato se completa una sola vez. La recompensa es adicional a las recompensas normales por cada enemigo.

| Exploradores del mapa 1 | Créditos del contrato | XP del contrato |
|---:|---:|---:|
| 50 | 10000 | 1250 |
| 100 | 20000 | 2500 |
| 200 | 40000 | 5000 |
| 400 | 80000 | 10000 |
| 800 | 160000 | 20000 |
