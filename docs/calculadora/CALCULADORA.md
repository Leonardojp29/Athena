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
  4. Ninguno → semifinales cruzadas y final.

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

Nada se guarda en el servidor. El enlace vale para siempre y no cuesta una fila en la base.

## Decisiones de la pantalla

- **El `?p=` se decodifica en el servidor** y la isla se renderiza con las tablas hechas. Un enlace
  que solo dice algo después de hidratar no es un enlace compartible: es una promesa. Hay un test
  con JavaScript apagado que lo sostiene.
- **En el teléfono abre en las tablas**, aunque quien entra a pronosticar tenga que dar un toque
  más: el enlace compartido se abre casi siempre desde un chat y en un teléfono, y quien lo recibe
  tiene que ver el resultado, que es lo que le mandaron.
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
