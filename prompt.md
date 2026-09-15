# Prompt para agente de código — Athena: Adivina el XI

Quiero implementar un nuevo juego en Athena llamado **Adivina el XI**.

Antes de desarrollar la experiencia completa, revisa el proyecto actual y respeta la arquitectura, patrones visuales, UX y prácticas de rendimiento que ya venimos usando en Athena. No quiero una solución aislada ni algo que se sienta ajeno al producto.

## 1. Objetivo del juego

El usuario debe reconstruir el **XI titular exacto** de un equipo en un partido concreto.

Ejemplo:

- Partido: Real Madrid 1-4 Ajax
- Competición: UEFA Champions League 2018/19
- Fase: octavos de final
- XI objetivo: Ajax

El usuario verá una cancha con la formación real utilizada por el equipo objetivo y 11 espacios vacíos. Deberá encontrar a los once titulares mediante un buscador de jugadores.

La dificultad no consiste en esconder qué partido es, sino en qué tan fácil o difícil resulta recordar ese XI exacto.

## 2. Pantalla inicial al entrar a la ruta

Al ingresar a la ruta del juego, todavía no debe empezar ninguna partida.

Primero debe mostrarse una pantalla de configuración clara, entretenida y acorde al diseño de Athena.

### Paso A — Tipo de fútbol

El usuario puede elegir una de estas tres opciones:

- **Fútbol Internacional**
- **Fútbol Peruano**
- **Mixto**

Reglas:

- **Fútbol Internacional:** utiliza únicamente los retos del archivo `adivina-el-once-internacional.md`.
- **Fútbol Peruano:** utiliza únicamente los retos del archivo `adivina-el-once-peruano.md`.
- La **Selección Peruana cuenta como Fútbol Peruano**.
- También cuentan como Fútbol Peruano los clubes peruanos aunque el partido sea de Libertadores, Sudamericana, Recopa, etc.
- **Mixto:** combina ambos catálogos. No necesita un tercer archivo.
- En modo Mixto quiero una selección aproximadamente **50 % Internacional / 50 % Peruano**, y no una probabilidad proporcional a la cantidad de retos disponibles.

### Paso B — Dificultad

Después se elige:

- **Fácil**
- **Normal**
- **Difícil**

Cantidad inicial de retos:

- Internacional: 15 por dificultad.
- Peruano: 7 por dificultad.
- Total inicial: 66 retos.

### Paso C — Tiempo

Agregar un interruptor:

**Con tiempo / Sin tiempo**

Debe iniciar **activado por defecto en “Con tiempo”**.

Tiempos:

- Fácil: **2:00 min**
- Normal: **3:30 min**
- Difícil: **5:00 min**

Si el usuario elige “Sin tiempo”, no debe existir cuenta regresiva.

### Paso D — Jugar

Un botón principal **Jugar** inicia la partida utilizando las opciones elegidas.

## 3. Selección del reto

Al pulsar Jugar:

- Seleccionar un reto aleatorio dentro del tipo de fútbol y dificultad elegidos.
- Evitar repetir retos recientes durante la misma sesión.
- En Mixto, elegir primero entre Peruano e Internacional con reparto 50/50 y luego seleccionar el reto.
- No cambiar ni sustituir por tu cuenta ninguno de los partidos de los archivos MD.

## 4. Inicio de la partida

Antes de que empiece el cronómetro, mostrar una entrada breve y visual con el contexto del reto.

Debe quedar muy claro:

- equipo cuyo XI debe adivinarse;
- rival;
- competición;
- fase, cuando corresponda;
- año/temporada;
- resultado del partido.

Ejemplo:

> UEFA Champions League 2018/19  
> Octavos de final  
> Real Madrid 1-4 Ajax  
> **Adivina el XI titular del Ajax**

Después hacer una pequeña cuenta regresiva visual **3, 2, 1**.

El reloj empieza recién al terminar esa introducción.

El partido y su contexto funcionan como la **pista inicial gratuita**.

## 5. Cancha y formación

La cancha debe ser el elemento principal de la partida.

- Utilizar la formación real del XI titular del equipo objetivo en ese partido.
- Mostrar los 11 espacios vacíos en sus posiciones reales.
- Los espacios pueden mostrar la posición correspondiente, pero no deben revelar el nombre del futbolista.
- Cuando se acierte un jugador, su espacio queda completado con su rostro y nombre.
- La cancha debe funcionar bien tanto en escritorio como en móvil.

## 6. Buscador de jugadores

Quiero un buscador visible y muy cómodo de usar durante toda la partida.

El jugador no debe tener que seleccionar primero una posición de la cancha.

Debe poder escribir directamente cualquier futbolista, sin importar su posición.

Ejemplos:

- `messi`
- `Messi`
- `lionel messi`
- nombre;
- apellido;
- nombre completo;
- con tilde;
- sin tilde.

La búsqueda debe tolerar diferencias de mayúsculas/minúsculas y acentos.

### Resultados de búsqueda

Mostrar únicamente:

- rostro/foto del jugador;
- nombre del jugador.

No mostrar en el resultado:

- posición;
- club;
- selección;
- estadísticas;
- cualquier dato que se convierta en una pista extra.

El buscador **no puede estar limitado a los 11 jugadores correctos**, porque eso revelaría las respuestas.

Debe sentirse inmediato y ligero. Analiza la mejor estrategia de rendimiento para el stack actual de Athena y evita trabajo o consultas innecesarias mientras el usuario escribe.

Debe poder utilizarse con teclado, mouse y touch.

Al presionar **Enter**, se selecciona el resultado resaltado.

