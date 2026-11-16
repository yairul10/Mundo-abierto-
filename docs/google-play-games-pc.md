# Cosmos Legacy: prueba en Google Play Games para PC

La misma aplicación mantiene sus controles táctiles en celulares/tablets. El plugin
Android consulta `com.google.android.play.feature.HPE_EXPERIENCE`; únicamente esa
plataforma activa el modo PC nativo. En navegador, se activa con ratón fino y sin
pantalla táctil. Un tablet Android con ratón conserva el joystick flotante.

El manifiesto declara `android.hardware.type.pc` opcional para recibir ratón real
en lugar de clics traducidos a toques. Pantalla táctil, multitáctil, faketouch y
orientación horizontal también son opcionales para no filtrar PCs. No se añade
ninguna dependencia de hardware de PC obligatoria. El proyecto usa Java y WebView,
sin filtros ABI propios ni bibliotecas JNI del juego; confirmar el resultado en
el explorador del AAB, incluidas las bibliotecas transitivas.

## Controles predeterminados

| Entrada | Acción |
| --- | --- |
| W / S, flechas arriba/abajo | Avanzar / retroceder |
| A / D | Desplazamiento lateral |
| Flechas izquierda/derecha | Girar |
| R / F | Subir / bajar mira |
| Clic izquierdo mantenido, Espacio | Disparo continuo |
| Arrastrar con clic derecho o izquierdo | Apuntar |
| Rueda, + / − | Zoom |
| Q / X | Misil / habilidad de nave |
| 1 / 2 / 3 | Habilidades PvP equipadas |
| E | Solicitar aterrizaje si está disponible |
| M / Tab | Mapa / menú |
| H | Ayuda de controles |
| Esc | Cerrar ayuda/menú; los diálogos conservan su cancelación habitual |

La ayuda también está disponible desde el menú. Las teclas de movimiento usan
códigos físicos; escribir en el chat, composición IME y combinaciones Ctrl/Alt/Meta
no activan combate. Perder foco, abrir un menú o recibir la pausa nativa suelta
movimiento/disparo. El servidor continúa simulando el combate multijugador.
El apuntado usa arrastre, no captura exclusiva/infinita del cursor.

## Validación y publicación pendientes en Windows

1. Descargar el APK de GitHub Actions e instalarlo en el emulador de desarrollo de
   Google Play Games para PC (`adb install -r ...apk`). No borrar datos al actualizar.
2. En el emulador habilitar Developer Options → PC mode (KiwiMouse), como indica
   Google; en la aplicación pública el cambio de modo se hace al iniciar.
3. Verificar ayuda, teclado, ambos botones del ratón, rueda, soltar fuego con
   Espacio y ratón combinados, chat, menús, cambio de ventana y overlay de Google.
   Probar distintas ventanas/resoluciones y los modos PvE/cooperativo/arenas.
4. Con la misma cuenta Play Games, confirmar guardado en móvil, cerrar esa sesión,
   entrar en PC y comprobar nivel/inventario. Comprar o ganar una recompensa en PC,
   esperar confirmación de nube y regresar al móvil. Evitar sesiones simultáneas;
   un conflicto debe conservar ambas copias y pedir elección explícita.
5. Medir estabilidad, cierres/ANR y FPS sostenidos (Google exige al menos 30 FPS
   estables para la clasificación jugable). Estas pruebas no se han ejecutado en
   un equipo Windows desde este entorno.
6. En Play Console → Lanzamiento → Configuración avanzada → Factores de forma,
   añadir Google Play Games para PC. Se puede compartir el AAB/canal móvil. Revisar
   catálogo, ficha y disponibilidad de pruebas, y enviar los cambios a revisión.

Este cambio prepara una prueba de compatibilidad, no activa distribución ni
certifica el juego. La etiqueta «optimizado» requiere requisitos adicionales,
incluido Input SDK, que todavía no está integrado. La versión Android permanece
1.1.47 (395) hasta solicitar el siguiente incremento; la compilación debe contener
este commit para incluir los controles nuevos.

Comprobaciones locales: pruebas de eventos del controlador, aislamiento de
celulares/tablets y generación del proyecto Android con un fixture de manifiesto.
No equivalen a compilar Gradle ni ejecutar el APK en Google Play Games para PC.

Referencias oficiales consultadas:
- https://developer.android.com/games/playgames/pc-compatibility
- https://developer.android.com/games/playgames/input-mouse
- https://developer.android.com/games/playgames/checklist
- https://developer.android.com/games/playgames/development-submit


## Asignación de teclas

Hangar → Acomodar botones → Teclas (PC) permite cambiar o quitar las teclas de
movimiento, combate, habilidades PvP, cámara, formación, mascota, misiones, chat,
AUTO y ayuda. Pulsar el botón de una acción y después la nueva tecla. Las
asignaciones repetidas se rechazan; quitar o cambiar la asignación anterior antes
de reutilizar una tecla. Esc cancela la captura. Ctrl/Alt/Meta/Shift combinados y
teclas de sistema reservadas no se asignan.

Guardar aplica las teclas y posiciones; Cancelar descarta el borrador y
Restablecer prepara los valores predeterminados, que también requieren Guardar.
Se guardan en `mundoAbierto.pcKeybindings.v1`, por dispositivo y compartidas entre
PvE, cooperativo, arenas y cuentas. No forman parte del inventario ni del guardado
cloud. La ayuda del menú muestra la asignación vigente. El clic del ratón y la
rueda mantienen sus acciones; este editor cambia teclas, no botones del ratón.
