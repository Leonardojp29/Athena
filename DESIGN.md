---
name: Athena
description: Inteligencia futbolística sobre la pizarra donde el fútbol siempre se explicó.
colors:
  bg: "oklch(0.985 0.003 95)"
  bg-subtle: "oklch(0.958 0.005 95)"
  surface: "oklch(1 0 0)"
  surface-raised: "oklch(1 0 0)"
  border: "oklch(0.898 0.006 95)"
  border-strong: "oklch(0.822 0.008 95)"
  text: "oklch(0.185 0.008 286)"
  text-muted: "oklch(0.468 0.012 286)"
  primary: "oklch(0.52 0.21 262)"
  primary-ink: "oklch(0.48 0.2 262)"
  primary-contrast: "oklch(1 0 0)"
  marca: "oklch(0.6 0.22 22)"
  win: "oklch(0.52 0.13 152)"
  win-contrast: "oklch(1 0 0)"
  data: "oklch(0.792 0.121 208)"
  data-ink: "oklch(0.512 0.118 232)"
  banda: "oklch(0.26 0.09 262)"
  board: "oklch(0.362 0.062 158)"
  board-edge: "oklch(0.298 0.055 158)"
  chalk: "oklch(0.992 0.002 95)"
  pitch: "oklch(0.556 0.092 156)"
  pitch-dark: "oklch(0.522 0.088 156)"
  magnet: "oklch(1 0 0)"
  live: "oklch(0.62 0.22 22)"
  live-ink: "oklch(0.5 0.2 22)"
  live-on-board: "oklch(0.78 0.11 25)"
  card-yellow: "oklch(0.762 0.145 78)"
  card-red: "oklch(0.582 0.202 24)"
typography:
  score:
    fontFamily: "Oswald, Oswald Fallback, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 5.25rem)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Oswald, Oswald Fallback, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, Archivo Fallback, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, Archivo Fallback, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.08em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.875rem"
  xl: "1.125rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.625rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "1rem"
  input-search:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.5rem 0.375rem 2rem"
  chip-live:
    backgroundColor: "transparent"
    textColor: "{colors.live}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.625rem"
  player-token:
    backgroundColor: "{colors.magnet}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "2rem"
---

# Athena — sistema de diseño

## Overview

Athena explica el fútbol sobre **la pizarra del técnico**, que es donde el fútbol siempre se
explicó. La decisión formal nace de ahí y de un rechazo explícito: la lista de tarjetas oscuras
con un punto verde parpadeando que envía cualquier app de resultados. Ese patrón informa; no
explica.

De la pizarra salen tres materiales y cada uno tiene una regla propia. El **trazo** dibuja lo
plano: filos de un píxel, líneas de cancha, separadores. No imita la textura de la tiza —una
textura falsa es la marca más confiable del diseño hecho a máquina— sino su **gesto**: las
marcas de la cancha se trazan en tres tiempos, contorno, áreas y círculos, y recién entonces
caen los imanes. El **tablero** es la superficie a
sangre donde vive todo encabezado de entidad y todo marcador; es oscuro en los dos temas, así
que lo que se apoya encima usa tinta de tiza y no la paleta de superficie. Los **imanes** son
lo único que se levanta del tablero: los jugadores sobre la cancha, los paneles flotantes, el
modal. Son las únicas piezas con sombra real.

El tema claro no es el oscuro invertido: es el mismo diagrama impreso en el papel de un
cuaderno de entrenador. El tema oscuro es el slate del vestuario. Las dos versiones existen
como pares completos y se verifican en contraste por separado, no derivando una de la otra.

La tesis del producto manda sobre la decoración: cada cifra lleva su origen y cada análisis su
evidencia. En diseño eso se traduce en que el análisis de IA vive en el riel pegajoso junto a
la cancha, no al final de la página, y en que su panel de evidencia es una sección estructurada
y no un volcado de JSON.

## Colors

### El acento y lo que no es acento
Athena es azul: `oklch(0.52 0.21 262)` en todo lo que se toca y rojo `oklch(0.6 0.22 22)` en la marca
y en el vivo, tomados de Líbero. Hay un tema claro y uno oscuro, y nada más: el lima de marcador con
el que nació quedó atrás.

Los **acentos de marca** son `primary`, `primary-ink`, `primary-contrast`, `marca`, `banda`, `live`,
`live-ink`, `live-on-board`, `focus` y `selection`. El resto no lo es, y por razones distintas:

- **El papel y la tinta.** Los neutros son los mismos: es el mismo diagrama impreso en el mismo
  cuaderno, con otro marcador.
- **El sustrato.** La pizarra, el césped, la tiza y el imán salen de contraste medido, no de gusto
  (ver la regla del tablero). Una pizarra azul obligaría a rehacer toda esa medición.
- **La semántica.** El cian de la IA es cian, las tarjetas son amarilla y roja, y **la victoria es
  verde**: `win` y `win-contrast` existen justamente porque "ganó" no es una preferencia de color.
  El lima cumplía tres papeles —marca, acción y victoria— y separarlos pedía un token para cada uno.

### Primary
`primary` `oklch(0.52 0.21 262)` es el relleno de la acción y lleva texto blanco (5,8:1);
`primary-ink` `oklch(0.48 0.2 262)` es el del texto, el enlace y el anillo de foco, y da 6,8:1 sobre
superficie clara y 8,9:1 sobre la oscura. **La regla del relleno y la tinta sigue mandando:** si algo
es texto, borde o anillo, usa la tinta.

