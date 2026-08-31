# Mi Leyenda — cómo está hecho

El primer juego de Athena. Creás un futbolista y vivís su carrera hasta el retiro; al final te queda
la carta de toda tu vida y un legado compartible por enlace. Este documento existe para poder sumar
contenido y pantallas sin releer el código.

**Doce capítulos de dos años, de los 16 a los 38, y una carrera se termina en menos de veinte
segundos.** Esa duración es el diseño: la primera versión eran veinte temporadas y cien clics, casi
nadie llegaba al final —que es justo donde está lo bueno— y por eso el e2e la mide en lugar de
confiar en que no crezca sola.

## La idea que ordena todo

**Nunca elegís el club.** En la creación llenás nombre, dorsal, puesto, pie y liga; después el
mercado te ofrece **como máximo cuatro** equipos que te quieren, y elegís entre esos. Vale al
debutar y en cada ventana de transferencias. `MAX_OFERTAS = 4` es una regla del diseño, no un tope
técnico: si algún día se ofrecen cinco, el juego pierde lo que lo hace un juego.

## El motor y la pantalla

`packages/leyenda` es el juego. TypeScript puro, sin DOM, testeado con vitest. La web solo lo
reproduce.

Un solo verbo:

```ts
avanzarCapitulo(carrera, eleccion, mundo) → { carrera, capitulo }
```

Cada capítulo hace siempre lo mismo: juega dos temporadas, escribe una fila en la línea de la
carrera, deja un titular de prensa y plantea **una** decisión —mercado, evento o momento jugable—.
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
| `capitulo.ts` | El orquestador: los doce capítulos, el crecimiento y la decisión siguiente |

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
- El salón (`athena:leyenda-salon`) guarda **solo el veredicto** de las carreras terminadas: guardar
  veinte carreras completas llenaría el almacenamiento y nadie vuelve a mirar la temporada nueve de
  su tercer futbolista.
- El legado se comparte con un **código en la URL** (`/juegos/mi-leyenda/<codigo>`): quien lo abre ve
  la carta de verdad, interactiva, y nada se guarda en el servidor.

## Balance: los números que importan

Dos calibraciones que ya se pagaron caras y conviene no repetir:

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
