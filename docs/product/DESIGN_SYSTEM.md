# Athena — Sistema de Diseño (DESIGN_SYSTEM)

> Entregable de Fase 0. Documenta el razonamiento detrás de `packages/tokens/src/tokens.css` (la única fuente de verdad ejecutable) y las reglas que `packages/ui` y `apps/web` deben cumplir.
> Si este documento y `tokens.css` divergen, **manda tokens.css** y este documento se corrige.
> Referencias de calidad: Linear, Vercel, Stripe, Apple, Notion, Raycast. Athena debe sentirse **premium**, nunca como un dashboard genérico.

---

## 1. Principios de diseño

1. **Comprensión antes que datos.** Cada componente existe para responder una pregunta (¿qué pasó?, ¿por qué?, ¿qué significa?, ¿qué sigo?). Si un widget solo muestra números sin jerarquía ni contexto, está mal diseñado aunque sea bonito.
2. **Calma con momentos de énfasis.** Base neutra y silenciosa (superficies, bordes sutiles, mucho espacio en blanco); el color aparece solo con significado: un gol, una victoria, una tarjeta, un insight. La emoción la ponen el fútbol y la tipografía, no el cromo de la UI.
3. **Jerarquía tipográfica, no decorativa.** La estructura se comunica con tamaño, peso y espaciado — no con cajas, fondos de colores ni bordes gruesos. Menos contornos, más ritmo vertical.
4. **La evidencia es parte del diseño.** Todo insight de IA lleva visualmente adherida su procedencia (chip "Análisis Athena", evidencia desplegable, fecha). Nunca una narrativa "flotando" sin respaldo visible.
5. **Móvil primero, densidad después.** Cada pantalla se diseña primero en 375 px; el desktop gana densidad y columnas, no elementos nuevos. Los toques mínimos: 44×44 px.
6. **Movimiento con propósito.** La animación existe para explicar cambios de estado (llegó un gol, se actualizó la tabla), jamás para adornar. Todo respeta `prefers-reduced-motion`.
7. **Accesible por defecto, no como parche.** WCAG 2.1 AA es requisito de aceptación de cada componente, no una auditoría de Fase 6.

---

## 2. Fundaciones (tokens)

Todo valor visual vive en `packages/tokens` como CSS variable semántica + preset de Tailwind. **Los componentes nunca referencian valores crudos** (`#hex`, `px` arbitrarios, duraciones inventadas): solo tokens.

### 2.1 Color

Paleta en **oklch** (perceptualmente uniforme: los ajustes de lightness entre temas no cambian el matiz).

**Neutrales (estructura):**

| Token | Rol | Light | Dark |
|---|---|---|---|
| `--color-bg` | Fondo de página | `oklch(0.985 0.002 250)` | `oklch(0.16 0.012 260)` |
| `--color-bg-subtle` | Fondos secundarios, filas alternas, wells | `oklch(0.96 0.004 250)` | `oklch(0.2 0.012 260)` |
| `--color-surface` | Tarjetas, popovers, modales | `oklch(1 0 0)` | `oklch(0.22 0.014 260)` |
| `--color-border` | Bordes y divisores | `oklch(0.9 0.006 250)` | `oklch(0.32 0.014 260)` |
| `--color-text` | Texto principal | `oklch(0.22 0.015 260)` | `oklch(0.93 0.005 250)` |
| `--color-text-muted` | Texto secundario, labels, metadatos | `oklch(0.5 0.015 260)` | `oklch(0.68 0.01 250)` |

**Marca y semántica:**

| Token | Valor (light) | Significado en Athena — uso permitido |
|---|---|---|
| `--color-primary` | `oklch(0.55 0.2 265)` — índigo Athena (dark: `0.68 0.18 265`) | Acciones, enlaces, foco, selección, marca. Es el único color "de interfaz". |
| `--color-primary-contrast` | `oklch(0.99 0 0)` | Texto sobre primary. |
| `--color-accent` | `oklch(0.75 0.16 85)` — oro de trofeo | Lo excepcional: líder de tabla, MVP, récords, campeón, momentos destacados. Se usa con avaricia — si todo es dorado, nada lo es. |
| `--color-success` | `oklch(0.62 0.17 150)` — verde cancha | Victorias, goles, indicadores positivos (forma W, subida en tabla). |
| `--color-danger` | `oklch(0.6 0.21 25)` | Tarjetas rojas, derrotas, descenso, errores de sistema. |
| `--color-warning` | `oklch(0.78 0.16 80)` | Tarjetas amarillas, alertas, zonas de riesgo. |
| `--color-info` | `oklch(0.62 0.14 235)` | Estados neutrales informativos (empate, VAR, avisos). |