### Secondary
`data` `oklch(0.792 0.121 208)` es cian de dato: marca todo lo que dice la IA y nada más. Su par de
texto es `data-ink`. Está a más de cincuenta grados de tono del azul de marca y con la mitad de su
saturación, así que en oscuro se distinguen como turquesa contra lavanda. Si el cian apareciera en un
botón dejaría de significar "esto lo dedujo Athena".

### En vivo
El vivo es el rojo de Líbero `oklch(0.62 0.22 22)`, que es además la convención de transmisión.
**Es relleno, no texto:** para el texto existe `live-ink`, que pasa 4,5:1 sobre la superficie y sobre
su propia pastilla lavada en los dos temas. Sobre la pizarra manda `live-on-board`, que es otra cosa: ahí el rojo tiene que subir
a `oklch(0.78 0.11 25)` porque a `0.72` daba 3,95:1 **como texto**, y en la pizarra el vivo se
escribe, no se rellena.

El rojo del vivo y el `card-red` de las tarjetas comparten tono a propósito: se distinguen por forma
y por contexto —un punto que late contra un icono con forma de tarjeta—, que es exactamente la regla
de que el color nunca es el único canal.

### Tertiary
Los materiales de la pizarra no son acentos, son sustrato: `board` para el encabezado a
sangre, `pitch` y `pitch-dark` para las franjas alternas del césped, `chalk` para la tinta
sobre el tablero, `magnet` para la ficha del jugador.

### Neutral
Papel (`bg`, `bg-subtle`, `surface`) contra tinta (`text`, `text-muted`) con dos pesos de
borde. El `surface` claro es blanco puro a propósito: es papel, no gris.

### Named Rules

- **La regla del relleno y la tinta.** Todo color de acento tiene dos formas: el relleno
  (`primary`, `data`) y la tinta (`primary-ink`, `data-ink`). Si algo es texto, borde o anillo
  de foco, usa la tinta. Sin excepciones: el bug que originó la regla fue verificar el
  contraste solo en el tema oscuro.
- **La regla del tablero.** Sobre `board` la paleta de superficie no aplica. `chalk`,
  `chalk-dim`, `primary` y `live-on-board` son los únicos colores legales encima, en los dos
  temas. Los componentes que aparecen en un encabezado y también dentro de la página llevan una
  variante explícita (`onBoard`), no una clase adivinada.
  **La pizarra es oscura en los dos temas y eso es una consecuencia, no un gusto:** medido, la
  tiza sobre un verde de L 0,556 daba 4,43:1 y el verde de "en vivo" 1,23:1, o sea invisible.
  A L 0,362 la tiza llega a 10,3:1, el lima a 8,2:1 y `live-on-board` a 4,6:1.
- **El color nunca es el único canal.** Amarilla y roja llevan forma de tarjeta además de
  color; el estado en vivo lleva un anillo que late además del verde; la forma de un equipo
  lleva la letra V/E/D dentro del chip.

## Typography

**Oswald** condensada para marcadores, títulos y todo lo que se lee de lejos; **Archivo** para
el resto. Las dos autoalojadas y precargadas, con un fallback de métricas ajustadas
(`size-adjust`, `ascent-override`) para que el texto no salte cuando llegan.

### Hierarchy

| Paso | Uso |
|---|---|
| `score` clamp(3rem, 9vw, 5.25rem) | el marcador del hero del partido, y nada más |
| `display` clamp(2rem, 4vw, 2.75rem) | el h1 de cada página |
| `xl` 1.375rem | encabezados de sección |
| `base` 1rem / 1.6 | prosa y análisis |
| `sm` 0.875rem | filas, tablas, controles |
| `2xs` 0.6875rem + `tracking-label` | etiquetas en mayúsculas |

### Named Rules

- **La regla del dígito.** Oswald no trae la función `tnum` —está verificado sobre el binario:
  solo declara `frac`— así que `font-variant-numeric` no hace nada sobre ella y su "1" mide 378
  contra 517 del "0". Los marcadores se arman con celdas de `--a-digit-cell` para que un 9 que
  pasa a 10 no mueva nada.
- **El guion del marcador es texto.** `–` va en el DOM, no en un `content:` de CSS: si no, no
  es seleccionable, no es legible para un lector de pantalla y ningún test lo ve.
- **Mayúsculas solo con tracking.** Todo lo que va en `uppercase` lleva `tracking-label`; sin
  eso las mayúsculas se apiñan.

## Layout

El ancho completo no puede ser literal: texto a 2560px no se lee. La regla es un contenedor de
tres medidas — `wide` **1920px** para el chrome, la cancha y las grillas; `content` **1600px** para
todo lo que se lee; `prose` 68ch para la narrativa de la IA dentro de su tarjeta.

1600px se quedaba corto: con el zoom al 67% —que es como se mira un 1920 de cerca— la ventana pasa a
2865px CSS y sobraban 600px de margen a cada lado.

**Dos rieles, no uno.** El chrome —header, tira de partidos, pie— ocupa `wide`; la banda de la
entidad y el cuerpo de la página van en `content`. Cuando todo compartía `wide`, nada estaba
"adentro" de nada: el header, la banda y la tabla de posiciones arrancaban en el mismo píxel y la
página se leía como una sola hoja. Con los dos rieles la banda sobresale ~160px del contenido a cada
lado, y esa diferencia **es** la jerarquía. Los dos rieles de lectura sí se alinean entre sí: el
escudo de la banda arranca donde arranca su propia página.

El fondo cruza toda la pantalla y el contenido respeta su medida: un encabezado de entidad es
una `<section>` a sangre con un contenedor adentro, nunca un `div` con márgenes automáticos.

### La escalera

Cinco peldaños, y cada uno se distingue del anterior por algo distinto:

