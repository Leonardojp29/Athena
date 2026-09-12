# La calculadora de la Liga 1

Poné los marcadores que faltan y mirá cómo quedan las tablas. Vive en `/calculadora`, con un botón
propio en el header.

**El lector pronostica, Athena calcula.** La distinción no es retórica: `docs/product/PRODUCT_SPEC.md`
lista «predicciones propias» entre los no-objetivos, y `PreviewCard.astro` dice «Athena no predice
resultados». Acá no se predice nada — se toma el escenario que cargó alguien y se resuelven las
tablas, los cupos y el camino al título que ese escenario implica. Las probabilidades son un conteo
sobre ese escenario, rotulado como tal en la propia pantalla.

## Las piezas

| Dónde | Qué |
|---|---|
| `packages/calculadora` | El motor: tablas, desempates, reglamento, simulación y códec. Puro, sin React ni Prisma. |
| `GET /v1/views/calculadora/:slug` | La temporada entera en tuplas. 35 KB crudos, 11 KB comprimidos. |
| `apps/web/src/pages/calculadora.astro` | La página. Decodifica el `?p=` del lado del servidor. |
| `apps/web/src/components/calculadora/` | Una isla de React y su Worker. |

## El reglamento 2026, codificado

`reglamento-liga1.ts` lo guarda como **datos**, no como código: la próxima liga con Apertura y
Clausura —Uruguay, Colombia— es otro objeto `ReglasLiga` y no otro motor.

- **Zonas de la acumulada**: 1.º–4.º Libertadores, 5.º–8.º Sudamericana, 17.º–18.º descenso.
- **Camino al título**, las cuatro ramas textuales de las bases:
  1. Un equipo gana los dos torneos → campeón sin jugar.
  2. Los dos ganadores son los dos primeros de la acumulada → final directa.
  3. Un ganador está entre los dos primeros → espera en la final; el otro ganador juega la
     semifinal contra el mejor de la acumulada que no ganó ningún torneo.
  4. Ninguno → semifinales cruzadas y final. Las bases no publican los cruces de este caso: se
     siembran por la acumulada y la tarjeta lo declara.

Un lado de un cruce puede ser un equipo **o el ganador de una semifinal que todavía no se jugó**
(`Participante`), y la tarjeta escribe "el ganador de la semifinal" en vez de un nombre. La primera
versión ponía ahí a uno de los dos semifinalistas: la simulación acertaba de casualidad —el mismo
equipo estaba de los dos lados de la búsqueda— pero la pantalla contaba un resultado que no había
pasado.

Cada rama viaja con la frase del reglamento que la manda, y la pantalla la muestra debajo del
cruce: un número siempre viene con lo que lo sostiene.

Lo que **no** se simula, y se declara en la pantalla: fair play, sorteo y bolsa de minutos.

## El desempate, y por qué se detiene donde se detiene

`puntos → diferencia de goles → goles a favor → orden oficial de hoy → nombre`.

No se calcula el resultado entre sí aunque el reglamento lo nombre. El orden que publica el
proveedor ya absorbió el entre sí, el fair play y el sorteo **tal como la Liga los aplicó**;
recalcularlos por nuestra cuenta divergiría justo donde el proveedor no los aplicó. Usarlo como
último criterio computable hace que sin pronósticos la tabla calculada sea la tabla real, y con
pronósticos solo reordenen los tres primeros criterios.

### La tabla del proveedor puede estar a medio actualizar

Medido el 2026-09-12: en el Clausura, el proveedor ponía a Juan Pablo II quinto con doce puntos,
por delante de dos equipos con catorce. Sus tablas se refrescan aparte del calendario y quedan
internamente inconsistentes por unas horas.

Dos consecuencias, las dos deliberadas:

- **La tabla que se muestra es la calculada**, no la del proveedor: sale de los resultados, que son
  los que no discuten.
- **El ▲▼ se mide contra nuestra propia tabla de hoy**, no contra el orden del proveedor. Así la
  flecha responde lo que el lector preguntó al escribir un marcador —cuánto movió **su** escenario—
  y no cuánto atraso lleva el proveedor.
- El test de igualdad exacta con la tabla oficial corre sobre una **fase terminada** (el Apertura),
  donde al proveedor no le queda nada por incorporar.

## La simulación

`montecarlo.ts`, 5.000 temporadas por omisión (~270 ms).

- **Modelo**: ataque y defensa de cada equipo = sus goles a favor y en contra por partido sobre el
  promedio de la liga, medidos en esta misma temporada y acotados a [0,4 ; 2,5] para que un equipo
  con tres partidos no valga el triple que la liga. Los goles salen de una Poisson. La ventaja de
  local es el reparto real de goles local/visita de la temporada, no una constante.
- **Qué se sortea**: solo los partidos `scheduled` sin pronóstico. Lo jugado y lo que el lector fijó
  quedan como están.
- **Los cruces** se juegan a ida y vuelta con el mismo modelo; el empate global se va a una moneda.
  No hay gol de visitante.
- **La semilla sale del escenario** (`semillaDe(codigo)`, FNV-1a + mulberry32): dos personas con el
  mismo enlace ven exactamente los mismos porcentajes, y los tests son deterministas. Un porcentaje
  que baila entre recargas no se puede citar.
- Corre en un Web Worker. En el hilo principal, 270 ms se sienten como un tirón en cada tecla.

## El códec de la URL

