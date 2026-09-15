# Athena — Prompt para agente de código: 60 Segundos

Quiero implementar un nuevo minijuego en Athena llamado **60 Segundos**.

Debe sentirse como el juego más rápido y frenético de la sección: una sucesión continua de preguntas de fútbol durante **60 segundos exactos**. El objetivo es conseguir la mayor puntuación posible antes de que el reloj llegue a cero.

No quiero un quiz tradicional con pantallas lentas entre pregunta y pregunta. Quiero una experiencia arcade: responder, recibir feedback instantáneo y pasar a la siguiente en una fracción de segundo.

Antes de implementar, revisa el proyecto actual y respeta la arquitectura, diseño, componentes y prácticas de rendimiento ya utilizadas en Athena.

## 1. Concepto general

Al iniciar una partida:

**3 → 2 → 1 → ¡YA!**

Después comienza un temporizador global de:

**60.0 segundos**

Durante esos 60 segundos aparecen preguntas una tras otra.

Reglas:

- Cada pregunta utiliza el mismo reloj global.
- No existe un temporizador independiente por pregunta.
- El usuario puede tardar lo que quiera en una pregunta, pero ese tiempo se descuenta de sus 60 segundos.
- Una respuesta correcta suma puntos y mantiene/aumenta la racha.
- Una respuesta incorrecta NO termina la partida.
- Una respuesta incorrecta rompe la racha/multiplicador.
- Después de responder, la siguiente pregunta debe entrar casi inmediatamente.
- Cuando el reloj llega a `0.0`, la partida termina aunque haya una pregunta en pantalla.

La sensación buscada es:

> **¿Cuánto fútbol sabes en 60 segundos? ⚡**

## 2. Pantalla inicial

Al entrar a la ruta del juego mostrar:

- título **60 Segundos**;
- texto corto: “Responde todo lo que puedas antes de que se acabe el tiempo.”;
- mejor puntuación personal;
- mejor cantidad de respuestas correctas, si existe;
- botón principal **Jugar**.

No quiero selector de dificultad.

No quiero selector Internacional/Peruano.

Las preguntas de todas las categorías y dificultades se mezclan.

## 3. Dificultad aleatoria

Cada pregunta tendrá una etiqueta:

- 🟢 Fácil
- 🟡 Normal
- 🔴 Difícil

El usuario no puede elegirla.

La selección es aleatoria y puede producir cualquier secuencia.

Ejemplo:

`Fácil → Normal → Difícil → Difícil → Fácil`

No crear una progresión obligatoria por ronda.

La dificultad sí influye en los puntos base:

- Fácil: **100 pts**
- Normal: **200 pts**
- Difícil: **300 pts**

## 4. Cuenta regresiva inicial

Al pulsar **Jugar** o **Reintentar**:

**3 → 2 → 1 → ¡YA!**

Debe ser grande, visual y rápida, como la salida de una carrera.

El reloj de 60 segundos comienza después de **¡YA!**.

No repetir esta cuenta regresiva entre preguntas.

## 5. Reloj global

El reloj debe ser uno de los elementos protagonistas.

Mostrar décimas cuando tenga sentido:

`60.0 → 59.9 → 59.8 ...`

Cuando resten:

- 10 segundos: aumentar ligeramente la tensión visual.
- 5 segundos: destacar aún más el reloj.
- 3 segundos: permitir SFX/pulso visual.

No pausar el reloj:

- durante transiciones;
- al acertar;
- al fallar.

Solo puede pausarse si existe una razón de sistema real, no como parte normal del juego.

## 6. Tipos de preguntas

Quiero variedad real. No quiero 50 preguntas visualmente idénticas con cuatro botones.

El catálogo debe permitir distintos tipos de ronda, todos rápidos:

### A. Opción múltiple
Pregunta + 4 respuestas.

### B. ¿Quién es?
Mostrar foto de un futbolista + 4 nombres.

### C. Resultado
Mostrar dos equipos/selecciones y preguntar el marcador correcto.

### D. ¿Quién marcó?
Partido concreto + 4 jugadores.

### E. Campeón
Competición/año + 4 opciones.

### F. Trayectoria
Mostrar una secuencia de clubes y preguntar el jugador.