| Peldaño | Qué lo separa |
|---|---|
| marco (chrome) | `wide`, fondo `banda`, a sangre |
| banner de la entidad | fondo `banda` a sangre, contenido en `content`, y un **labio de 3px en `primary`** abajo |
| cuerpo | `content`, sobre `bg`; las columnas se separan con `gap-7`, las tarjetas de adentro con `gap-4` |
| tarjeta | `surface` + filo de `border`, sin sombra |
| fila | `rounded-md` y `hover:bg-bg-subtle` |

El labio existe porque un hairline de `banda-edge` es azul sobre azul y no rankea nada: la costura
más importante de la página era invisible. Y el cuerpo arranca a `pt-7` de la banda, no a `pt-3`:
un bloque de cien píxeles con el contenido pegado a doce se lee como desborde del header.

El contraste entre `bg` y `surface` es **4%** de luminancia. Estuvo en 1,5% —`oklch(0.985)` contra
`oklch(1)`— y con eso las tarjetas no se despegaban del piso: la página entera parecía un solo
plano con rayas. Si `bg` sube, `bg-subtle` sube con él o el hover de fila desaparece.

Las grillas de listado van a `lg:grid-cols-2 2xl:grid-cols-3` con `items-start`: sin eso las
tarjetas se estiran a la altura de la más alta y una competencia con un partido queda con
medio metro de vacío.

Espaciado derivado de un `--spacing` único de 0.25rem. Breakpoints de Tailwind más `3xl` a
1800px.

## Elevation & Depth

Se declara una vez y no se mezcla: **lo plano lleva filo de tiza y ninguna sombra; lo que es
objeto lleva sombra y ningún borde.**

### Shadow Vocabulary

| Token | Valor | Para qué |
|---|---|---|
| `elev-card` | `0 1px 2px -1px …/0.1` | la tarjeta, y el chip activo de un segmentado |
| `elev-magnet` | `0 1px 2px …/0.22, 0 4px 10px -3px …/0.2` | la ficha del jugador sobre la cancha |
| `elev-panel` | `0 6px 24px -8px …/0.24` | el mega-menú y el cajón |
| `elev-modal` | `0 20px 56px -12px …/0.34` | la ficha en `<dialog>` |

En tema oscuro las tres suben de opacidad: una sombra calculada para papel desaparece sobre
slate.

### Named Rules

- **La regla del objeto.** Si algo tiene sombra, no tiene borde. Si tiene borde, no tiene
  sombra. Un elemento con los dos parece un recorte pegado. La excepción declarada son las
  plaquitas de escudo **sobre la banda**: ahí la sombra al 10% no se ve y el anillo es lo único
  que les da filo.
- `shadow-card` se escribía en siete lugares sin existir como token, así que no pintaba nada: el
  chip activo de `SelectorFase`, de `BloqueGrupos` y del riel de continentes no se levantaba de su
  carril. Una clase de Tailwind que no tiene token detrás no falla, simplemente no hace nada.
- El header es **opaco** (`bg-banda`, sin `backdrop-blur`): sobre un fondo sólido el desenfoque no
  aporta nada y cuesta una capa de composición en cada scroll.

## Shapes

Radios medios y sin exageración: `md` 0.5rem para tarjetas y filas, `lg` 0.875rem para
contenedores grandes, `xl` 1.125rem para el modal, `full` solo en controles chicos, chips e
imanes. Nada de esquinas rectas ni de píldoras gigantes.

La geometría recurrente es la de la cancha: proporciones reglamentarias 105 × 68 en el
`viewBox`, franjas de césped alternas, y las mismas marcas rotadas 90° para la variante
vertical de móvil. Cada forma trazada lleva `pathLength="1"`, que normaliza el largo para que
todas tarden lo mismo al dibujarse; en un `<g>` ese atributo no existe y el guion se
interpretaría en unidades del viewBox, o sea una cancha punteada.

La marca es un búho geométrico dentro de un escudo. La muesca superior se lee a la vez como
las orejas del búho y como el jefe de un escudo de club; el pico triangular hace de vértice de
una "A"; la barra de la ceja es el único elemento en lima. Tres niveles: completo desde 32px,
compacto a 24px, y un favicon de 16px sin trazos —a ese tamaño desaparecen— con los ojos y el
pico calados por `fill-rule="evenodd"`.

## Components

### Buttons
- **Shape:** `rounded-md` (0.5rem); los de icono, `rounded-md` con `p-1.5`.
- **Primary:** `primary` de fondo con `primary-contrast` de texto (14:1), `px-3 py-1.5`.
- **Hover / Focus:** el primario baja opacidad a 90%; los demás cambian a `bg-canvas-subtle`.
  El foco es un `outline` de 2px en `primary-ink` con `outline-offset: 2px`, visible solo con
  teclado.
- **Ghost:** sin fondo, `text-ink-muted`, gana fondo y tinta plena al pasar el cursor.
- **Sobre el tablero:** variante `onBoard` con borde `chalk/30` y tinta `chalk`.

### Chips
- **Estado en vivo:** `bg-live/12`, texto `live-ink`, `rounded-full`, con un punto de 6px que late
  con `live-pulse` (un anillo que se expande, no un fade: un fade parece "cargando").
- **Forma de un equipo:** cuadrados de 16px con la letra V/E/D; lima para victoria,
  `border-strong` para empate, `card-red/85` para derrota.
- **Nota de rendimiento:** ≥7,5 en `primary`; 6,5–7,4 en `canvas-subtle`; menos en
  `card-red/15` con `card-red-ink`.

