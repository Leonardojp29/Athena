# Mi Leyenda — cómo está hecho

El primer juego de Athena. Creás un futbolista y vivís su carrera hasta el retiro; al final te queda
la carta de toda tu vida y un legado compartible por enlace. Este documento existe para poder sumar
contenido y pantallas sin releer el código.

**Doce capítulos de dos años, de los 16 a los 38, dos decisiones en cada uno, y una carrera entera en
dos o tres minutos.** Esa duración es el diseño: la primera versión eran veinte temporadas y cien
clics, casi nadie llegaba al final —que es justo donde está lo bueno— y por eso el e2e la mide en
lugar de confiar en que no crezca sola.

## La idea que ordena todo

**Nunca elegís el club.** En la creación llenás nombre, dorsal, puesto, pie y liga; después el
mercado te ofrece **como máximo cuatro** equipos que te quieren, y elegís entre esos. Vale al
debutar y en cada ventana de transferencias. `MAX_OFERTAS = 4` es una regla del diseño, no un tope
técnico: si algún día se ofrecen cinco, el juego pierde lo que lo hace un juego.

## La creación

Lo único que el jugador llena, y todo se señala en lugar de leerse: el puesto se toca sobre una
cancha vista desde arriba, la liga se reconoce por el logo de la competencia y la nacionalidad por su
bandera. No hay un solo `<select>`: pedir en una lista desplegable algo que se puede ver es pedirle
al jugador que lea de más.

- **La nacionalidad y la liga son dos cosas distintas.** Una define tu selección, la otra dónde
  debutas. Un peruano que arranca en Argentina ya es una historia antes de jugar un partido.
- **Lateral y extremo se eligen por banda.** `Costado` no es un puesto aparte —las cuentas del OVR
  son idénticas por izquierda o por derecha— pero sí cambia cómo te llamas: la carta dice `EI`, no
  `EXT`. `siglaDePuesto` y `nombreDePuesto` resuelven las dos formas.
- El idioma del juego es **español neutral**: nada de voseo ni de regionalismos que dejen fuera a la
  mitad de los lectores.

## El motor y la pantalla

`packages/leyenda` es el juego. TypeScript puro, sin DOM, testeado con vitest. La web solo lo
reproduce.

Un solo verbo:

```ts
avanzarCapitulo(carrera, eleccion, mundo) → { carrera, capitulo }
```

Cada capítulo hace siempre lo mismo: plantea **dos** decisiones de tipos distintos —mercado, evento o
momento jugable—, juega dos temporadas, escribe una fila en la línea de la carrera y deja un titular
de prensa. La cola de esas dos vive en `carrera.cola` y cada paso se materializa cuando le toca: si
firmas por otro club en el primero, el segundo ya habla de tu club nuevo.
La interfaz no conoce una sola regla del fútbol: recibe el resumen del bienio y las opciones. Por eso
el motor se prueba entero sin navegador y la pantalla se puede rediseñar sin tocar una regla.

| Archivo | Qué resuelve |
|---|---|
| `azar.ts` | PRNG con semilla. **Toda** la aleatoriedad pasa por acá: misma semilla, misma carrera |
| `estado.ts` | `Carrera` y todo lo que se guarda. Nada se borra |
| `ovr.ts` | Pesos por puesto → OVR → nivel de carta → valor de mercado |
| `crear.ts` | Reparto inicial, techo oculto y la curva de la edad |
| `temporada.ts` | Tramos, goles, notas, tabla, títulos y premios |
| `mercado.ts` | Quién te quiere, con el rival y la casa buscados a propósito |
| `momentos.ts` | Resuelve los cuatro momentos jugables |
| `eventos/` | Motor (condiciones tipadas, pesos, cooldowns) + catálogo |
| `legado.ts` | Prime, arquetipo, mejor y peor decisión, veredicto |
| `capitulo.ts` | El orquestador: los doce capítulos, la cola de dos decisiones y el crecimiento |
| `clasicos.ts` | Los derbis declarados y la ciudad normalizada: de ahí sale el clásico rival |
| `seleccion.ts` | El calendario real de Mundiales y continentales, la convocatoria y el torneo |

