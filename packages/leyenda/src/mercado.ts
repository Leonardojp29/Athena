/**
 * El mercado: quién te quiere.
 *
 * Regla del juego: **nunca elegís un club de una lista de cuatrocientos**. El mercado te ofrece
 * **como máximo cuatro** equipos que te quieren y elegís entre esos, o te quedás. Es como funciona
 * de verdad —un futbolista elige entre quienes lo llaman— y convierte cada ventana en una decisión
 * con costo: el grande que te sienta en el banco, la liga chica donde sos el rey, el rival de tu club
 * que paga el doble, el club donde debutaste que te quiere de vuelta.
 *
 * Quién llama depende del OVR, la edad, el rendimiento y la fama; nunca del capricho. Y hay dos
 * candidatos que el motor busca a propósito porque son los que producen historias: el rival y la
 * casa.
 */
import { chance, crearAzar, elegir, entre, limitar, mezclar, pesado, type Azar } from './azar.js';
import { normalizarCiudad, rivalesDeclarados } from './clasicos.js';
import {
  MAX_OFERTAS,
  type Carrera,
  type Club,
  type Liga,
  type Mundo,
  type Oferta,
  type Rol,
} from './estado.js';

/** El azar del clásico de tu club de origen: estable durante toda la carrera. */
const crearAzarDeCasa = (carrera: Carrera): Azar => crearAzar((carrera.semilla + 31) >>> 0);

/** Cuánto paga un club por temporada, en millones, según su fuerza y lo que valés. */
function salarioDe(azar: Azar, club: Club, valor: number, rol: Rol): number {
  const base = (valor / 8) * (0.6 + club.fuerza / 110);
  const porRol = rol === 'estrella' ? 1.35 : rol === 'titular' ? 1.1 : rol === 'rotacion' ? 0.8 : 0.6;
  return Math.max(0.05, Math.round(base * porRol * (0.9 + azar.siguiente() * 0.3) * 100) / 100);
}

/**
 * El rol que el club te promete. Un club mucho más fuerte que tu nivel te promete rotación —y a veces
 * miente, que es lo que hace interesante al riesgo—; uno más débil te promete ser la estrella.
 */
function rolPrometido(azar: Azar, club: Club, ovr: number, edad: number): Rol {
  const brecha = club.fuerza - ovr;
  if (brecha > 12) return edad <= 21 ? 'promesa' : 'suplente';
  if (brecha > 5) return 'rotacion';
  if (brecha > -6) return 'titular';
  return edad >= 24 ? 'estrella' : 'titular';
}

const PROYECTOS_GRANDE = [
  'Quieren pelear todo y te ven en el once del año que viene.',
  'Vienen de quedarse afuera y arman un plantel para no repetirlo.',
  'El técnico te pidió por nombre.',
  'Te ofrecen la camiseta que dejó libre su ídolo.',
];
const PROYECTOS_PROYECTO = [
  'Proyecto joven: pocos nombres, muchos minutos.',
  'Quieren que seas el eje del equipo desde el primer día.',
  'Prometen paciencia y una idea de juego clara.',
  'Reconstrucción total: te quieren como bandera.',
];
const PROYECTOS_RIESGO = [
  'Pagan mucho y exigen resultados desde la primera fecha.',
  'Cambiaron de técnico tres veces en dos años.',
  'La hinchada está caliente y no perdona un mal arranque.',
  'Ofrecen una fortuna, pero nadie sabe cuánto durará el proyecto.',
];

/*
 * Cuatro ofertas con la misma frase se leen como un error del juego, no como una coincidencia. Se
 * elige sin reponer dentro de la misma ventana, y solo se repite si el repertorio se agotó.
 */
function elegirSinRepetir(azar: Azar, opciones: string[], usados: Set<string>): string {
  const libres = opciones.filter((o) => !usados.has(o));
  const elegido = elegir(azar, libres.length > 0 ? libres : opciones);
  usados.add(elegido);
  return elegido;
}