### G. ¿Cuál NO...?
Cuatro jugadores; uno no cumple la condición.

### H. Verdadero / Falso
Respuesta instantánea con dos botones grandes.

### I. Comparación
Ejemplo: “¿Quién hizo más goles en este Mundial?”

### J. XI / titularidad
Preguntar quién fue titular, quién no fue titular o quién falta.

Para la V1 no es obligatorio que todos los tipos tengan el mismo número de preguntas, pero visualmente debe sentirse variado.

## 7. Flujo de respuesta

Al elegir una respuesta:

### Correcta

- feedback verde inmediato;
- mostrar `+puntos`;
- mantener/aumentar racha;
- si corresponde, actualizar multiplicador;
- pasar a la siguiente pregunta en aproximadamente **250–450 ms**.

### Incorrecta

- feedback rojo inmediato;
- marcar muy brevemente la respuesta correcta;
- romper la racha;
- volver multiplicador a x1;
- pasar a la siguiente pregunta en aproximadamente **400–600 ms**.

No mostrar explicaciones largas durante los 60 segundos.

La prioridad es el ritmo.

## 8. Racha y multiplicador

Mostrar una racha visible:

`RACHA 1 🔥`
`RACHA 2 🔥`
`RACHA 3 🔥`

El multiplicador de puntos funciona así:

- 0–2 aciertos consecutivos: **x1**
- 3–5: **x2**
- 6–9: **x3**
- 10 o más: **x4**

Si falla:

- racha vuelve a 0;
- multiplicador vuelve a x1;
- la partida continúa.

Ejemplo:

Pregunta Normal = 200 pts.

Si tiene x3:

`200 × 3 = 600 pts`

## 9. Bonus de velocidad

Agregar un pequeño bonus cuando la respuesta sea especialmente rápida.

Propuesta inicial:

- respuesta antes de **2 segundos** desde que apareció la pregunta: **+50 pts**

Mostrar algo como:

**⚡ RÁPIDA +50**

El bonus no modifica el reloj.

No sumar segundos por acertar y no quitar segundos por fallar en la V1.

Los 60 segundos deben ser iguales para todos.

## 10. Final de la partida

Cuando el reloj llegue a cero:

- bloquear la pregunta actual;
- detener interacción;
- mostrar transición fuerte:

**⏱️ ¡TIEMPO!**

Después mostrar resultados.

## 11. Pantalla de resultados

Mostrar como mínimo:

- puntuación total;
- preguntas vistas;
- respuestas correctas;
- respuestas incorrectas;
- precisión;
- mejor racha;
- mayor multiplicador;
- cantidad de respuestas rápidas;
- mejor puntuación personal.

Ejemplo:

```text
⏱️ ¡TIEMPO!

8,750 pts

27 preguntas
✅ 22 correctas
❌ 5 incorrectas
🎯 81% precisión
🔥 Mejor racha: 11
⚡ 8 respuestas rápidas
```

Si consiguió récord:

**🏆 NUEVO RÉCORD**

Acciones:

- **Reintentar**
- **Repasar errores**
- **Volver a juegos**

## 12. Repasar errores

Después de la partida puede existir una vista opcional con las preguntas falladas.

Ejemplo:

> ❌ ¿Quién marcó el gol de la final del Mundial 2014?  
> Elegiste: Thomas Müller  
> Correcta: Mario Götze

Aquí sí puede mostrarse una explicación corta.

Esta pantalla no forma parte de los 60 segundos.

## 13. Catálogo inicial

Te entregaré:

`60-segundos-50-preguntas.md`

Contiene 50 preguntas iniciales con:

- ID;
- tipo;
- dificultad;
- pregunta;
- opciones;
- respuesta correcta;
- explicación;
- datos/asset necesario;
- pauta de validación.

Estas 50 son la V1.

La estructura debe permitir escalar después a 100, 200 o más preguntas sin rehacer el juego.

## 14. Selección de preguntas

Durante una partida:

- no repetir preguntas mientras queden otras disponibles;
- barajar el catálogo;
- mezclar dificultades;
- mezclar fútbol internacional y peruano;
- evitar dos preguntas consecutivas prácticamente idénticas cuando sea posible;
- no crear una secuencia predecible de tipos.