## Las consecuencias

Es lo que hace que una decisión sea una decisión, y hasta hace poco no existía: `decidir()` hacía
`void azar` y el resultado de un evento estaba escrito antes de que el jugador tocara nada.

- **Una opción puede jugarse a los dados.** `Opcion.riesgo` declara una probabilidad y dos futuros
  (`bien` y `mal`), y la pista avisa **el tipo** de riesgo, nunca el resultado. Un test falla si una
  opción con riesgo no trae pista o no cuenta las dos caras.
- **Los diez diales de `Vida` los lee la simulación.** La confianza y el estrés entran en la nota; la
  condición, en las lesiones; el cariño de la hinchada y el rencor del técnico deciden tu rol del
  bienio siguiente. Antes solo se leía `forma`, así que ninguna decisión llegaba a ninguna parte.
- **Las facturas llegan después.** `Efectos.luego` agenda un evento para dentro de N capítulos en
  `carrera.pendientes`, y ese evento entra sí o sí cuando le toca: aceptar una apuesta a los 24 se
  paga a los 28 aunque el sorteo nunca lo hubiera elegido.
- **Una carrera puede terminar antes de tiempo.** `Efectos.final` la cierra con `motivo` de `lesion`,
  `sancion` o `accidente`, y solo al final de una cadena que el jugador alimentó. Medido sobre 1.200
  carreras jugando **siempre** la opción arriesgada: 20% de finales abruptos (16% sanción, 3% lesión,
  0,2% accidente fatal). Con un jugador normal, 2,5%.
- **Los momentos deciden títulos.** `ContextoDeMomento.enJuego` cuelga un trofeo de la jugada: si
  fallas el penal de la final, esa copa no la gana nadie y el bienio no la sortea por su cuenta.
- **Y todo eso se ve.** `Capitulo.resultado` trae el relato, si la apuesta salió bien o mal y los
  números que se movieron —media, dinero, confianza, forma, físico, fama, hinchada, estrés— y la
  celebración los muestra como muestra un título. Antes se decidía, se leían dos líneas de texto y
  venía la pregunta siguiente sin que nada pareciera haber pasado.
- **El salto de media no se lleva la pantalla.** Vive en la carta, con su marca saliendo del número.
  Un título pasa una vez y merece el overlay; subir dos puntos es una buena noticia, no un
  acontecimiento.

### La regla del resultado

**El resultado cuenta el desenlace, no la acción.** "Dijiste que iban a ganar. La frase quedó en la
portada" no es una consecuencia: es la crónica de lo que el jugador ya sabe que hizo. La consecuencia
es si ganaron el clásico y qué le pasó a él después.

De ahí que casi toda opción interesante lleve `riesgo`: cuando el desenlace es incierto por
naturaleza —un clásico, una promesa pública, pedir la titularidad, una fiesta el jueves— el juego lo
tira y cuenta dos finales concretos. Y una mala salida **puede restar media**: el cuerpo y la cabeza
se pagan en la carta.

Tres tests lo vigilan: toda opción tiene `pista`, ningún desenlace baja de doce palabras —un
desenlace no cabe en ocho— y una opción con riesgo tiene que contar las dos caras.

### El salseo

`eventos/salseo.ts` y `eventos/peru.ts` son el bloque que hace que la carrera se sienta una vida y no
una planilla: el ampay saliendo de la concentración tres días antes del clásico, la huelga porque el
club debe cuatro meses, la barra entrando al complejo cuando termina la práctica, el domingo en Cusco
a tres mil cuatrocientos metros, la pichanga del barrio que el contrato prohíbe, el dirigente que te
ofrece pagarte sin planilla, el periodista que te da la portada si hablas mal de tu técnico, y tu
representante cobrando de los dos lados.