Reglas:
- El significado futbolístico es **fijo**: verde = gol/victoria, rojo = expulsión/derrota, amarillo = amonestación. Nunca reutilizar estos colores para otra semántica en contexto de partido.
- El color **nunca es el único canal**: toda señal cromática va acompañada de texto, icono o forma (W/E/D en las píldoras de forma, icono de tarjeta, flecha de tendencia). Requisito de daltonismo, no sugerencia.
- Colores de equipos (escudos, franjas decorativas) se aíslan en componentes específicos y jamás compiten con la semántica del sistema.

### 2.2 Tipografía

| Token | Fuente | Uso |
|---|---|---|
| `--font-sans` | Inter Variable → system-ui | Todo el producto |
| `--font-mono` | JetBrains Mono → ui-monospace | Datos tabulares críticos: marcadores, minutos, tablas de stats (con `font-variant-numeric: tabular-nums` para que los números no "bailen" al actualizarse en vivo) |

Escala (de tokens.css) y uso canónico:

| Token | Tamaño | Uso | Peso típico |
|---|---|---|---|
| `--text-4xl` | 2.25rem | Marcador del Match Center, hero de Home | 700 |
| `--text-3xl` | 1.875rem | H1 de página (nombre de jugador/equipo/competencia) | 700 |
| `--text-2xl` | 1.5rem | H2, cifras destacadas de stats | 600–700 |
| `--text-xl` | 1.25rem | H3, títulos de widget | 600 |
| `--text-lg` | 1.125rem | Lead/entradilla de insights | 400–500 |
| `--text-base` | 1rem | Cuerpo, narrativas IA | 400 |
| `--text-sm` | 0.875rem | Texto secundario, celdas de tabla, botones | 400–500 |
| `--text-xs` | 0.75rem | Metadatos, labels, badges, procedencia | 500 (labels: uppercase + tracking amplio) |

Reglas: máximo **dos niveles de jerarquía por widget** (título + contenido); line-height ~1.5 en cuerpo y ~1.2 en display; ancho de lectura de narrativas ≤ `65ch`; nunca texto por debajo de `--text-xs`.

### 2.3 Espaciado, radio y elevación

- **Espaciado** en base 4 px: `--space-1..16` (0.25–4rem). Ritmo interno de tarjeta: `--space-4` (móvil) / `--space-6` (desktop); separación entre widgets: `--space-6`/`--space-8`; entre secciones de página: `--space-12`/`--space-16`. No existen márgenes fuera de la escala.
- **Radio**: `--radius-sm` (inputs, badges) · `--radius-md` (botones, tarjetas pequeñas) · `--radius-lg` (tarjetas/widgets, modales) · `--radius-full` (avatares, píldoras, escudos).
- **Elevación** — tres niveles, con rol y no por gusto:

| Token | Uso |
|---|---|
| `--shadow-sm` | Tarjetas en reposo, inputs |
| `--shadow-md` | Hover de tarjetas interactivas, dropdowns, popovers |
| `--shadow-lg` | Modales, overlay de búsqueda, sheets |

En dark las sombras son más opacas (definido en tokens) y la elevación se refuerza con la superficie más clara (`--color-surface` > `--color-bg`), al estilo Linear/Vercel: en oscuro, la luz viene del fondo del componente, no de su sombra.

### 2.4 Motion

| Token | Valor | Uso |
|---|---|---|
| `--motion-fast` | 120ms | Micro-feedback: hover, press, toggles, focos |
| `--motion-base` | 200ms | Transiciones de componente: acordeones (evidencia IA), tabs, tooltips |
| `--motion-slow` | 320ms | Entradas/salidas de overlay, modales, aparición de un evento en el timeline en vivo |
| `--motion-ease` | `cubic-bezier(0.2, 0, 0, 1)` | Curva única del sistema (arranque rápido, aterrizaje suave) |

Reglas:
- Solo se animan `transform` y `opacity` (nunca layout: width/height/top).
- Cambios de dato en vivo: el valor nuevo aparece con un pulso sutil de fondo (`--motion-base`) que decae — señala "esto cambió" sin parpadeo.
- `prefers-reduced-motion: reduce` colapsa las tres duraciones a `0ms` a nivel de tokens (ya implementado): ningún componente necesita lógica propia, pero ninguno puede depender de la animación para comunicar (el pulso tiene equivalente estático).
- Nada se anima en loop infinito salvo el indicador "EN VIVO" (pulso lento, pausable por reduced-motion).

---

## 3. Layout y responsive

### 3.1 Breakpoints (preset Tailwind desde tokens)

| Nombre | Min-width | Uso típico |
|---|---|---|
| `sm` | 640px | Móvil grande / landscape |
| `md` | 768px | Tablet: aparecen 2 columnas |
| `lg` | 1024px | Desktop: layout principal + sidebar |
| `xl` | 1280px | Desktop cómodo (ancho de referencia de diseño) |
| `2xl` | 1536px | Pantallas grandes: solo más aire, no más columnas |