function proyectoDe(
  azar: Azar,
  club: Club,
  rol: Rol,
  riesgo: 'bajo' | 'medio' | 'alto',
  usados: Set<string>,
): string {
  if (riesgo === 'alto') return elegirSinRepetir(azar, PROYECTOS_RIESGO, usados);
  if (rol === 'estrella' || club.fuerza < 60) return elegirSinRepetir(azar, PROYECTOS_PROYECTO, usados);
  return elegirSinRepetir(azar, PROYECTOS_GRANDE, usados);
}

/**
 * El renombre mínimo para que un club aparezca en el juego.
 *
 * Con 45 seguían colándose los del fondo de las ligas chicas —Sport Huancayo, ADT, Atlético Grau— y
 * una carrera podía terminar más abajo de donde empezó. Con 55 quedan los ocho o diez clubes que en
 * cada país la gente nombra sin pensar, que es la promesa: una carrera linda, no un censo.
 */
const RENOMBRE_MINIMO = 55;

/**
 * La escalera.
 *
 * El sueño de este juego es el mismo del fútbol de verdad: salir de un club mediano de tu país,
 * ganarte el grande de tu liga, cruzar a Brasil o Argentina y terminar en una de las cinco de
 * Europa. Cada escalón se gana con rendimiento, y el mercado tiene que **empujar hacia arriba**:
 * quedarse doce capítulos en la misma liga siendo el mejor de todos no es una carrera, es una
 * meseta.
 *
 * El número es el renombre del club, que ya combina el peso de su liga, dónde termina y cuántas
 * copas continentales juega.
 */
/**
 * Los cinco escalones, por renombre del club. Una carrera los sube **de a uno**.
 *
 *   chico local → grande local → grande del continente → Europa → elite mundial
 *
 * Un pibe de Cienciano no ficha por el Barcelona, y que el juego lo permitiera arruinaba lo único
 * que esta clase de juego tiene para dar: la sensación de haber llegado. Ahora el salto se hace en
 * etapas y cada una hay que ganársela; solo la joya de veinte años con dos años enormes se saltea
 * un escalón, que es la excepción que también existe en el fútbol de verdad.
 */
const ESCALONES = [
  { hasta: 64, nombre: 'chico local' },
  { hasta: 75, nombre: 'grande local' },
  { hasta: 84, nombre: 'grande del continente' },
  { hasta: 92, nombre: 'Europa' },
  { hasta: 100, nombre: 'elite mundial' },
] as const;

export const escalonDe = (renombre: number): number =>
  ESCALONES.findIndex((e) => renombre <= e.hasta) === -1
    ? ESCALONES.length - 1
    : ESCALONES.findIndex((e) => renombre <= e.hasta);

export const nombreDelEscalon = (renombre: number): string =>
  ESCALONES[escalonDe(renombre)]?.nombre ?? '';

/**
 * Cuánto por encima de tu nivel puede estar un club que te llame, según la edad.
 *
 * Es la regla más parecida a cómo fichan los clubes de verdad, y la que el juego no tenía: a los
 * diecinueve te compran por lo que vas a ser y una brecha de veinte puntos es normal; a los
 * veintiocho te compran por lo que sos y la brecha se cierra; a los treinta y cuatro nadie paga por
 * un futuro que no existe, así que solo te llaman clubes de tu nivel o por debajo.
 */
function brechaTolerada(edad: number): number {
  if (edad <= 20) return 22;
  if (edad <= 23) return 16;
  if (edad <= 26) return 10;
  if (edad <= 29) return 6;
  if (edad <= 32) return 2;
  return -2;
}

/**
 * Cuánto le interesa tu edad a este club.
 *
 * Un grande quiere el prime —veintitrés a veintinueve— y paga por una promesa con techo, pero no
 * gasta una plaza en alguien de treinta y cinco. Un club mediano vive del que sube y del que baja, y
 * un club chico es donde uno empieza y donde uno termina. Es la curva que hace que la carrera tenga
 * forma: te suben cuando toca y te devuelven a casa cuando toca.
 */