**El contexto se estudia o no se escribe.** El evento que había antes empezaba con el jugador saliendo
de una pollería a la una de la mañana, y el propio evento se delataba: el titular de la salida buena
era *"EL «AMPAY» DE {APELLIDO} ERA UN CUARTO DE POLLO"*. Comer pollo después de un partido de noche es
lo que hace un plantel entero: no es un escándalo, es la cena. Lo que sí lo es —y es lo que de verdad
le pasa a un futbolista peruano— es escaparse del hotel de concentración con el utilero mirando.
Igual con las instituciones y la moneda: acá se dice **carta notarial** y no carta documento, **SUNAT**
y no agencia tributaria, y se cuenta en **soles**. Un test recorre el catálogo y falla si vuelve a
aparecer un giro rioplatense o una moneda de otro país.

Tres reglas de tono, ninguna negociable:

1. **Toda figura pública es inventada**, y sale de `personajes/`. El juego inventa escándalos, y un
   escándalo inventado sobre alguien que existe no es un juego, es una calumnia.
2. **Nada sexual y nada de drogas.** El escándalo se cuenta con lo que insinúa, con el titular y con
   la cara del que tiene que explicarlo al día siguiente.
3. **El resultado cuenta el desenlace.** Nunca "te ampayaron"; siempre qué pasó después.

Y los titulares vienen firmados. `DIARIO_POR_TONO` reparte cada uno según su tono entre los tres
diarios del grupo —**El Popular** la farándula, **Líbero** el fútbol, **La República** lo serio— y el
nombre aparece encima de la frase. No es adorno: una polémica no la saca el mismo medio que una nota
de fútbol, y ver quién la publica cambia cómo se lee.

### La escalera del picante

La rareza dice cada cuánto sale un evento; el **picante** dice cuándo puede salir. Son cosas distintas
y mezclarlas era el problema: a los dieciocho el juego ofrecía un rondo y un doble turno mientras la
cadena del amaño —que puede terminar en inhabilitación de por vida— también era alcanzable, y de los
veinticuatro a los treinta y seis no cambiaba nada.

| Nivel | Desde | Edad | De qué se habla |
|---|---|---|---|
| 1 | capítulo 0 | 16-20 | el vestuario, la concentración, la pichanga, la cábala, el primer clásico |
| 2 | capítulo 3 | 22+ | la farándula, el representante, la selección, la huelga, el ampay |
| 3 | capítulo 6 | 28+ | el maletín, el casino, SUNAT, la carpeta del periodista, la plata sin planilla |

Una factura agendada con `luego` entra **sin** pasar por este filtro, a propósito: la cuenta de lo que
hiciste llega cuando le toca, no cuando la carrera esté lo bastante madura para recibirla. Lo que se
gradúa es dónde **empieza** una cadena, no dónde termina.

El arreglo de fondo, además del nivel, fue abrir `prensa` y `caos` desde el primer capítulo. Empezaban
en el tercero —o sea a los veintidós— y ahí vivía la mitad del material que vale: los dieciocho y los
veinte, que son la edad más escandalizable que existe, eran el tramo tibio de la carrera. Lo que evita
que a un chico de dieciocho lo persiga un programa de espectáculos es el `famaMin` que esos eventos ya
traían, no un portón cerrado por categoría.

### La otra mitad de la carrera

`fueraDeLaCancha(carrera)` en `legado.ts` mide lo que no es fútbol: fama, reputación, exposición,
cariño de la tribuna, portadas, escándalos y romances, más la portada que más pesó y una línea de
veredicto. Todo eso el motor ya lo movía —un escándalo te cuesta el puesto dos años después— pero no
se veía en ninguna parte, y una vida que no se mide es una vida que el jugador no sabe que tuvo.

## Sumar un evento