### Cards / Containers
- **Corner Style:** `rounded-lg` los contenedores, `rounded-md` las filas de su interior.
- **Background:** `surface`; el encabezado interno se separa con `border-b border-border`.
- **Shadow Strategy:** ninguna. Son planos: filo de tiza. `shadow-card` existe para lo que **sí**
  es objeto —el chip activo de un segmentado, la plaquita del escudo—, no para la tarjeta.
- **Internal Padding:** `p-4` la tarjeta; `p-1` cuando solo contiene filas, para que el hover
  de la fila llegue al borde.

### Inputs / Fields
- **Style:** `bg-canvas-subtle`, borde de 1px, `rounded-md`, icono absoluto a la izquierda.
- **Focus:** el borde pasa a `primary-ink`. **El ancho no se anima:** un campo que crece al
  enfocarlo se lee como recortado antes de tocarlo. Ancho fijo de 18rem y el atajo `/` en un
  `<kbd>` a la derecha.
- **Los placeholders no llevan puntos suspensivos:** "Buscar…" parece texto cortado, no una
  invitación. Se escribe entero: "Buscar equipos o jugadores".

### Navigation
- Header pegajoso y translúcido, altura 4rem, y **nada de navegación colgando de él**: logo,
  buscador y sesión. El catálogo vive en la barra lateral de la home, que es donde alguien lo
  busca.
- **Las copas de la confederación viven dentro de su continente y arriba de los países:** la
  Libertadores es fútbol sudamericano, no "internacional", y quien abre Sudamérica la espera ahí.
  Van ordenadas por jerarquía real —Champions antes que Conference, Libertadores antes que Recopa—,
  no alfabéticamente. Solo el Mundial de Clubes queda en su propia sección, porque cruza todas las
  confederaciones.
- **Barra lateral de la home:** Hoy · Favoritos · Competencias. Cada liga con su escudo; "ver los
  partidos de hoy" va **al final y en gris**, porque es una salida y no el contenido —arriba y en
  lima competía con las ligas, que es lo que la gente viene a buscar—.
- **Los favoritos se agrupan por país**, con bandera y escudo, y aceptan ligas y equipos. Una lista
  plana con una liga peruana y un equipo argentino no dice de dónde es cada cosa. El árbol continente → país →
  liga son `<details>` anidados, así que abrir y cerrar no cuesta JavaScript, y se abre solo por
  donde está la selección. Una liga se abre **en el mismo contenedor** (`?liga=`) con un resumen
  —tabla recortada, lo que viene, últimos resultados— y un botón a la vista completa: mirar la
  Liga 1 no debería costar perder de vista el resto del día.
- **En móvil los partidos van primero.** La barra lateral pasa a `order-2`: nadie baja ocho
  países para llegar a lo que vino a ver.
- El activo se marca con `aria-current="page"` y fondo `primary/12`, no solo con color.
- Las pestañas del partido son **enlaces reales** con `?vista=`: cada panel es indexable,
  compartible y cuesta 0 KB.

### El riel de la home: goleadores por región

"Lo mejor de hoy del mundo" tenía dos problemas de raíz: a quien mira desde Lima la mejor nota de la
MLS no le mueve nada, y el podio dependía de que ya hubiera terminado algún partido —a media mañana
mostraba el de anteayer—.

Manda la **tabla de goleadores de la temporada**, que es lo segundo que mira un hincha después de las
posiciones y que no caduca a media mañana, con un **selector de región que arranca en la propia**
(Sudamérica). Suma lo que cada futbolista hizo en todas las competencias de esa región —liga, copa
nacional y copa continental—, que es como lo cuenta un hincha: "lleva veinte esta temporada". El
selector son enlaces (`?region=`), así que la elección queda en la URL y cuesta 0 KB.

Lo mejor del último día jugado queda abajo como complemento, en tres líneas, y ahí sí ordenado por
lo que hizo y no por la nota:

### Cómo se ordena "lo mejor del día"

La nota sola no le dice nada a nadie: ponía arriba a un defensor con 7.6 que no tocó la pelota y
dejaba afuera al que hizo dos goles. El orden es **goles × 2 + asistencias + nota/10**, la fórmula
está a la vista en el código, y cada fila dice **por qué está ahí** —"2 goles · Copa do Brasil",
"3 asistencias"— en lugar de un número abstracto.

Y las ligas favoritas suben al principio, en el cliente: el servidor no puede saberlas y sin eso la
queja es justa —"salen jugadores de ligas que no me interesan"—. Se reordena, no se filtra: si
alguien hizo dos goles en otra parte, sigue estando.

### La marquesina de la tira

Los partidos del día pasan como en el zócalo de la tele: escudo, nombre corto, marcador o hora, y el
minuto si está en juego. Es **CSS puro** —dos copias de la lista y un `translateX(-50%)` al infinito,
así que el corte nunca se ve— y por lo tanto **0 KB**. Se detiene al pasar el cursor o al enfocar
—si algo interesa hay que poder leerlo y hacerle clic—, los bordes se desvanecen con una máscara
porque cortado a filo el partido de la punta parece un error de maquetado, y con
`prefers-reduced-motion` se queda quieta y se puede arrastrar.

La duración crece con la cantidad de partidos (`--partidos`), así que la velocidad de lectura no
depende de cuántos haya.

### El once de la fecha

Dentro de una liga, "lo mejor del día" de todo el mundo no dice nada: quien abre la Liga 1 quiere lo
de la Liga 1. El riel cambia de contenido según dónde estés, y lo más futbolero que se puede armar
con lo que hay —notas por jugador y su puesto— es **el equipo ideal de la última jornada**: un
arquero, cuatro defensores, cuatro volantes y dos delanteros, cada uno el mejor calificado de su
puesto, en el orden en que se lee una alineación.