### 3.2 Grid

- Contenedor máximo **1280px** centrado, padding horizontal `--space-4` (móvil) / `--space-6` (≥md) / `--space-8` (≥lg).
- Grid de **12 columnas** a partir de `lg`; por debajo, una columna con apilado en el orden de la jerarquía de información del PRODUCT_SPEC (el orden del DOM ES la jerarquía — bueno para móvil, lectores de pantalla y SEO).
- Plantillas canónicas:
  - **Página de entidad** (jugador/equipo/competencia): cabecera a ancho completo → contenido 8 cols + rail 4 cols (rail: próximos partidos, contexto de tabla, relacionados).
  - **Match Center**: cabecera con marcador a ancho completo, sticky en scroll (comprimida) → timeline 7 cols + stats/alineaciones 5 cols.
  - **Home**: secciones a ancho completo compuestas por grids internos de tarjetas (1 col móvil / 2 md / 3–4 lg).
- Ninguna página genera scroll horizontal; las tablas anchas (standings completas) scrollean dentro de su propio contenedor con la primera columna (equipo) fija.

---

## 4. Iconografía e imagen

- **Librería única: [lucide](https://lucide.dev)** (`lucide-react` en islas, SVG estático en Astro). Prohibido mezclar sets.
- Tamaños: 16px (inline con `--text-sm`), 20px (botones y navegación), 24px (cabeceras). `stroke-width` 2 por defecto; 1.5 en tamaños ≥24px.
- Color: heredan `currentColor`; icono decorativo junto a texto lleva `aria-hidden="true"`; icono sin texto exige `aria-label`.
- Iconos futbolísticos sin equivalente en lucide (tarjeta, botín, cambio) se crean como SVG propios en `packages/ui/icons` siguiendo la retícula y stroke de lucide.
- **Imágenes** (escudos, fotos, banderas): siempre desde el CDN propio (módulo `media`), con `width/height` explícitos (cero CLS), `loading="lazy"` fuera del viewport inicial y fallback diseñado (monograma del equipo / silueta neutra) — nunca un icono roto.

---

## 5. Componentes

### 5.1 Filosofía

- Base: **shadcn/ui** sobre Tailwind 4 + tokens. Los componentes se copian al repo (`packages/ui`) y se ajustan a los tokens de Athena — no somos consumidores de una librería, somos dueños del código.
- **Composición sobre configuración**: preferir `<StatCard><StatValue/><StatLabel/></StatCard>` a `<StatCard value label size variant …/>`. Props booleanas que se multiplican = señal de que falta descomponer.
- Dos capas en `packages/ui`:
  1. **Primitivas** (shadcn ajustado): Button, Card, Tabs, Badge, Dialog, Tooltip, Skeleton, Table, Accordion, Command (buscador)…
  2. **Componentes de dominio** (compuestos de primitivas): `MatchScoreHeader`, `EventTimeline`, `FormBadge` (W/E/D), `StandingsTable`, `PlayerStatCard`, `ComparisonBar`, `InsightCard` (narrativa + chip de procedencia + evidencia en Accordion), `LiveBadge`, `SearchCommand`.
- Todo componente de dominio implementa sus tres estados (`loading` skeleton con silueta real, `empty` accionable, `error` con reintento) como parte del componente, no del consumidor.
- Astro renderiza todo lo estático; React (islas) solo donde hay interactividad real (Match Center vivo, buscador, tabs con estado). Un componente de dominio no puede asumir que vive en una isla.

### 5.2 Estados interactivos (obligatorios en toda primitiva)

hover (`--motion-fast`, elevación o tinte sutil) · active/pressed · **focus-visible** (anillo de 2px `--color-primary` con offset, nunca `outline: none` sin reemplazo) · disabled (opacidad + `cursor-not-allowed`) · loading (spinner o skeleton, área estable sin saltos de layout).

---

## 6. Visualización de datos futbolísticos

Principio: cada gráfico responde una pregunta y la respuesta se lee en <3 segundos sin leyenda externa. Si necesita manual, es una tabla mal disfrazada.

| Necesidad | Forma canónica | Reglas |
|---|---|---|
| ¿Cómo se desarrolló el partido? | **Timeline vertical** de eventos (eje = minuto) | Local a la izquierda, visita a la derecha; iconos semánticos (gol=success, roja=danger, amarilla=warning, cambio=neutral); en vivo, los eventos nuevos entran arriba con `--motion-slow` |
| ¿Quién dominó X stat? | **Barras enfrentadas** (comparison bars) | Un par por métrica, valor numérico siempre visible en `--font-mono`; el lado mayor usa `--color-primary`, el menor neutral — nunca verde/rojo (dominar posesión no es "ganar") |
| ¿Cómo llega el equipo? | **Píldoras de forma** W/E/D | Letra + color (success/info/danger); orden cronológico explícito ("últimos 5, más reciente a la derecha") |
| ¿Cómo evoluciona el jugador/equipo? | **Línea o barras por temporada** | Máximo 2 series; ejes con labels en español; puntos clave anotados (transferencia, lesión) desde domain_events |
| ¿Cómo va la tabla? | **StandingsTable** | Zonas (título/copas/descenso) como borde izquierdo de color + leyenda textual; Δ de posición con flecha + número |
| ¿Cómo rindió el jugador? | **Rating como badge numérico** | Escala 0–10 con fondo semántico por tramos (≥8 accent, 7–8 success, 5–7 neutral, <5 danger) + tooltip con procedencia ("rating del proveedor") |

Reglas transversales:
- Los números de un gráfico siempre están también como texto accesible (tabla visualmente oculta o `aria-label` descriptivo): el gráfico es mejora progresiva, no fuente única.
- Paleta de dataviz = tokens semánticos + primary; jamás paletas arbitrarias por gráfico.
- Sin ejes truncados que exageren diferencias; las comparaciones parten de cero.
- Tooltips solo en desktop como refuerzo; en móvil la información clave es visible sin interacción.
- Heatmaps y mapas tácticos quedan **fuera del MVP** (el proveedor no da tracking); no diseñar placeholders que prometan lo que no hay.

---

## 7. Theming claro/oscuro

- Mecanismo: `data-theme="dark"` en `<html>`; los componentes **solo** usan tokens semánticos, por lo que ningún componente sabe en qué tema vive. Prohibido `dark:` de Tailwind para colores en componentes — el tema se resuelve en la capa de tokens.
- Default: `prefers-color-scheme` del sistema; el toggle del header lo sobreescribe y persiste (localStorage + script inline pre-render para evitar flash).
- Los colores semánticos (success/danger/warning/accent/info) mantienen su valor entre temas mientras cumplan contraste sobre las superficies dark; si algún par falla AA, se ajusta **en tokens.css** (nunca con overrides locales).
- Imágenes con transparencia (escudos blancos/oscuros) se colocan sobre `--color-bg-subtle` con padding para garantizar visibilidad en ambos temas.
- Toda página y componente se revisa en ambos temas antes de merge; Playwright captura screenshots en light y dark para los flujos críticos.

---

## 8. Accesibilidad (WCAG 2.1 AA)

Requisitos de aceptación por componente/página:

1. **Contraste**: texto normal ≥ 4.5:1, texto grande e iconos significativos ≥ 3:1, en ambos temas (verificado contra los valores oklch de tokens).
2. **Color nunca solo**: toda semántica cromática duplica canal (texto, icono, forma) — ver §2.1.
3. **Teclado completo**: todo lo interactivo es alcanzable y operable por teclado; focus-visible siempre presente; orden de tabulación = orden visual; overlay de búsqueda y modales con focus trap y cierre por Escape.
4. **Estructura semántica**: un `h1` por página, landmarks (`header/nav/main/aside/footer`), jerarquía de headings sin saltos, skip-link al contenido.
5. **Vivo sin ruido**: el marcador en vivo es `aria-live="polite"` (solo anuncia goles y cambios de estado del partido, no cada minuto); el timeline no roba el foco al insertar eventos.
6. **Idioma y textos**: `lang="es"` global; textos alternativos reales ("Escudo del FC Barcelona", no "logo"); labels de formulario visibles.
7. **Táctil**: objetivos ≥ 44×44 px; gestos con alternativa de botón.
8. **Motion**: cubierto a nivel de tokens (§2.4); adicionalmente ningún contenido parpadea >3 veces/segundo.
9. **Zoom**: la UI es funcional a 200% de zoom y con `text-size` aumentado (rem en todo, ver tokens).

Verificación: axe-core en CI sobre las páginas canónicas + pruebas manuales de teclado y lector de pantalla en los flujos de PRODUCT_SPEC (J1–J5) durante Fase 6, con criterios exigibles desde Fase 2.

---

## 9. Voz y microcopy (resumen operativo)

- Español neutro latinoamericano, tuteo, sin anglicismos innecesarios (se dice "tabla de posiciones", no "standings", en la UI).
- Los empty states siempre proponen el siguiente paso; los errores nunca culpan al usuario ni muestran jerga técnica.
- La IA habla con humildad de analista, no con certeza de oráculo: "los números sugieren…", nunca "es un hecho que…". Chip fijo: **"Análisis Athena"** + "Ver evidencia".