function ajustePorEdad(club: Club, edad: number, potencial: number, ovr: number): number {
  const grande = club.renombre >= 84;
  const mediano = club.renombre >= 70;
  const techo = potencial - ovr;

  if (edad <= 21) {
    /* Al pibe lo compra el que cree en su techo; con poco margen, nadie apuesta. */
    return grande ? (techo >= 10 ? 28 : -25) : mediano ? 14 : 6;
  }
  if (edad <= 26) return grande ? 22 : mediano ? 16 : 0;
  if (edad <= 29) return grande ? 14 : mediano ? 12 : 2;
  if (edad <= 32) return grande ? -12 : mediano ? 4 : 12;
  /* Pasados los 33 el mercado se invierte: los grandes no llaman y los de abajo sí. */
  return grande ? -60 : mediano ? -20 : 22;
}

/**
 * ¿Este club te querría? Devuelve el peso con el que aparecería entre las ofertas; 0 es "no te
 * llama". Un club nunca te llama si estás muy por debajo de su nivel, y pierde interés si estás muy
 * por encima del suyo salvo que seas de la casa.
 *
 * Dos cosas mandan, como en cualquier juego de fútbol: **la media y la edad**. La media dice si das
 * el nivel; la edad dice si te compran por lo que sos o por lo que vas a ser. Todo lo demás —la
 * fama, el bienio, la escalera— ajusta alrededor de esas dos.
 *
 * La escalera es la clave del juego: **el mercado tiene que llevarte hacia arriba**. Un club de menos
 * renombre que el tuyo casi no llama, y la carrera camina de la liga local a Europa en lugar de
 * rebotar entre equipos que nadie conoce.
 */
export function interesDe(club: Club, carrera: Carrera, esDeLaCasa: boolean): number {
  const { ovr, futbolista, vida } = carrera;
  const brecha = club.fuerza - ovr;

  /* Los clubes que nadie ubica no existen para el juego, salvo que sea tu casa. */
  if (club.renombre < RENOMBRE_MINIMO && !esDeLaCasa) return 0;

  /* La brecha que tu edad permite. Es la puerta: si no la pasás, este club no te mira. */
  if (brecha > brechaTolerada(futbolista.edad) && !esDeLaCasa) return 0;

  /*
   * Y la puerta de salida de los grandes. A los treinta y tres, un club que te queda por encima ya no
   * te ficha: se busca a alguien de veinticinco. Sin esto, una carrera terminaba de titular en el
   * Madrid a los treinta y ocho, que es lo único que ningún jugador de fútbol logra.
   */
  if (futbolista.edad >= 33 && club.fuerza > ovr + 2 && !esDeLaCasa) return 0;

  /*
   * El salto grande hay que ganárselo. Un club muy por encima de tu nivel solo mira a alguien que
   * viene de dos años enormes: sin esto, cualquier juvenil de una liga chica pasaba a la Juventus en
   * su primer capítulo y el ascenso —que es el corazón del juego— salía gratis.
   */
  const ultima = carrera.temporadas.at(-1);
  const bienioGrande = (ultima?.notaMedia ?? 0) >= 7.2 || (ultima?.goles ?? 0) >= 30;
  if (brecha > 8 && !bienioGrande) return 0;

  /*
   * La escalera, de a un escalón por vez. La joya de veinte años que viene de romperla puede saltear
   * uno —el pibe que un grande de Europa va a buscar a Sudamérica—, pero es la excepción y hay que
   * merecerla.
   */
  const escalonActual = escalonDe(carrera.clubActual?.renombre ?? 0);
  const salto2 = escalonDe(club.renombre) - escalonActual;
  const joya = futbolista.edad <= 21 && bienioGrande && (ultima?.notaMedia ?? 0) >= 7.5;
  if (salto2 > (joya ? 2 : 1)) return 0;

  let peso = 100 - Math.abs(brecha) * 4;
  if (brecha > 0) peso += Math.max(0, 12 - brecha) * 2;
  peso += (vida.fama / 100) * 12;
  peso += (carrera.temporadas.at(-1)?.notaMedia ?? 6.5) >= 7.2 ? 18 : 0;
  /* La curva de la edad de este club: es lo que decide quién te llama y a qué altura de tu carrera. */
  peso += ajustePorEdad(club, futbolista.edad, futbolista.potencial, ovr);
  if (esDeLaCasa) peso += 40;

  /*
   * Subir de categoría pesa mucho; bajar casi nunca pasa antes de los treinta. Esto es lo que
   * convierte una sucesión de fichajes en una carrera con forma.
   */
  const actual = carrera.clubActual?.renombre ?? 0;
  const salto = club.renombre - actual;
  if (salto > 0) peso += Math.min(salto * 1.6, 45);
  else if (salto < -2 && futbolista.edad < 31) {
    /* Bajar de categoría en pleno ascenso no es una carrera: es dar marcha atrás. Se vuelve raro. */
    peso *= 0.12;
  }

  /*
   * Y el que ya se comió su liga tiene que poder irse. Si tu nivel supera al club más grande de
   * donde jugás, los de tu misma liga dejan de llamarte y el salto al exterior se vuelve el camino
   * natural: es exactamente lo que le pasa a un crack en una liga chica.
   */
  const mismaLiga = club.ligaSlug === carrera.clubActual?.ligaSlug;
  if (mismaLiga && ovr > actual + 6) peso *= 0.2;

  /* El escalón inmediatamente superior es el que más pesa: es el camino que la carrera quiere tomar. */
  if (salto2 === 1 && ovr >= club.fuerza - 6) peso += 30;

  return Math.max(0, peso);
}