Las fichas son **botones**, no enlaces: el clic abre la ficha del jugador con las estadísticas **de
ese partido** —el partido por el que entró al once—, no su perfil. El payload viaja en `data-ficha`,
así que abrirla no cuesta una llamada, y es el mismo `<dialog>` que usa la cancha del partido.

Se dibuja **sobre la cancha, vertical**: vive en un riel de 24rem, donde una cancha a lo ancho deja
fichas de 60px. La geometría es la misma función del dominio que usa el partido, así que las
distancias entre líneas son las de una cancha de verdad y no una lista disfrazada; la formación sale
de lo que dio la jornada (4-4-2, 4-3-3) y se muestra como insignia. Si no cierra en once, cae a la
lista por puesto: media cancha con seis fichas no es una alineación.

Los dos rótulos de cada ficha van en **una sola plaquita oscura**: el nombre del equipo suelto sobre
el césped quedaba por debajo del contraste mínimo a 9px.

Dos decisiones de dato: se prefiere la última jornada con **tres o más partidos** jugados —la fecha
en curso arranca con uno y un once salido de ahí sería el once de ese partido—, y el pie dice que la
nota es del proveedor, no de Athena.

### Vistas dentro de la home

Liga, equipo y jugador tienen su versión simplificada en la home (`?liga=`, `?equipo=`, `?jugador=`),
con el mismo esqueleto: cabecera sobre la pizarra con el favorito y la salida a la vista completa,
cifras, y listas compactas. Se llega desde cualquier parte —una tabla, un goleador, el once, lo mejor
del día— y **nunca se sale de la página**: la barra lateral y el día siguen ahí.

### Escudos de competencia

Los logos del proveedor son PNG pensados para fondo blanco y **muchos son negros macizos** —Copa de
la Liga, Supercopa do Brasil, media docena más—: en tema oscuro desaparecían, y sobre la pizarra
también. Todos van sobre una plaquita de `chalk`, que es casi blanco en los dos temas, así que
cualquier logo se lee sin tener que saber de qué color es. Un componente, todos los lugares.

### La página de una competencia

Tres zonas, y en pantallas anchas las tres en fila: **tabla · los que deciden · partidos**. En una
sola columna la tabla se estiraba a 1200px para poner nueve números, con un hueco en el medio entre
el nombre del equipo y las cifras, y media pantalla vacía debajo.

Ese hueco lo llena **la tabla de goleadores y asistencias**: datos que ya estaban en la base —vienen
con la bio del jugador— y no se mostraban en ninguna parte, siendo lo segundo que un hincha busca
después de las posiciones.

Las columnas numéricas llevan ancho fijo y se agrupan a la derecha: repartidas por todo el ancho, la
fila se leía como un formulario.

### La home con una liga abierta

El centro cuenta **qué pasa** y el riel derecho guarda **cómo va**. Al revés —como estaba— para
llegar a la fecha de hoy había que pasar por dieciocho filas y nueve columnas de tabla.

En el centro: **próximos partidos**, **últimos resultados** y **los que deciden**, en ese orden. Los
partidos van en una sola columna con la fila ancha del sitio (`MatchRow`), con tope de 42rem: a 830px
los nombres quedaban flotando lejos del marcador. Ocho de cada bloque entran en el alto que antes
ocupaban tres apilados en media columna.

La **fila de partido es responsive**: enfrentados desde `sm`, apilados debajo. En un teléfono,
"Sporting Cristal" contra "Sport Huancayo" a los costados del marcador dejaba "Sporting Cri…" y
"Sport Huanc…". Es la misma grilla con distinta colocación y no dos bloques: duplicar el DOM
duplicaría también los enlaces, y los recorridos de lectura eligen "el primero" de cada tipo.

En el riel: **la tabla** —variante compacta de cinco columnas, con scroll propio para los dieciocho
equipos y un pie que lleva a la completa— y debajo **el once de la fecha**. Entre 1024 y 1279px el
riel ocupa las dos columnas y reparte sus tarjetas en dos, porque ahí caía en una columna de 16rem y
la cancha se dibujaba de 256px.

En móvil el orden es contenido → tabla y once → catálogo: el árbol de navegación se leía en medio de
la lectura.

### La home con un equipo abierto

El mismo orden que la liga: la cabecera con cómo va, después **próximos partidos** y **últimos
resultados** a todo el ancho —una fila por partido, con el equipo en negrita para ver de qué lado
jugó—, después **los goleadores del club** y al final **la plantilla**.

En el riel, **con qué salió**, sobre la cancha, con flechas para recorrer las últimas cinco
fechas. Es la pregunta que se hace un
hincha cuando abre a su equipo, y el dato estaba en la base sin que ninguna vista fuera del partido
lo mostrara. Reemplaza a los goleadores del mundo, que ahí no dicen nada: quien vino a ver a Alianza
no vino a ver quién la rompe en Europa.

Se dibuja con el **`grid` del proveedor**, no con los puestos deducidos: un 4-1-3-2 se ve como un
4-1-3-2, con el volante tapón donde jugó. Cada ficha lleva su dorsal y su nota de ese partido y abre
las estadísticas de **ese** encuentro, no el promedio de la temporada. Es la misma cancha del once
ideal (`CanchaOnce`), que ahora acepta la formación y las casillas cuando existen.

En una alineación el rótulo del equipo se omite bajo cada ficha: repetir "LIM" once veces no informa
de nada.

**Las flechas van en orden de calendario**: la izquierda es el partido anterior y la derecha el
siguiente, y la tarjeta abre en el más reciente, así que la derecha arranca deshabilitada. En lugar de
un "1 de 5" —que no decía de qué— hay cinco puntos: dicen dónde estás y permiten saltar directo a
cualquier fecha.

