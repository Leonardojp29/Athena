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
  primary: "oklch(0.906 0.191 118)"
  primary-ink: "oklch(0.462 0.128 128)"
  primary-contrast: "oklch(0.15 0.005 285)"
  data: "oklch(0.792 0.121 208)"
  data-ink: "oklch(0.512 0.118 232)"
  board: "oklch(0.362 0.062 158)"
  board-edge: "oklch(0.298 0.055 158)"
  chalk: "oklch(0.992 0.002 95)"
  pitch: "oklch(0.556 0.092 156)"
  pitch-dark: "oklch(0.522 0.088 156)"
  magnet: "oklch(1 0 0)"
  live: "oklch(0.598 0.17 150)"
  live-on-board: "oklch(0.723 0.196 150)"
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

De la pizarra salen tres materiales y cada uno tiene una regla propia. La **tiza** dibuja lo
plano: bordes de un píxel, líneas de cancha, separadores. El **tablero** es la superficie a
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

### Primary
`primary` `oklch(0.906 0.191 118)` es lima de marcador: el relleno de la acción, el trazo del
logo, el resaltado del rendimiento alto. **Es relleno, nunca texto sobre blanco:** ahí da
1,3:1. Para texto, enlace, borde y anillo de foco existe `primary-ink`
`oklch(0.462 0.128 128)`, que sobre blanco da 6,4:1 y en tema oscuro vuelve a ser el lima.

### Secondary
`data` `oklch(0.792 0.121 208)` es cian de dato: marca todo lo que dice la IA y nada más. Su
par de texto es `data-ink`. Si el cian apareciera en un botón dejaría de significar "esto lo
dedujo Athena".

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
tres medidas — `wide` 1600px para el chrome, los encabezados a sangre, la cancha y las grillas;
`content` 1440px para el cuerpo; `prose` 68ch para la narrativa de la IA dentro de su tarjeta.

El fondo cruza toda la pantalla y el contenido respeta su medida: un encabezado de entidad es
una `<section>` a sangre con un contenedor adentro, nunca un `div` con márgenes automáticos.

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
| `elev-magnet` | `0 1px 2px …/0.22, 0 4px 10px -3px …/0.2` | la ficha del jugador sobre la cancha |
| `elev-panel` | `0 6px 24px -8px …/0.24` | el mega-menú y el cajón |
| `elev-modal` | `0 20px 56px -12px …/0.34` | la ficha en `<dialog>` |

En tema oscuro las tres suben de opacidad: una sombra calculada para papel desaparece sobre
slate.

### Named Rules

- **La regla del objeto.** Si algo tiene sombra, no tiene borde. Si tiene borde, no tiene
  sombra. Un elemento con los dos parece un recorte pegado.
- El header usa `backdrop-blur-xl` sobre `surface/72` y un hairline de `primary/30` arriba: es
  la única capa translúcida del sistema.

## Shapes

Radios medios y sin exageración: `md` 0.5rem para tarjetas y filas, `lg` 0.875rem para
contenedores grandes, `xl` 1.125rem para el modal, `full` solo en controles chicos, chips e
imanes. Nada de esquinas rectas ni de píldoras gigantes.

La geometría recurrente es la de la cancha: proporciones reglamentarias 105 × 68 en el
`viewBox`, franjas de césped alternas, y las mismas marcas rotadas 90° para la variante
vertical de móvil.

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
- **Estado en vivo:** `bg-live/12`, texto `live`, `rounded-full`, con un punto de 6px que late
  con `live-pulse` (un anillo que se expande, no un fade: un fade parece "cargando").
- **Forma de un equipo:** cuadrados de 16px con la letra V/E/D; lima para victoria,
  `border-strong` para empate, `card-red/85` para derrota.
- **Nota de rendimiento:** ≥7,5 en `primary`; 6,5–7,4 en `canvas-subtle`; menos en
  `card-red/15` con `card-red-ink`.

### Cards / Containers
- **Corner Style:** `rounded-lg` los contenedores, `rounded-md` las filas de su interior.
- **Background:** `surface`; el encabezado interno se separa con `border-b border-border`.
- **Shadow Strategy:** ninguna. Son planos: filo de tiza.
- **Internal Padding:** `p-4` la tarjeta; `p-1` cuando solo contiene filas, para que el hover
  de la fila llegue al borde.

### Inputs / Fields
- **Style:** `bg-canvas-subtle`, borde de 1px, `rounded-md`, icono absoluto a la izquierda.
- **Focus:** el borde pasa a `primary-ink` y el buscador del header se ensancha de 10rem a
  14rem con `transition-all`.

### Navigation
- Header pegajoso y translúcido, altura 4rem. Las competencias destacadas van sueltas; el
  resto en un mega-menú por región construido con `<details>` (cero JavaScript más allá de
  cerrar con Escape y clic afuera). En móvil el mismo `<details>` se vuelve un cajón de altura
  completa.
- El activo se marca con `aria-current="page"` y fondo `canvas-subtle`, no solo con color.
- Las pestañas del partido son **enlaces reales** con `?vista=`: cada panel es indexable,
  compartible y cuesta 0 KB.

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
- **Do** verificar el contraste en los dos temas antes de fijar un color.

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