Se agrega un objeto al catálogo (`eventos/futbol.ts`, `prensa.ts`, `peru.ts`…) y no se toca el motor.
`catalogo.test.ts` vigila las reglas: cuatro opciones siempre, ninguna repitiendo el texto ni la pista
de otra, toda opción con pista y con un resultado que cuente algo, ninguna condición de edad que la
categoría vuelva imposible, y ningún evento de nivel 3 alcanzable antes del capítulo 6.

```ts
{
  id: 'futbol-algo-nuevo',
  categoria: 'futbol',
  rareza: 'infrecuente',          // pesa 45 contra 100 de lo común; 'mitico' pesa 0,4
  picante: 2,                     // 1 desde el principio · 2 desde el cap. 3 · 3 desde el cap. 6
  titulo: 'El título',
  texto: 'Lo que pasa. {club}, {rival}, {dt}, {liga}, {pais} se reemplazan.',
  tipoDeRecuerdo: 'decision',
  condiciones: { edadMin: 24, roles: ['titular'], sinEtiquetas: ['conflicto:dt'] },
  cooldown: 3,                    // 0 = una sola vez en la carrera
  opciones: [
    {
      id: 'una',
      texto: 'Lo que el jugador elige',
      pista: 'Qué tipo de consecuencia tiene',   // el jugador anticipa el riesgo, no el resultado
      efectos: {
        vida: { confianza: 8, estres: 5 },
        relaciones: { dt: { rencor: 10 } },
        etiquetas: ['promesa:nunca:{rivalSlug}'], // así el juego recuerda
        titular: { texto: '{APELLIDO} DIJO ALGO', tono: 'polemica' },
        balance: 4,                               // alimenta la mejor y la peor decisión
      },
      resultado: 'Lo que se cuenta después de elegir.',
    },
  ],
}
```

**Las etiquetas son la memoria.** `promesa:nunca:{rivalSlug}` es lo que permite que a los 19 digas
"jamás jugaría ahí" y a los 28 la prensa te cite la frase con el año si firmás. Cualquier evento
puede exigir (`conEtiquetas`) o excluir (`sinEtiquetas`) lo que ya pasó.

## El mundo real

`GET /v1/views/mundo` (caché de un día) arma las 20 ligas jugables con sus clubes reales:

- **El renombre** (0-100) es cuán conocido es un club: peso de su liga, posición sostenida y
  participaciones en copas continentales. Es lo que ordena la escalera y lo que deja afuera a los
  clubes que nadie nombraría.
- **La fuerza no se inventa**: sale de la posición promedio de cada club en sus últimas tres
  temporadas reales, normalizada por el tamaño de su liga y encuadrada en la franja que le da el peso
  de su liga (`mundo.service.ts`). Arsenal queda en 91, Southampton en 62.
- El **peso de cada liga** sí es una tabla a mano en `mundo.service.ts`: no hay dato en la base que
  diga que la Premier vale más que la Liga 1, y fingir que se deduce sería peor que declararlo.
- Escudos y colores vienen de `teams.logo_url` / `primary_color`. De 459 clubes, 336 tienen color
  usable; el resto se apoya en el material de la carta.

## La escalera

La carrera soñada tiene una forma y el mercado la respeta: **club chico de tu país → grande local →
un país grande del mismo continente → Europa → los millonarios, si llegás → volver a casa o a la del
rival**. El mercado que la produce está en `mercado.ts` y razona como un director deportivo, en tres
piezas y una regla de composición.

**La cotización** (`cotizacionDe`) es cómo te ve un scout: `nivel` (la media), `pruebas` —lo que
demostraste en los dos últimos bienios: partidos, goles y asistencias por partido según el puesto,
nota, títulos—, `visibilidad` —quién puede verte: la liga donde jugás, la copa continental si la
jugaste, la selección, la fama, todo escalado por los minutos que tuviste—, `proyeccion` hasta los 24 y
`trayectoria`. Antes la única señal de rendimiento era el último bienio y un 72 con siete partidos se
veía idéntico a un 72 con cuarenta: por eso Boca quería al chico de Lanús que había jugado siete.