**Las flechas no navegan.** Las cinco alineaciones vienen en el HTML y el botón solo cambia de panel:
el clic es instantáneo. No encarece la entrada porque las fotos de los paneles ocultos no se piden
—un `loading="lazy"` dentro de un `display:none` nunca intersecta la pantalla, medido: once fotos al
entrar, no cincuenta y cinco— y porque el payload de cada ficha viaja sin sus nulos. La fecha se
escribe en la URL solo cuando alguien toca una flecha, así que el enlace de siempre queda limpio y el
que se comparte después de moverse abre ese partido.

**El banco va fuera de la cancha**: el proveedor manda a los suplentes sin casilla, así que ponerlos
en el césped sería inventar dónde estuvieron. Cada uno lleva su minuto de entrada y a quién
reemplazó, y a los que no jugaron se los ve en gris. Al titular que salió le queda su minuto sobre la
ficha, en rojo.

**La ficha del jugador se abre dentro de la cancha** y solo la cancha se difumina: el resto de la
página queda a la vista, que es lo que uno quiere mientras compara. Es **chica y sin scroll** —21rem,
las estadísticas en dos columnas, un solo enlace al perfil—: una ficha que hay que desplazar tapa el
partido sin dejar ver nada, y el punto de abrirla sobre la cancha es no perder de vista la cancha. Sigue siendo un `<dialog>` con
`showModal()` —el foco atrapado, el Escape y la vuelta del foco al imán son del navegador— y por eso
mismo vive en el nivel de página: al estar en la capa superior, el `filter` de la cancha no lo
alcanza. Se posiciona con variables leídas del rectángulo de la cancha, acotado a la parte visible de
la pantalla. Cuando el imán no está en una cancha —la tabla de rendimiento— o la cancha es más chica
que 260×300, se comporta como siempre: centrada, con el fondo oscurecido.

### Las notas sobre el césped

Seis escalones **macizos** (`lib/nota.ts`): dorado con aro en el 10, cian de 9 a 10, lima de 8 a 9, un
verde lima más oscuro de 7 a 8 (`--a-color-rating-good`), neutro de 6 a 7 y rojo por debajo. Arriba del
lima hacen falta dos escalones más porque un 9 no es un 8 y un 10 es una vez al año: el cian —el color
con el que Athena marca los datos— rompe con todos los verdes de la cancha, y el dorado con aro es el
único chip que no se parece a ningún otro. Antes eran dos y
medio y el único que se distinguía de un golpe era el rojo: un 6,6 y un 7,4 se veían igual. Macizos y
no translúcidos: sobre el césped, un chip transparente se ve desvaído —como si el dato estuviera
apagado— en lugar de bueno.

**La figura del partido lleva estrella dorada**, y solo ella: marcar también al segundo y al tercero convierte
la cancha en un ranking, y para eso ya está la nota de cada uno. El gol pasó a mostrar **el número** en
lugar de un punto, porque el punto se leía como si marcara al jugador destacado.

### Las etapas de una copa

Una fase previa, una fase de grupos y una llave de octavos no son rondas comparables, y mostrarlas en
fila decía algo falso: que después de la fase previa 3 vienen los octavos, cuando en el medio está la
fase de grupos. Ahora cada ronda tiene su **etapa** —`previa`, `grupos`, `final`— y la página se
ordena sola: **primero la etapa que se está jugando**, después el resto por importancia (final,
grupos, previa). Cuando arranque la próxima temporada, los grupos pasan primeros y el cuadro dice que
todavía no está definido.

El vocabulario vive en `packages/domain/src/rounds.ts` y salió de mirar los **147 strings distintos**
que el proveedor usó para las mismas nueve copas. Lo que arregló:

- `8th Finals` y `16th Finals` son octavos y dieciseisavos: caían en la regla de la final y el Mundial
  de Clubes 2025 mostraba "Final" dos veces, con los octavos después de la semi.
- `Knockout Round Play-offs` es el repechaje de febrero, posterior a la fase liga, no la previa de
  agosto: los dos terminan en "Play-offs" y compartían regla.
- `1st/2nd/3rd Round` son las fases previas de la Libertadores hasta 2025 —el proveedor pasó a
  `Qualification Round N` en 2026— y no entraban al cuadro.
- `League Stage` y `League Phase East/West` son la fase liga del formato nuevo: son grupos, no una
  ronda desconocida ordenada después de la final.
- Las cinco variantes de "Preliminary" son rondas distintas: la CAF juega dos en la misma temporada.

De 473 rondas cargadas queda una sin clasificar: `R66244`, que es basura del proveedor y merece
quedar afuera.

**El cuadro se dibuja hasta la final.** Con ocho llaves en octavos se sabe que vienen cuartos, semis y
final, porque una eliminatoria se parte en dos cada vez: esas columnas aparecen vacías y marcadas "por
definir". Solo cuando el número de llaves es potencia de dos —si no, la escalera no es deducible y
suponerla sería inventar.

**La llave entera es clickeable** y abre el partido dentro de la copa (`?partido=`): antes el único
enlace eran los veinte píxeles del casillero del marcador. Los nombres de equipo, encima, abren al
equipo dentro de la copa.

**La página de una copa son dos columnas**: a la izquierda lo que pasa en la cancha —los próximos
partidos y el camino del torneo—, a la derecha quiénes lo deciden (goleadores y once del torneo, uno al
lado del otro) con los últimos resultados debajo ocupando los dos. La segunda mide 40rem justamente
para que a la primera le queden los mil doscientos píxeles que el cuadro necesita para mostrar cuatro
rondas sin desplazarse.