/**
 * Las ligas de destino tardío: Asia, África y las de peso bajo.
 *
 * No es un juicio sobre esas ligas, es una decisión de narrativa: nadie sueña con debutar en la liga
 * canadiense, pero la oferta millonaria de Arabia a los 31 —o el retiro dorado en la MLS— es una
 * decisión con sabor. Se abren a partir de los treinta.
 */
const DESTINOS_DE_MADUREZ = new Set(['major-league-soccer']);

export function esDestinoTardio(liga: { slug: string; continente: string; peso: number }): boolean {
  return (
    liga.continente === 'asia' ||
    liga.continente === 'africa' ||
    liga.peso < 52 ||
    DESTINOS_DE_MADUREZ.has(liga.slug)
  );
}

export interface ParametrosDeMercado {
  mundo: Mundo;
  /** El club del que hay que salir: nunca se ofrece a sí mismo. */
  actual: Club | null;
}

/**
 * Arma las ofertas de la ventana. Nunca más de cuatro, y siempre variadas: se toma como mucho una
 * por liga para que las cuatro no sean el mismo destino con otro escudo, salvo el rival y la casa,
 * que entran por derecho propio porque son las decisiones que el jugador va a recordar.
 */
export function armarOfertas(azar: Azar, carrera: Carrera, params: ParametrosDeMercado): Oferta[] {
  const { mundo, actual } = params;
  const candidatos: Array<{ club: Club; liga: Liga; peso: number; matices: string[] }> = [];

  const ligaActual = mundo.ligas.find((l) => l.slug === actual?.ligaSlug) ?? null;
  const rival = actual && ligaActual ? rivalDe(azar, ligaActual, actual) : null;
  const casa = carrera.clubDeOrigen;

  /*
   * El último capítulo de una carrera es volver.
   *
   * Pasados los 33 el club donde debutaste —y su clásico rival, que es la otra gran historia— entran
   * siempre entre las ofertas, cueste lo que cueste en el resto de las cuentas. Retirarse en casa o
   * hacerlo enfrente son los dos finales que la gente recuerda, y el juego tiene que ofrecerlos.
   */
  const vuelveACasa = carrera.futbolista.edad >= 33 && casa !== null;

  /*
   * Europa se gana, no se sortea.
   *
   * La escalera real de un sudamericano es club chico → grande de su país → un país grande del mismo
   * continente → Europa: un pibe de veinte que la rompe en Perú no ficha en la Bundesliga, primero
   * pasa por Brasil, Argentina o México. La excepción es la joya —el que sale con una media que no se
   * discute—, porque esa también es una historia real, solo que rara. Quien empieza en Europa no
   * tiene puerta que abrir.
   */
  const continenteDeOrigen =
    mundo.ligas.find((l) => l.slug === carrera.clubDeOrigen?.ligaSlug)?.continente ?? null;
  const pesoMaximoJugado = carrera.temporadas.reduce(
    (alto, t) => Math.max(alto, mundo.ligas.find((l) => l.slug === t.ligaSlug)?.peso ?? 0),
    0,
  );
  const listoParaEuropa =
    continenteDeOrigen === null ||
    continenteDeOrigen === 'europa' ||
    pesoMaximoJugado >= 72 ||
    carrera.ovr >= 84;
  const ligaDeCasa = casa ? (mundo.ligas.find((l) => l.slug === casa.ligaSlug) ?? null) : null;
  const rivalDeCasa = casa && ligaDeCasa ? rivalDe(crearAzarDeCasa(carrera), ligaDeCasa, casa) : null;

  for (const liga of mundo.ligas) {
    /* Arabia, Japón o Canadá recién a los 30: antes rompen la carrera en lugar de darle sabor. */
    if (esDestinoTardio(liga) && carrera.futbolista.edad < 30) continue;
    if (liga.continente === 'europa' && !listoParaEuropa) continue;
    for (const club of liga.clubes) {
      if (club.slug === actual?.slug) continue;
      const esDeLaCasa = club.slug === casa?.slug;
      const peso = interesDe(club, carrera, esDeLaCasa);
      if (peso <= 0) continue;

      const matices: string[] = [];
      if (club.slug === rival?.slug) matices.push('rival');
      if (esDeLaCasa && carrera.clubes.length > 1) matices.push('regreso');
      if (liga.slug !== actual?.ligaSlug) matices.push('afuera');
      /* Si alguna vez juraste no ir a este club, el juego lo sabe y la oferta llega marcada. */
      if (carrera.recuerdos.some((r) => r.etiquetas.includes(`promesa:nunca:${club.slug}`))) {
        matices.push('promesa-rota');
      }
      candidatos.push({ club, liga, peso, matices });
    }
  }

  /* Al final de la carrera, la casa y su rival entran aunque las cuentas digan otra cosa. */
  if (vuelveACasa && ligaDeCasa) {
    for (const club of [casa, rivalDeCasa]) {
      if (!club || club.slug === actual?.slug) continue;
      if (candidatos.some((c) => c.club.slug === club.slug)) continue;
      candidatos.push({
        club,
        liga: ligaDeCasa,
        peso: 160,
        matices: club.slug === casa?.slug ? ['regreso'] : ['rival', 'regreso-rival'],
      });
    }
  }

  if (candidatos.length === 0) return [];

  const elegidos: Array<{ club: Club; liga: Liga; matices: string[] }> = [];
  const ligasTomadas = new Set<string>();

  /* El rival y la casa entran primero: son las ofertas que hacen la historia. */
  for (const especial of ['rival', 'regreso']) {
    const encontrado = candidatos.find((c) => c.matices.includes(especial));
    if (encontrado && elegidos.length < MAX_OFERTAS && (vuelveACasa || chance(azar, 0.55))) {
      elegidos.push(encontrado);
      ligasTomadas.add(encontrado.liga.slug);
    }
  }

  const resto = mezclar(
    azar,
    candidatos.filter((c) => !elegidos.includes(c)),
  ).map((c) => ({ item: c, peso: c.peso }));

  while (elegidos.length < MAX_OFERTAS && resto.length > 0) {
    const elegido = pesado(azar, resto);
    if (!elegido) break;
    const indice = resto.findIndex((r) => r.item === elegido);
    resto.splice(indice, 1);
    /* Una por liga: cuatro ofertas de la misma liga no son cuatro caminos distintos. */
    if (ligasTomadas.has(elegido.liga.slug)) continue;
    ligasTomadas.add(elegido.liga.slug);
    elegidos.push(elegido);
  }

  const usados = new Set<string>();
  return elegidos.map((e, i) => {
    const rol = rolPrometido(azar, e.club, carrera.ovr, carrera.futbolista.edad);
    const riesgo: 'bajo' | 'medio' | 'alto' =
      e.matices.includes('rival') || e.club.fuerza - carrera.ovr > 8
        ? 'alto'
        : e.club.fuerza - carrera.ovr > 0
          ? 'medio'
          : 'bajo';
    return {
      id: `oferta-${carrera.anio}-${i}`,
      club: e.club,
      salario: salarioDe(azar, e.club, carrera.valor, rol),
      rolPrometido: rol,
      proyecto: proyectoDe(azar, e.club, rol, riesgo, usados),
      /* Cuatro a ocho años: dos a cuatro capítulos. Con contratos de dos años el mercado abría en
         todos los capítulos y una carrera terminaba con ocho camisetas. */
      temporadas: entre(azar, 4, 8),
      matices: e.matices,
      riesgo,
    } satisfies Oferta;
  });
}