**El nivel del club** (`nivelDeClub`) tiene cinco escalones y **no sale del renombre solo**, porque
el renombre no es comparable entre ligas —Brasil, México y la MLS están inflados diez puntos sobre su
fuerza; Italia, Portugal y Países Bajos deflacionados hasta catorce—: con renombre crudo Betis y
Freiburg quedaban por encima de PSG. El escalón de arriba, los **millonarios**, es una lista declarada
(`MILLONARIOS`), igual que `clasicos.ts` declara los rivales: quién es millonario lo dicen la historia
y la plata, no la tabla del año pasado. Hay dos marcas más: los **vendedores** (Porto, Ajax, PSV, los
grandes de Brasil y Argentina), que compran joven con proyección, y los **destinos tardíos** (MLS,
Arabia, Japón, Canadá, Egipto), que aparecen a los 29 o a los 27 si ya vas en bajada.

**Quién te quiere** (`quiere`) es una puerta por nivel —el millonario compra un 85 probado en su prime
o la joya de veintidós en alza; el grande local compra a cualquiera de 60 que haya jugado una
temporada— más tres reglas de sentido: la geografía la fija la visibilidad (con menos de 30 solo te ve
tu país, hasta 55 tu continente, después el mundo), no se baja en pleno ascenso salvo un escalón para
jugar hasta los 22, y pasados los 33 el camino es hacia abajo. La única que salta la puerta de nivel
es tu casa; el rival puede saltarse la geografía y el sentido, pero tiene que quererte.

**Cuatro caminos, no cuatro sorteos** (`armarOfertas`). Cada casillero tiene un sentido: el salto (el
nivel más alto que te quiere), el puesto (donde jugarías de titular, en otra liga), la historia (la
casa, el rival, el club al que juraste no ir; si sos élite, el segundo millonario) y el comodín (el
préstamo si estás en el banco, la sorpresa uno de cada cuatro mercados, el destino tardío si tenés la
edad). **Siempre son cuatro**: si falta, entran los chicos de tu país. La mala carrera no se siente en
que falten ofertas sino en que las cuatro sean chicas. Y las de afuera tienen cupo según la visibilidad:
ninguna mientras solo te conoce tu país, una cuando el continente empieza a mirar, dos cuando ya te
siguen, todas cuando te ve el mundo.

**La sorpresa** es lo que lo vuelve juego: uno de cada cuatro mercados, el comodín trae un club un
escalón por encima de lo que tu cotización permite —el grande que manda un scout y se la juega
contigo—, marcado como riesgo alto y con rol de promesa. Nunca es un millonario antes de los 22.

Medido sobre 400 carreras desde Perú: el primer mercado es 100% del país; el chico de 72 con siete
partidos en Lanús recibe Independiente, San Lorenzo, Platense y Vélez; el ícono de 90 en Flamengo
recibe Chelsea, Porto, la vuelta a Lanús y Barcelona; el 94% de las carreras que llegan a 85 ven un
millonario; los catorce millonarios aparecen con frecuencias parejas; la casa o su rival está en el 98%
de los mercados pasados los 33; y siempre hay cuatro ofertas salvo 14 mercados de 4.400.

**El clásico no se deduce de la tabla: se hereda.** Tres capas, en `clasicos.ts` y `mercado.ts`: una
tabla curada de ~70 derbis por slug (Universitario–Alianza, Boca–River, United–Liverpool,
Milan–Inter); si no hay, la ciudad del estadio —`venues.city` cubre 367 de los 371 clubes jugables,
normalizada porque el proveedor manda `Liverpool` y `Liverpool, Merseyside`—; y de último recurso el
club de mayor renombre de la liga. Antes se elegía "el de fuerza más parecida", y así el United
terminaba jugando su clásico con el Sunderland.

## La selección