**El partido de la copa se abre dentro de la copa** (`?partido=`): marcador, cancha, minuto a minuto e
historial, y un botón a la página del partido para las pestañas y el análisis. Reemplaza el contenido
de la primera columna en lugar de sumarse arriba, así la página no tiene dos temas a la vez.

**En el riel de la home** la copa se lee con dos pestañas —cuadro y grupos— abiertas en la etapa en
juego, y el cuadro se recorre **ronda por ronda** con flechas: una Copa del Rey en dieciseisavos son
dieciséis llaves, y apilar todas las rondas hacía un riel de tres pantallas. La ronda entra desde el
lado al que se fue, que es lo que la hace leer como un movimiento y no como un salto. Con los octavos en marcha, la tabla de la fase de grupos cerrada en mayo no dice nada; con los
grupos en marcha, el cuadro todavía no existe. La pestaña sin datos explica por qué.

### La copa internacional

Una copa no se lee como una liga. Lo que trae a alguien a la página de la Libertadores es **quién
juega con quién y cómo sigue**, y eso no lo contesta una tabla: lo contesta el cuadro.

**El cuadro** va a todo lo ancho y arriba, con las rondas en columnas de la más lejana a la final y
desplazamiento horizontal propio: una copa africana tiene seis rondas y apiladas la página se vuelve
un scroll donde se pierde el sentido de avance. Cada llave muestra la ida, la vuelta, el global y
quién pasó.

**Quién pasó se deduce de la ronda siguiente, no del resultado.** Si el equipo aparece más adelante,
avanzó. Es la única forma honesta de resolver una llave que se definió por penales, dato que el
proveedor no publica en el partido. Cuando el global quedó igualado, el pie de la llave dice quién
pasó en lugar de inventar una tanda.

**No hay líneas que unan una llave con la siguiente.** El cuadro real tiene fases previas, grupos y
equipos que entran más tarde: cualquier línea prometería un árbol perfecto que no existe. Lo que sí
se dice es cuántos equipos deja cada ronda, cuál se está jugando y quién sigue vivo.

**Colores propios por torneo** (`lib/coloresCompetencia.ts`): doce paletas curadas a mano —el
proveedor solo manda el logo— con un color de cabecera y un acento. Se usan en el lavado de la
cabecera, el rótulo de la ronda en juego, la marca del que pasó y la nota del jugador del torneo;
nunca detrás de un texto largo. Una liga no entra: la paleta devuelve null y la página se ve como
siempre. La cabecera lleva además el apodo del torneo —"La Gloria Eterna"— como antetítulo.

**Los ocho grupos se muestran juntos y compactos** (posición, equipo, PJ y puntos). Con el
segmentado de fases se veía un grupo de cuatro equipos estirado en mil píxeles y el resto de la
columna vacío; una copa se quiere leer entera de un golpe.

**El once del torneo, no el de la fecha.** En una copa el once que importa es el de toda la
temporada, con su jugador del torneo destacado: responde "quién fue este torneo" y de paso evita dos
canchas en el mismo riel. La cancha es el mismo componente en los dos casos
(`components/pitch/CanchaOnce.astro`), porque son dos preguntas distintas sobre las mismas
posiciones.

**El archivo** son enlaces `?temporada=`, y solo se ofrecen los años que tienen partidos en la base:
un año vacío es una promesa que la página no puede cumplir.

### Fases de una temporada

Una temporada puede tener varias tablas y no todas significan lo mismo: **fases en secuencia**
(Apertura y Clausura; en Uruguay, además Intermedio, Anual y Promedios), **grupos simultáneos** (los
ocho de la Libertadores) y **conferencias simultáneas** (Este y Oeste de la MLS).

La que se abre es **la que se está jugando**, y eso no se decide mirando la tabla sino el calendario:
la jornada del próximo partido nombra la fase (`Clausura - 4`). Cuando la jornada no nombra ninguna
tabla —`Group Stage - 6`, `Regular Season - 18`— es la señal de que los grupos son simultáneos y no
hay nada que priorizar. Vive en `packages/domain/src/standings.ts`, testeado contra las competencias
reales.

El control es un **segmentado de enlaces** (`?tabla=`), no un selector hidratado: la fase queda en la
URL, el enlace es compartible y la página sigue costando 0 KB. La fase en juego lleva un punto verde.
La cabecera dice siempre en qué fecha va —"Clausura · fecha 4"—, porque la confusión original fue
justamente esa: la etiqueta "Apertura" en gris chico no alcanzaba para darse cuenta de que la tabla
era de otro torneo.

### Los partidos en un riel angosto

Enfrentados —local a la izquierda, visitante a la derecha— dos nombres y un marcador necesitan 40rem.
En menos, el proveedor gana: "Sport Huanc…", "Club Deporti…". Por debajo de esa medida los equipos
van **uno encima del otro** con la hora a la izquierda y el marcador a la derecha
(`ListaPartidosCompacta`), que es la misma forma que usan las tarjetas de la pizarra. Es la solución
al mismo problema en cuatro lugares: la vista de liga, la de equipo, la competencia y el hero.

### Hero de la home

Tres niveles y nada más: el título condensado a `text-5xl`, una línea en lima que dice qué hace
distinta a esta web ("Y por qué terminó así cada uno") y una línea gris con la fecha, el recuento y
los que están en juego.

**Las cifras grandes se probaron y se descartaron.** "24 partidos · 11 competencias" en versalitas y
`text-3xl` era un dato sobre la base de datos, no sobre el fútbol: a nadie le cambia el día saber
cuántos torneos hay cargados. Ese espacio lo ocupa ahora **lo que pasa a esta hora** —los partidos en
juego, y si no hay ninguno, los que arrancan en un rato—, que es información que caduca y por eso
vale.

