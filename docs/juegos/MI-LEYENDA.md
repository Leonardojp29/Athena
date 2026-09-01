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

### La otra mitad de la carrera

`fueraDeLaCancha(carrera)` en `legado.ts` mide lo que no es fútbol: fama, reputación, exposición,
cariño de la tribuna, portadas, escándalos y romances, más la portada que más pesó y una línea de
veredicto. Todo eso el motor ya lo movía —un escándalo te cuesta el puesto dos años después— pero no
se veía en ninguna parte, y una vida que no se mide es una vida que el jugador no sabe que tuvo.

## Sumar un evento

Se agrega un objeto al catálogo (`eventos/futbol.ts`, `prensa.ts`, `vida.ts`) y no se toca el motor.

```ts
{
  id: 'futbol-algo-nuevo',
  categoria: 'futbol',
  rareza: 'infrecuente',          // pesa 45 contra 100 de lo común; 'mitico' pesa 0,4
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
un país grande del mismo continente → Europa, que es el techo → volver a casa o a la del rival**.
Tres reglas la sostienen, todas en `mercado.ts`:

- **Un escalón por vez.** `ESCALONES` parte el renombre en cinco tramos y una oferta normal sube como
  mucho uno; saltar dos lo hace solo la joya, el que sale con una media que no se discute.
- **Europa se gana.** Quien no nació en Europa la ve recién después de pasar por una liga de peso 72
  o más —México, Argentina, Brasil— o de romperla con 84 de media. Sin esta regla, un pibe de veinte
  pasaba de Cusco a la Bundesliga.
- **Los destinos de madurez** —Asia, África, la MLS y las ligas de peso bajo— aparecen a partir de los
  30, cuando son una decisión con sabor en lugar de un mal comienzo. Pasados los 33, el club donde
  debutaste y su clásico rival entran siempre entre las ofertas.

**El mercado mira la media y la edad, en ese orden.** `brechaTolerada(edad)` dice cuánto por encima
de tu nivel puede estar un club que te llame: veintidós puntos a los veinte —te compran por lo que
vas a ser—, seis a los veintiocho y ninguno a partir de los treinta y tres, cuando un club que te
queda por encima ya no te ficha. Y `ajustePorEdad` es la curva del club: un grande quiere el prime y
paga por una promesa con techo, un club chico es donde uno empieza y donde uno vuelve.

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

| Momento | Mecánica | Quién lo juega |
|---|---|---|
| Penal | Arrastrar desde la pelota: largo = fuerza, curva del gesto = comba | todos menos el arquero |
| Mano a mano | Definir mientras el arquero sale a achicar | delanteros y extremos |
| Tiro libre | El arco del arrastre pasa la barrera y baja | medios y mediapuntas |
| Atajada | Desde el arco: elegir zona y momento del vuelo | arqueros |

Se juegan sobre un motor propio en `apps/web/src/components/juego/cancha/`: `fisica.ts` integra la
pelota en tres dimensiones a paso fijo con gravedad, rozamiento y efecto Magnus —la comba sale de la
simulación, no de una animación—, `escena.ts` proyecta esa física a la pantalla y dibuja el estadio
nocturno, y `arquero.ts` la silueta que vuela. Todo con teclado también: flechas apuntan, espacio
define.

La interfaz manda **la intención** (dónde, cuánta fuerza, con qué timing) y el motor decide con los
atributos, la presión de la escena y el azar semillado. Nada se resuelve en el navegador, así que un
resultado no se puede falsear ni depende de la velocidad de la máquina.

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
que existe—: **22,8 decisiones por carrera** (14,3 eventos, 5,4 de mercado, 3,0 momentos) y títulos
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
- **El mercado no abre todos los años.** Con contrato largo firmado, solo una de cada cinco veces
  aparece una oferta. Sin el freno, una carrera terminaba con catorce camisetas y el fichaje dejaba de
  ser una decisión.

## Verificar

```bash
pnpm --filter @athena/leyenda test      # motor: determinismo, tope de 4 ofertas, prime, arquetipos
pnpm --filter @athena/web exec playwright test e2e/juego.spec.ts
```

El e2e juega una carrera entera hasta el retiro y **mide cuánto tarda**: si pasa de veinte segundos o
de dieciséis pasos, el juego volvió a ser largo y el test falla. Comprueba además los escudos de la
línea de la carrera, el enlace del legado y que la partida se retome al recargar. Las dos rutas del juego están en el suite de axe y en el presupuesto de peso, con
un techo propio y más alto: es una aplicación con estado, no una vista de lectura.