El calendario es el real y encaja con los años del juego: Mundial en 2026, 2030, 2034 y 2038; la
continental de tu confederación en el medio. Te convocan según media, nota y tu relación con el
técnico nacional —no por pasar un umbral—, y el torneo produce un trofeo de clase `seleccion` con el
logo real de la competencia. Medido sobre 400 carreras por país: un brasileño gana algo con su
selección el 69% de las veces y un Mundial el 15%; un peruano, el 7% y casi nunca.

Nada de esto es un riel: se puede ir bien o se puede ir mal, y quedarse toda la vida en el club de
siempre también es un final.

## La carta

Siete materiales, y la evolución se ve en el material: cantera (pizarra mate) → promesa → profesional
(acero) → élite (bronce) → clase mundial (oro con holografía) → ícono (obsidiana iridiscente) →
inmortal (mármol con luz). Ícono e inmortal **piden títulos además de número**: un buen año no
convierte a nadie en leyenda.

**La camiseta es el retrato**: no hay foto de un jugador que no existe, así que la carta muestra la
camiseta con tu dorsal, pintada con los colores reales de tu club, y cambia con cada transferencia.

El tilt y el brillo se hacen con dos variables CSS escritas en el `pointermove`, sin estado de React
por cuadro. Todo el CSS del juego vive en `apps/web/src/styles/leyenda.css`, que solo importan sus
páginas.

## Los momentos jugables

Cuatro, y pocos a propósito: si todo el partido fuera jugable, ningún momento sería importante.

Se juegan con **dos toques** y la misma dinámica en los cuatro: primero a qué zona del arco —seis
botones dibujados sobre la boca real que calcula la proyección— y después cómo la pegas. Con teclado,
los números del 1 al 6 y del 1 al 3. Nada de arrastrar el puntero: el gesto era impreciso, no se podía
jugar sin ratón y la potencia salía del largo del arrastre, que es un dato que nadie sabe medir con el
dedo.

El segundo toque es el que convierte la jugada en una decisión, porque se juega contra la lectura del
arquero, que el jugador no conoce:

| | Gana contra | Pierde contra |
|---|---|---|
| **Colocada** | el arquero que se queda | el que adivina el palo |
| **Potente** | cualquier arquero: no le da tiempo | el travesaño y el palo |
| **Picarla** | el que se tira temprano | el que no se mueve: papelón |

En el mano a mano las tres son *definir ya / cruzarla fuerte / amagar*, y en la atajada *esperar /
volar / adelantarte*. El arquero elige lado con el azar semillado, no con `Math.random()`.

| Momento | Quién lo juega | Cuánto entra |
|---|---|---|
| Penal | todos menos el arquero | ~80% |
| Mano a mano | delanteros y extremos | ~55% |
| Tiro libre | medios y mediapuntas | ~42% (la zona baja del centro la tapa la barrera) |
| Atajada | arqueros | ~45% de atajadas |

**El motor decide y la pantalla anima.** `resolverMomento` devuelve un `desenlace` —gol, atajada,
palo, afuera, barrera— junto al relato, y la escena construye la trayectoria **para** ese desenlace:
`objetivoDe` traduce el veredicto a un punto del arco y `apuntarA` resuelve la velocidad que lleva la
pelota exactamente ahí, corrigiendo el arrastre y el Magnus con cuatro pasadas de simulación. Antes
había dos resoluciones en paralelo, una en el canvas y otra en el motor, y podían contradecirse: la
pantalla cantaba "¡La atajó!" mientras la crónica contaba el gol.

La física sigue siendo de verdad: `fisica.ts` integra la pelota en tres dimensiones a paso fijo con
gravedad, rozamiento y efecto Magnus —la comba sale de la simulación, no de una animación—,
`escena.ts` la proyecta y dibuja el estadio nocturno, y `arquero.ts` la silueta que vuela.

**Y no puede colgarse.** El vuelo termina por tiempo y no por geometría: tope de pasos, tope de reloj
y un último temporizador que suelta la escena aunque todo lo demás falle. El cuelgue viejo era
exactamente lo contrario —un remate al palo rebotaba hacia atrás y ninguna condición volvía a
cumplirse, así que la escena se congelaba con la pelota rodando en el 7,3% de los tiros— y por eso
`resolverPaso`, que era el que juzgaba desde el canvas, ya no existe.