### Iconos de continente

La silueta del continente, como se ve en un mapamundi. Antes eran globos con el meridiano corrido y
el problema fue evidente en cuanto se pusieron uno debajo del otro: **seis círculos casi idénticos no
distinguen nada**. Cada contorno está simplificado a la docena de vértices que sobreviven a 14px —el
ancho del norte y el pico del sur en Sudamérica, el Cuerno en África, las penínsulas de Europa, la
India en Asia— y normalizado para llenar la misma caja, así que ninguno parece más importante que
otro. El aro del globo aparece recién desde 20px; abajo le come el aire a la silueta. Internacional
no es un continente: ahí el globo entero sí es el dibujo.

### El partido en vivo se rehace solo

El marcador y el minuto a minuto los refresca la isla, pero la cancha, las notas y las estadísticas
las dibuja el servidor: sin nada más, los números se quedaban en el minuto en que abriste la página
—justo cuando la gente está mirando el partido—. Mientras está en juego, la página **se recarga cada
60 segundos**, y como la vista en vivo se cachea quince segundos, cada recarga trae datos nuevos por
una consulta a Redis.

Nunca recarga con la ficha abierta ni con la pestaña de fondo —sería robarle el foco a alguien que
está leyendo— y **se avisa**: una página que se mueve sola sin decirlo se siente rota.

### Cargando

Dos animaciones distintas, porque son dos cosas distintas:

- **Navegar:** una pelota rueda por la línea de banda en el borde superior. Aparece recién a los
  180 ms —con las vistas cacheadas la mayoría de las navegaciones terminan antes, y un indicador
  que parpadea en cada clic se siente más lento que ninguno.
- **Abrir la ficha:** el `<dialog>` crece desde 0.96 con `@starting-style` mientras el backdrop se
  desenfoca. Nada rueda: la ficha no viaja a ninguna parte, ya estaba en la página.

### Cancha interactiva (componente firma)

Dos SVG de marcas —horizontal desde `sm`, vertical abajo— y **una sola capa de jugadores**. La
posición viaja en dos variables CSS (`--largo`, `--ancho`) y la orientación las intercambia con
una media query, así que la cancha vertical no cuesta un segundo juego de veintidós fichas con
su JSON.

Cada jugador es un `<button>` de HTML en una capa absoluta, **no un nodo del SVG**: foco real,
área táctil de 44px, texto que escala y accesibilidad sin `foreignObject`. Lleva su dorsal, su
apellido, la nota si existe, un punto lima por gol y la forma de la tarjeta si la recibió. El
payload completo viaja en `data-ficha`, así que abrir la ficha no cuesta una llamada.

La geometría vive en `packages/domain/src/pitch.ts`, pura y testeada, con una escalera de
degradación: grid del proveedor → derivar de la formación → esconder la cancha y mostrar la
lista. Una cancha con nueve jugadores mal puestos es peor que ninguna cancha.

### Ficha del jugador

Un `<dialog>` nativo: trampa de foco, Escape, backdrop y capa superior salen del navegador.
Tres destacados arriba (minutos, nota, goles), una lista de pares abajo, y el estado en el hash
para que el enlace sea compartible. Se abre por delegación de eventos, así que funciona igual
para las fichas del servidor y para las que reemplace la isla en vivo.

## Do's and Don'ts

### Do:
- **Do** usar `primary-ink` para cualquier texto, borde o foco en lima, y reservar `primary`
  para rellenos. Sobre blanco el lima puro da 1,3:1.
- **Do** declarar la variante `onBoard` cuando un componente aparece sobre `board`: la paleta
  de superficie es ilegible ahí en los dos temas.
- **Do** poner `items-start` en toda grilla de tarjetas de altura desigual.
- **Do** usar el enlace estirado (contenedor `relative`, enlace principal `absolute inset-0`,
  secundarios con `relative` encima) cuando una fila entera debe ser clickeable pero además
  contiene enlaces a los equipos. Anidar un `<a>` dentro de otro es HTML inválido.
- **Do** dar a cada icono de evento un `<span class="sr-only">` con su nombre: el color no
  puede ser el único canal.
- **Do** verificar el contraste en los **dos** temas antes de fijar un color. `a11y.spec.ts` audita
  los dos; lo que no pasa ahí no entra.
- **Do** preguntarse, antes de tocar un token de acento, si lo que se está pintando es marca,
  semántica o sustrato. Solo la marca lleva el azul.

### Don't:
- **Don't** usar emojis como iconos. Todo icono es un SVG en línea desde el registro de
  `src/icons`, hereda `currentColor` y no fija un hex. Hay un test E2E que lo verifica en cada
  ruta.
- **Don't** poner borde y sombra en el mismo elemento.
- **Don't** animar `width` para una barra: se usa `transform: scaleX()`. Animar `width` obliga
  al layout en cada cuadro.
- **Don't** usar curvas con rebote (`cubic-bezier(…, 1.4, …)`). El sobrepaso del imán vive en
  los keyframes de escala; una curva con rebote hace que todo lo demás se mueva como un
  juguete.
- **Don't** mover el guion del marcador a un `content:` de CSS.
- **Don't** dejar más de un `aria-label="Cambiar tema"` por página: los espejos del cajón y del
  pie usan otra etiqueta.
- **Don't** dejar una imagen sin origen en el HTML esperando que alguien le quite el `hidden`:
  se crea en tiempo de ejecución con `createElement`.
- **Don't** hidratar una isla para un toggle. El botón de favorito y el cambio de tema son
  vanilla; las páginas de entidad se quedan en 0 KB de JavaScript.