Si un usuario consiguiera consumir las 50 en una sola partida, volver a barajar evitando repetición inmediata.

## 15. Contenido peruano

Athena es un producto peruano.

Quiero una presencia visible de:

- Selección Peruana;
- Universitario;
- Alianza Lima;
- Sporting Cristal;
- futbolistas peruanos;
- Liga 1 cuando corresponda.

No necesito 50/50, pero sí aproximadamente **25–30 %** de contenido peruano a medida que el catálogo crezca.

## 16. Fotos y assets

Para preguntas tipo “¿Quién es?”:

- usar foto real del jugador;
- no usar siluetas genéricas si pueden evitarse;
- la foto no debe revelar accidentalmente nombre/equipo mediante texto incrustado;
- utilizar fallback coherente si un asset falla.

Para escudos/clubes/selecciones, reutilizar assets existentes en Athena.

## 17. Validación

Auditar las 50 preguntas antes de darlas por válidas.

Usar API-Football cuando pueda verificar:

- fixture;
- resultado;
- XI;
- goleadores;
- jugadores;
- planteles;
- competiciones.

Algunas preguntas históricas pueden requerir validación editorial si están fuera de cobertura.

Estados sugeridos:

- ✅ Validada con API-Football
- 🟡 Validación editorial/manual
- ❌ Incorrecta/ambigua
- ⚠️ Asset/jugador faltante

No reemplazar preguntas silenciosamente.

Si una pregunta está mal, repórtala y espera reemplazo.

## 18. Rendimiento

Este juego necesita sentirse especialmente rápido.

Priorizar:

- catálogo almacenado en Athena después de validar;
- no consultar API-Football en tiempo real durante una partida;
- precargar razonablemente la siguiente pregunta y sus imágenes;
- no cargar todo el catálogo visual de golpe;
- transiciones ligeras;
- minimizar layout shifts;
- buena respuesta en móvil;
- mantener animaciones fluidas;
- seguir las prácticas de rendimiento actuales del proyecto.

## 19. Audio

Para la V1 no es obligatorio tener música.

Sí dejar preparados SFX para:

- 3 / 2 / 1 / ¡YA!;
- respuesta correcta;
- respuesta incorrecta;
- incremento de multiplicador;
- últimos 5/3 segundos;
- ¡TIEMPO!;
- nuevo récord.

El usuario debe poder silenciarlos.

## 20. Diseño y animaciones

Quiero diseño bonito y con personalidad.

Animaciones rápidas para:

- entrada de pregunta;
- cambios de tipo;
- +100 / +200 / +300;
- multiplicador;
- feedback correcto/incorrecto;
- reloj en los últimos segundos;
- pantalla de tiempo terminado;
- nuevo récord.

No usar animaciones largas.

La interfaz debe sentirse distinta dependiendo del tipo de pregunta sin perder consistencia.

Ejemplos de microcopy:

- “⚡ ¡RÁPIDA!”
- “🔥 x3”
- “Uy… esa dolió.”
- “¡Sigue!”
- “No pienses tanto 😭”
- “5 segundos, causa.”
- “Una más…”
- “¡TIEMPO!”

Usar humor con moderación.

## 21. Persistencia

Guardar al menos:

- mejor puntuación;
- mayor cantidad de correctas en una partida;
- mejor racha;
- partidas jugadas;
- correctas acumuladas.

Si Athena ya tiene un sistema de estadísticas de juegos, integrarlo respetando sus patrones.

## 22. Resultado esperado

Antes de cerrar la implementación quiero:

1. auditoría de las 50 preguntas;
2. preguntas válidas;
3. preguntas que requieran revisión;
4. jugadores/assets faltantes;
5. catálogo propio del juego;
6. todos los tipos de pregunta necesarios para la V1;
7. partida completa de 60 segundos;
8. scoring + racha + multiplicador;
9. pantalla final;
10. repaso de errores;
11. responsive;
12. animaciones y SFX preparados;
13. estados de carga/error.

La meta es que **60 Segundos sea puro ritmo: leer, responder, siguiente, combo, récord y Reintentar**.