/**
 * El clásico. Sin datos de rivalidades reales, el rival es el club de fuerza más parecida en la misma
 * liga: en el fútbol, el que te pelea de igual a igual es el que te duele.
 */
export function rivalDe(azar: Azar, liga: Liga, club: Club): Club | null {
  const otros = liga.clubes.filter((c) => c.slug !== club.slug);
  if (otros.length === 0) return null;

  /*
   * 1. El clásico declarado, y sin sortear: un club tiene un clásico, no tres candidatos. La tabla
   * los lista por importancia, así que el primero que esté en esta liga es el que manda —el de
   * Universitario es Alianza aunque también juegue con Cristal—.
   */
  const declarados = rivalesDeclarados(club.slug);
  for (const slug of declarados) {
    const historico = otros.find((c) => c.slug === slug);
    if (historico) return historico;
  }

  /* 2. El vecino: mismo estadio o misma ciudad. Dos equipos del barrio se odian aunque nadie lo escriba. */
  const ciudad = normalizarCiudad(club.ciudad);
  if (ciudad) {
    const vecinos = otros.filter((c) => normalizarCiudad(c.ciudad) === ciudad);
    if (vecinos.length > 0) {
      /* Entre varios vecinos manda el más grande: el derbi que se juega en la tele. */
      const ordenados = [...vecinos].sort((a, b) => b.renombre - a.renombre);
      return ordenados[0] ?? null;
    }
  }

  /*
   * 3. Y si no hay historia ni barrio, el más grande de la liga que no seas tú. Antes se elegía "el
   * de fuerza más parecida", que es como el United terminaba jugando su clásico con el Sunderland.
   */
  const grandes = [...otros].sort((a, b) => b.renombre - a.renombre);
  return grandes[0] ?? null;
}