Ocho caracteres por partido pronosticado: `<local3><visita3><gl><gv>`, por ejemplo `aliuni21` =
Alianza Lima 2 - 1 Universitario. El par ordenado es único en una liga de ida y vuelta, así que no
hace falta decir la fecha. Ochenta partidos son 640 caracteres.

Se eligió un código legible sobre índices en base 36 —seis caracteres y sin diccionario— porque el
enlace se manda por WhatsApp y ahí alguien lo lee y lo cuenta.

- Goles con tope 9; los tokens rotos se ignoran en vez de invalidar el enlace entero.
- Al decodificar **solo cuentan los partidos pendientes**: uno que ya se jugó o se adjudicó ignora
  su pronóstico viejo, así un enlace de la semana pasada no inventa una temporada que no pasó.
- El diccionario está en `codigo.ts`; un slug desconocido cae en un respaldo determinista, y dos
  slugs nunca comparten código.

Nada se guarda en el servidor **ni en el navegador**: el escenario vive en la URL y solo ahí.
Volver a la calculadora al día siguiente y encontrarse los pronósticos de la semana pasada —sobre
partidos que ya se jugaron— es peor que empezar limpio. Quien quiera conservar el suyo tiene el
enlace, que además se puede mandar.

## La predicción compartible

Una imagen de 1200×630, el tamaño que esperan las vistas previas de los chats. `GET
/calculadora/tarjeta.png?p=…` la arma desde el mismo escenario que la página, y sirve para dos
cosas: es el `og:image` del enlace —pegado en WhatsApp muestra la tarjeta y no un bloque de texto—
y es lo que sale del botón **Mi predicción**, junto a Modo streamer.

> Mi predicción: Universitario, campeón del Clausura con 78 puntos

La frase cambia sola según cuánto se pronosticó: con la fase entera cargada dice **campeón**; si
faltan partidos dice **puntero** y cuántos quedan. Sin ningún pronóstico el endpoint responde 404:
dibujar la tabla de hoy y llamarla "mi predicción" sería mentir.

En el teléfono el botón manda la imagen como **archivo** al selector del sistema —de ahí a WhatsApp
en un toque— y en el escritorio, donde `navigator.canShare` con archivos casi nunca existe, la abre
en una pestaña para guardarla.

### Cómo se dibuja

`src/tarjeta/dibujar.ts` escribe el SVG **a mano** y `@resvg/resvg-wasm` lo rasteriza. Se probó
primero `satori`, que compone el SVG desde un árbol como el de React, y no pudo leer ninguna de las
dos fuentes variables del sitio (`Cannot read properties of undefined`); resvg las lee sin quejarse.
El cambio salió bien: en una imagen que circula por WhatsApp, una caja mal centrada no se arregla
con un despliegue, así que conviene que el diseño esté escrito y no compuesto.

- **Las fuentes y el escudo de la liga se incrustan** con `?inline` de Vite. La primera versión los
  leía del disco con una ruta relativa y el bundle queda en otra carpeta que el fuente: el escudo
  desaparecía de la tarjeta sin que nada fallara, que es la peor manera de romperse.
- **Los escudos de club se bajan y se embeben** como `data:`: resvg no sale a la red. Se guardan en
  memoria del proceso, y la imagen entera se guarda un día en el borde —el escenario está en la
  URL, así que dos pedidos iguales dan la misma imagen para siempre—.
- **El aura toma el color del club** (`teams.primary_color`, que viaja en el payload): la tarjeta de
  cada uno se ve suya y no de una plantilla.
- El nombre del club **encoge hasta entrar** en vez de cortarse, y los cuatro cupos de Libertadores
  van enteros: un "+1" obliga a preguntar quién falta, que es lo contrario de lo que hace una
  tarjeta.
- El dominio del pie sale del anfitrión de la petición. Inventar uno es peor que no poner ninguno.

## Decisiones de la pantalla

- **El `?p=` se decodifica en el servidor** y la isla se renderiza con las tablas hechas. Un enlace
  que solo dice algo después de hidratar no es un enlace compartible: es una promesa. Hay un test
  con JavaScript apagado que lo sostiene.
- **En el teléfono las dos columnas se apilan**, y dentro de cada partido cada equipo se lleva su
  línea con su propio control: en una sola fila los dos steppers dejaban los nombres en "Clu…" y
  "Co…", y saber quién juega es lo mínimo.
- **Lo jugado va bloqueado** con su marcador y un candado. Un resultado no se discute.
- **La zona va en un riel de color y en una leyenda con su nombre**: el color nunca es el único
  canal.
- **Las tuplas viajan compactas hasta la isla** y se abren en un `useMemo` que corre igual en el
  servidor. Expandirlas en la página costaba 350 KB de props escritas dentro del HTML contra los
  35 que ocupan cerradas.
- **Sin `Intl` ni `toLocale*` en la isla**: Node y el navegador no formatean igual y eso desajusta
  la hidratación de un árbol que el servidor ya dibujó.

## Sumar otra liga

1. Un `ReglasLiga` nuevo con sus tablas, sus fases y sus zonas.
2. Si define el campeón por playoffs, su propio `caminoAlTitulo`; si sale de una tabla, alcanza con
   la zona `campeon`.
3. Los códigos de tres letras de sus equipos en `codigo.ts`.
4. La ruta toma el slug de la competencia; hoy está fijo en `primera-division`.