## Guardado y compartir

- La partida vive en `localStorage` (`athena:leyenda`), con el patrón de `favoritos.ts`: lectura
  defensiva, escritura silenciosa, versión por clave. Recargar retoma donde ibas.
- **No hay historial.** Cuando la carrera llega al legado, la partida se borra. Una leyenda que
  terminó se cuenta, se comparte si el jugador quiere y desaparece: lo que hace que alguien empiece
  otra es justamente que la anterior ya no esté esperándolo. El salón que guardaba las últimas veinte
  se fue, y `leerPartida` borra su clave vieja de paso.
- El legado se comparte con un **código en la URL** (`/juegos/mi-leyenda/<codigo>`): se calcula al
  vuelo, viaja en el botón de compartir y no se guarda en ninguna parte.

## Balance: los números que importan

Medido sobre 1.500 carreras completas, jugando siempre la oferta más grande —la ruta más codiciosa
que existe—: **23,0 decisiones por carrera** (12,0 de mercado, 7,5 eventos, 3,5 momentos) y títulos
colectivos en p25 6 · p50 8 · p75 11 · p95 14. Ese rango es el objetivo: una gran carrera deja ocho o
diez títulos, no veinticinco.

Tres calibraciones que ya se pagaron caras y conviene no repetir:

- **El ruido de la tabla decide cuántas ligas se ganan.** Con la desviación baja, una carrera que
  pasa por los grandes de Europa se llevaba nueve ligas de veinticuatro temporadas y el título dejaba
  de significar nada. Está en `posicionEnLaTabla` y mover ese número cambia el total de la carrera.


- **El crecimiento se mide en OVR pero se aplica a atributos.** El OVR es un promedio ponderado de
  seis casilleros: para que la media suba un punto hay que repartir bastante más que un punto. Sin esa
  cuenta (`repartirCrecimiento`), un juvenil crecía la sexta parte de lo que debía y nadie pasaba de
  65.
- **El mercado abre en todos los capítulos, y el freno está en la oferta.** La primera de las dos
  preguntas de cada bienio es siempre la misma —¿me quedo o me voy?— porque antes salían cinco
  mercados en una carrera entera y el jugador pasaba diez años sin que nadie le preguntara dónde
  quería jugar. Lo que evita el carrusel de doce camisetas es qué se ofrece: con contrato vigente solo
  llega lo que está ocho puntos de renombre por encima, y con el contrato vigente **siempre** se puede
  quedar, porque un contrato es un contrato y una mala temporada no te echa a la calle.
- **El capítulo del debut no reparte títulos.** A los dieciséis, con trece partidos de reserva, el
  campeón fue el club. Salir campeón en el mismo capítulo en que eliges tu primer equipo vaciaba de
  sentido a todos los títulos que venían después.

## Verificar

```bash
pnpm --filter @athena/leyenda test   # motor, catálogo, momentos, y la carrera entera 600 veces
pnpm --filter @athena/web test       # el vuelo de la pelota: que caiga donde el veredicto manda
pnpm --filter @athena/web exec playwright test e2e/juego.spec.ts
```

Los tests del paquete corren contra `mundo.fixture.json`, una copia de las veinte ligas reales. Hace
falta: con un mundo de tres clubes cualquiera sale campeón todos los años y el número de títulos no
significa nada —medía diecisiete donde el mundo de verdad mide ocho—.

El e2e juega una carrera entera hasta el retiro y **mide cuánto tarda**: si pasa de veinte segundos o
de dieciséis pasos, el juego volvió a ser largo y el test falla. Comprueba además los escudos de la
línea de la carrera, el enlace del legado y que la partida se retome al recargar. Las dos rutas del juego están en el suite de axe y en el presupuesto de peso, con
un techo propio y más alto: es una aplicación con estado, no una vista de lectura.