/**
 * Dónde debutás: **clubes medianos de tu país, reconocibles pero no gigantes**.
 *
 * Es el primer escalón de la escalera y está elegido a propósito. En un grande, un pibe de dieciséis
 * mira los partidos desde el banco; en un mediano juega, mete goles y se hace ver, que es justo lo
 * que necesita para que al capítulo siguiente lo llamen del grande. Y siguen siendo clubes que la
 * gente ubica: quedan afuera tanto el campeón como los que nadie sabría nombrar.
 */
export function ofertasDeDebut(azar: Azar, carrera: Carrera, liga: Liga): Oferta[] {
  const conocidos = [...liga.clubes]
    .filter((c) => c.renombre >= RENOMBRE_MINIMO)
    .sort((a, b) => b.renombre - a.renombre);
  /* Se saltean los dos o tres más grandes y se ofrecen los del pelotón: ahí se juega. */
  const desde = conocidos.length > 8 ? 3 : conocidos.length > 5 ? 2 : 0;
  const pelotón = conocidos.slice(desde, desde + 6);
  const posibles = mezclar(azar, pelotón.length >= 3 ? pelotón : conocidos).slice(0, MAX_OFERTAS);
  const usados = new Set<string>();

  return posibles.map((club, i) => {
    /* En un grande se arranca desde la cantera; en uno mediano se juega antes. */
    const rol = club.fuerza <= 58 ? 'rotacion' : 'promesa';
    return {
      id: `debut-${i}`,
      club,
      salario: salarioDe(azar, club, Math.max(0.4, carrera.valor), rol),
      rolPrometido: rol,
      proyecto: elegirSinRepetir(
        azar,
        club.fuerza <= 58
          ? [
              'Necesitan gente ya: vas a jugar desde el arranque.',
              'El plantel está corto y el técnico mira a los pibes.',
              'Te quieren para pelear el puesto ahora mismo.',
            ]
          : [
              'Te suman al plantel profesional y vas de a poco.',
              'Primero la reserva, y si andas, arriba.',
              'El técnico quiere verte en pretemporada.',
              'Firmas con la primera y entrenas con los grandes.',
            ],
        usados,
      ),
      temporadas: entre(azar, 4, 6),
      matices: ['debut'],
      riesgo: club.fuerza > carrera.ovr + 8 ? 'medio' : 'bajo',
    } satisfies Oferta;
  });
}