Después de cada intento, devolver automáticamente el foco al buscador para poder escribir el siguiente nombre sin fricción.

## 7. Cuando el jugador es correcto

Si el futbolista elegido pertenece al XI titular:

- marcar el intento como correcto;
- hacer una animación visual agradable desde el buscador hacia su posición correspondiente en la cancha;
- completar el espacio con su foto y nombre;
- mostrar una confirmación breve;
- limpiar el buscador;
- dejarlo listo para escribir inmediatamente el siguiente jugador.

La animación debe sentirse fluida y satisfactoria, sin ralentizar el juego.

## 8. Cuando el jugador es incorrecto

Si el jugador seleccionado no pertenece al XI titular:

- indicar de forma breve que no fue titular en ese partido;
- utilizar una respuesta visual discreta;
- no revelar información adicional;
- no decir si fue suplente, si ingresó después, etc.;
- no quitar tiempo.

Registrar la cantidad de intentos incorrectos para el resumen final.

Si el usuario intenta nuevamente un futbolista que ya acertó, indicarle que ese jugador ya fue encontrado.

## 9. Pistas adicionales

Además de la pista inicial del partido, debe existir una acción **Pedir pista**.

Para la primera versión:

- el usuario elige uno de los espacios todavía vacíos;
- la pista revela la **primera letra del apellido/nombre futbolístico mostrado** del jugador de ese espacio;
- contabilizar cuántas pistas se utilizaron;
- nunca revelar automáticamente al jugador completo.

No dar pistas adicionales de forma automática cuando queden pocos jugadores. Parte de la gracia es que el usuario tenga que recordar los últimos nombres.

## 10. Final de la partida

La partida termina cuando ocurre una de estas situaciones:

### A. El usuario consigue 11/11

Terminar inmediatamente y detener el reloj.

### B. Se acaba el tiempo

- bloquear nuevos intentos;
- mostrar los jugadores faltantes;
- distinguir visualmente cuáles fueron acertados y cuáles fueron revelados.

### C. Modo sin tiempo

La partida continúa hasta completar el XI o hasta que el usuario decida rendirse.

Agregar una opción para rendirse/terminar la partida con confirmación para evitar pulsaciones accidentales.

## 11. Pantalla de resultados

Al finalizar mostrar como mínimo:

- aciertos: por ejemplo **9/11**;
- jugadores faltantes;
- tiempo utilizado o tiempo restante si corresponde;
- cantidad de pistas utilizadas;
- cantidad de intentos incorrectos;
- XI completo.

Agregar acciones claras:

- **Siguiente XI**
- **Volver a configuración**

“Siguiente XI” debe mantener:

- tipo de fútbol;
- dificultad;
- modalidad con/sin tiempo.

y cargar otro reto sin repetir inmediatamente el anterior.

No necesito todavía una fórmula compleja de puntos. Primero quiero que la experiencia principal quede sólida.

## 12. API-Football: auditoría obligatoria antes de cerrar los retos

Te entregaré estos dos archivos:

- `adivina-el-once-internacional.md`
- `adivina-el-once-peruano.md`

Antes de dar por válidos los retos, busca **cada partido** en API-Football.

Quiero un reporte claro por partido indicando como mínimo:

- encontrado;
- no encontrado;
- encontrado pero sin alineación;
- encontrado con XI titular completo;
- si existe formación;
- si los jugadores tienen foto disponible.

Si API-Football devuelve un identificador propio del fixture, inclúyelo en el reporte para que podamos reconocerlo fácilmente.

**No inventes alineaciones.**
**No reemplaces partidos por tu cuenta.**

Si un partido no existe, la alineación está incompleta o la información no es suficiente para construir el reto correctamente, indícamelo y yo te daré otra alternativa.

Presta especial atención a los partidos antiguos y a los más recientes.

## 13. Catálogo propio del juego

Una vez que un partido haya sido validado, quiero que Adivina el XI tenga su **propio catálogo/tabla de retos dentro de Athena**.

API-Football debe servir para encontrar y validar la información necesaria, pero una partida normal no debería depender de volver a consultar innecesariamente la API cada vez que se juega un reto ya validado.

Respeta las prácticas de rendimiento, reutilización de datos y organización que ya estamos utilizando en el proyecto.

## 14. Rendimiento

Esto es especialmente importante para:

- el buscador de jugadores;
- carga de fotos;
- selección del reto;
- cancha;
- animaciones;
- cambios entre partidas;
- uso de API-Football.

Revisa cómo está construido Athena actualmente y aplica las mejores prácticas apropiadas para nuestro stack.

La interfaz debe seguir sintiéndose rápida incluso después de jugar varias partidas seguidas.

No sacrifiques rendimiento por animaciones o efectos visuales.

## 15. Estado vacío / errores

Contemplar estados claros si:

- un reto todavía no tiene XI validado;
- falta una imagen;
- ocurre un error cargando datos;
- API-Football no devuelve la información esperada;
- no existen retos disponibles para una combinación determinada.

No mostrar al usuario una partida rota.

## 16. Resultado esperado antes de cerrar la implementación

Quiero que primero me entregues:

1. Auditoría de los 66 partidos contra API-Football.
2. Lista de retos totalmente utilizables.
3. Lista de retos incompletos/no encontrados para que yo pueda reemplazarlos.
4. Confirmación de que los XI encontrados tienen formación y titulares suficientes.
5. Después de eso, continuar con la implementación final del juego.

Mantén la experiencia simple, competitiva, rápida y muy futbolera. No quiero que parezca un formulario; quiero que se sienta como un minijuego propio de Athena.