/**
 * El préstamo: la salida del que no juega.
 *
 * Es una de las decisiones más de guion que tiene el fútbol —bajar de categoría un año para volver a
 * jugar— y el juego la necesita porque es lo que salva a una carrera que se estancó en el banco de un
 * grande. Aparece justo cuando duele: rol de suplente en un club que te queda grande.
 */
export function ofertaDePrestamo(azar: Azar, carrera: Carrera, mundo: Mundo): Oferta | null {
  const actual = carrera.clubActual;
  if (!actual) return null;
  const enElBanco = carrera.rol === 'suplente' || carrera.rol === 'promesa';
  const leQuedaGrande = actual.fuerza > carrera.ovr + 4;
  if (!enElBanco || !leQuedaGrande || carrera.futbolista.edad > 26) return null;

  /* Un club de un escalón abajo, donde jugar todos los domingos. */
  const candidatos = mundo.ligas
    .filter((l) => !esDestinoTardio(l))
    .flatMap((l) => l.clubes)
    .filter(
      (c) =>
        c.slug !== actual.slug &&
        c.renombre >= RENOMBRE_MINIMO &&
        c.fuerza <= carrera.ovr + 2 &&
        c.fuerza >= carrera.ovr - 12,
    );
  if (candidatos.length === 0) return null;

  const club = elegir(azar, mezclar(azar, candidatos).slice(0, 6));
  return {
    id: `prestamo-${carrera.anio}`,
    club,
    salario: Math.max(0.05, Math.round((carrera.valor / 12) * 100) / 100),
    rolPrometido: 'titular',
    proyecto: `${actual.nombre} te presta por dos años para que juegues todos los domingos.`,
    temporadas: 2,
    matices: ['prestamo'],
    riesgo: 'bajo',
  };
}

/** ¿El club actual quiere renovar? Depende del rendimiento y de cómo te llevás con ellos. */
export function quiereRenovar(carrera: Carrera): boolean {
  const nota = carrera.temporadas.at(-1)?.notaMedia ?? 6.5;
  const conClub = carrera.relaciones.club.confianza - carrera.relaciones.club.rencor;
  const puntaje = (nota - 6.4) * 30 + conClub * 0.5 - Math.max(0, carrera.futbolista.edad - 32) * 12;
  return puntaje > 12;
}

export const limitarOfertas = (ofertas: Oferta[]): Oferta[] => ofertas.slice(0, MAX_OFERTAS);

export const salarioLimpio = (salario: number): number => limitar(salario, 0.02, 60);
