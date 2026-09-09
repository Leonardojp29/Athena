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
  type Puesto,
  type Rol,
  type Temporada,
} from './estado.js';

/** La liga de un club, o una liga neutra si el mundo no la trae: solo para rotular. */
const ligaDelClub = (mundo: Mundo, club: Club): Pick<Liga, 'continente' | 'peso'> =>
  mundo.ligas.find((l) => l.slug === club.ligaSlug) ?? { continente: club.continente, peso: 50 };

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

/* ───────────────────────────────────── el nivel del club ───────────────────────────────────── */

/**
 * Los cinco niveles con los que el mercado razona.
 *
 *   1 chico · 2 grande local · 3 grande del continente / club de Europa · 4 grande de Europa · 5 millonario
 *
 * **No salen del renombre solo**, y eso es a propósito. El renombre viene de tablas recientes y no es
 * comparable entre ligas: Brasil, México y la MLS están inflados diez u once puntos respecto de su
 * fuerza, e Italia, Portugal y Países Bajos deflacionados hasta catorce. Con renombre crudo, Real
 * Betis (97) y Freiburg (94) quedaban por encima de Juventus, Milan y PSG (90); Toluca (86) casi
 * empataba a Ajax; y Lanús tenía 86, por lo que Boca (89) se leía como un paso lateral y no como el
 * grande del país. Acá el nivel cruza renombre, fuerza y el peso de la liga, y el escalón de arriba
 * es una lista declarada —igual que `clasicos.ts` declara los rivales—, porque quién es millonario lo
 * dicen la historia y la plata, no la tabla del año pasado.
 */
export type NivelDeClub = 1 | 2 | 3 | 4 | 5;

const MILLONARIOS = new Set([
  'real-madrid',
  'barcelona',
  'atletico-madrid',
  'manchester-city',
  'liverpool',
  'arsenal',
  'chelsea',
  'manchester-united',
  'bayern-munchen',
  'borussia-dortmund',
  'paris-saint-germain',
  'inter',
  'ac-milan',
  'juventus',
]);

/**
 * Los que compran joven con proyección para vender después. Son el peldaño natural entre el grande
 * del continente y el millonario, y el motor antes no los conocía.
 */
const VENDEDORES = new Set([
  'fc-porto',
  'benfica',
  'sporting-cp',
  'ajax',
  'psv-eindhoven',
  'feyenoord',
  'flamengo',
  'palmeiras',
  'boca-juniors',
  'river-plate',
  'racing-club',
]);

/**
 * Las ligas de destino tardío: la plata grande a los treinta, no un lugar donde empezar.
 *
 * Declaradas por slug y no por `peso < 52`, que marcaba a Perú (54) como casi tardío y dejaba a Egipto
 * (52) adentro por un punto. No es un juicio sobre esas ligas: nadie sueña con debutar en la MLS, pero
 * el retiro dorado ahí, o la oferta millonaria de Arabia, es una decisión con sabor.
 */
const DESTINOS_TARDIOS = new Set([
  'major-league-soccer',
  'pro-league',
  'j1-league',
  'canadian-premier-league',
  'premier-league-egypt',
]);

export function esDestinoTardio(liga: { slug: string; continente: string; peso: number }): boolean {
  return DESTINOS_TARDIOS.has(liga.slug) || liga.continente === 'africa';
}

export function nivelDeClub(club: Club, liga: Pick<Liga, 'continente' | 'peso'>): NivelDeClub {
  if (MILLONARIOS.has(club.slug)) return 5;
  if (liga.continente === 'europa') {
    if (club.renombre >= 86 || club.fuerza >= 82) return 4;
    if (club.renombre >= 70 || club.fuerza >= 76) return 3;
    if (club.renombre >= 60 || club.fuerza >= 70) return 2;
    return 1;
  }
  /* En América, el grande del continente es el que pesa en su liga y la liga pesa: Toluca queda en 2. */
  if (club.renombre >= 85 && liga.peso >= 75) return 3;
  if (club.renombre >= 70) return 2;
  return 1;
}

/** El rótulo que ve el jugador en la tarjeta. Es lo que le cuenta en qué escalón está parado. */
export function nombreDelNivelDeClub(nivel: NivelDeClub, liga: Pick<Liga, 'continente'>): string {
  if (nivel === 5) return 'Millonario';
  if (nivel === 4) return 'Grande de Europa';
  if (nivel === 3) return liga.continente === 'europa' ? 'Club de Europa' : 'Grande del continente';
  if (nivel === 2) return 'Grande local';
  return 'Club chico';
}

/* ───────────────────────────────────── la cotización ───────────────────────────────────── */

/**
 * Cómo te ve un scout. Cinco números y la edad, y con eso el mercado decide quién te mira.
 *
 * Antes la única señal de rendimiento era el último bienio —nota alta o treinta goles— y un 72 con
 * siete partidos se veía idéntico a un 72 con cuarenta. Por eso Boca quería al chico de Lanús que
 * había jugado siete. Toda la materia prima de acá ya estaba en `Temporada` y nadie la leía.
 */
export interface Cotizacion {
  /** Lo que sos hoy: el OVR. */
  nivel: number;
  edad: number;
  /** Lo que demostraste, 0-100. Siete partidos ≈ 15; una temporada de titular ≈ 50; un ícono ≈ 90. */
  pruebas: number;
  /** Quién puede verte, 0-100: la liga donde jugás, la copa continental, la selección, la fama. */
  visibilidad: number;
  /** Tu techo, 0-100. Solo cuenta hasta los 24: después ya no se compra futuro. */
  proyeccion: number;
  /** Subís, estás o bajás, según los dos últimos bienios. */
  trayectoria: -1 | 0 | 1;
}

/** Goles más asistencias por partido que se le piden a cada puesto para decir que rindió. */
const APORTE_ESPERADO: Record<Puesto, number> = {
  POR: 0.02,
  DFC: 0.08,
  LAT: 0.15,
  MC: 0.25,
  MO: 0.45,
  EXT: 0.5,
  DC: 0.6,
};

/** Cuánto demostró en un bienio, 0-100. */
function pruebasDelBienio(t: Temporada | undefined, puesto: Puesto): number {
  if (!t || t.partidos === 0) return 0;
  /* Cincuenta partidos en dos años es un titular pleno. */
  const porPartidos = Math.min(t.partidos / 50, 1) * 40;
  /* El aporte por partido vale poco con una muestra chica: siete partidos no prueban nada. */
  const aporte = (t.goles + t.asistencias) / t.partidos;
  const porAporte = Math.min(aporte / APORTE_ESPERADO[puesto], 1.6) * 20 * Math.min(t.partidos / 25, 1);
  const porNota = limitar((t.notaMedia - 6) * 12, 0, 25);
  const porTitulos = Math.min(t.trofeos.length, 2) * 5;
  return Math.min(porPartidos + porAporte + porNota + porTitulos, 100);
}

export function cotizacionDe(carrera: Carrera, mundo: Mundo): Cotizacion {
  const { ovr, futbolista, vida } = carrera;
  const ultima = carrera.temporadas.at(-1);
  const previa = carrera.temporadas.at(-2);

  /* Los dos últimos bienios, el reciente pesa más: lo que hiciste hace cuatro años ya se olvidó a medias. */
  const pruebas = pruebasDelBienio(ultima, futbolista.puesto) * 0.65 + pruebasDelBienio(previa, futbolista.puesto) * 0.35;

  const liga = mundo.ligas.find((l) => l.slug === carrera.clubActual?.ligaSlug);
  /* La copa continental te muestra si la jugaste: el club clasificado y vos con minutos. */
  const jugoContinental = [ultima, previa].some(
    (t) => t !== undefined && (t.posicionEnLaTabla ?? 99) <= 4 && t.partidos >= 15,
  );
  const convocatorias = (ultima?.seleccion.convocatorias ?? 0) + (previa?.seleccion.convocatorias ?? 0);
  /*
   * Y nadie te vio si no jugaste. La liga y la copa te exponen en proporción a los minutos: el chico
   * de siete partidos en Lanús daba 46 de visibilidad —el mundo— por el peso de la liga argentina, y
   * lo llamaban Heerenveen y Leeds. Con siete partidos no lo vio ni Rosario.
   */
  const vistoJugando = 0.35 + 0.65 * Math.min(pruebas / 35, 1);
  const visibilidad = Math.min(
    100,
    ((liga?.peso ?? 45) * 0.4 + (jugoContinental ? 12 : 0) + Math.min(convocatorias, 20) + vida.fama * 0.25) *
      vistoJugando,
  );

  const proyeccion = futbolista.edad <= 24 ? limitar((futbolista.potencial - ovr) * 5, 0, 100) : 0;

  const delta = [ultima, previa].reduce((suma, t) => suma + (t ? t.ovrFin - t.ovrInicio : 0), 0);
  const trayectoria: Cotizacion['trayectoria'] = delta >= 2 ? 1 : delta <= -2 ? -1 : 0;

  return { nivel: ovr, edad: futbolista.edad, pruebas, visibilidad, proyeccion, trayectoria };
}

/* ───────────────────────────────────── quién te quiere ───────────────────────────────────── */

interface Candidato {
  club: Club;
  liga: Liga;
  nivel: NivelDeClub;
  deseo: number;
  matices: string[];
}

interface Contexto {
  nivelActual: NivelDeClub;
  paisActual: string | null;
  continenteActual: string;
  enElBanco: boolean;
  esDeLaCasa: boolean;
  esRival: boolean;
}

/** Por qué un club no te mira. `nivel` es la única que puede convertirse en sorpresa. */
type Rechazo = 'geografia' | 'tardio' | 'nivel' | 'sentido';

/**
 * ¿Este club te querría, y cuánto? Una puerta por nivel y tres reglas de sentido que valen para
 * todos, en lugar de las ocho puertas apiladas que había antes.
 *
 * Las puertas por nivel dicen qué compra cada escalón: el millonario compra un 85 probado en su prime
 * o la joya de veintidós que viene en alza; el grande local compra a cualquiera de 60 que haya jugado
 * una temporada. Las reglas de sentido dicen qué movimiento es una carrera y cuál no: nadie te ficha
 * si no te vio, no se baja en pleno ascenso, y pasados los treinta y tres el camino es hacia abajo.
 */
function quiere(club: Club, liga: Liga, nivel: NivelDeClub, cot: Cotizacion, ctx: Contexto): number | Rechazo {
  const historia = ctx.esDeLaCasa || ctx.esRival;
  const joya = cot.edad <= 22 && cot.trayectoria === 1 && cot.proyeccion >= 30;
  const mismoPais = club.paisCodigo === ctx.paisActual;
  const mismoContinente = liga.continente === ctx.continenteActual;

  /* Los destinos tardíos recién a los veintinueve, o a los veintisiete si ya vas en bajada. */
  if (esDestinoTardio(liga) && !(cot.edad >= 29 || (cot.edad >= 27 && cot.trayectoria === -1))) return 'tardio';

  /*
   * La puerta de cada nivel va primero, y la única que la salta es tu casa. El rival puede saltarse
   * la geografía y el sentido —es la oferta que hace la historia— pero tiene que **querer**: Boca
   * entraba a buscar a un chico de siete partidos solo por ser el clásico de Lanús.
   */
  const pasa = (() => {
    switch (nivel) {
      case 5:
        return (
          (cot.nivel >= 85 && cot.pruebas >= 60 && cot.visibilidad >= 50 && cot.edad <= 29) ||
          (cot.edad <= 22 && cot.nivel >= 80 && cot.trayectoria === 1 && cot.pruebas >= 40 && cot.visibilidad >= 40)
        );
      case 4:
        return (
          (cot.nivel >= 78 && cot.pruebas >= 40 && cot.visibilidad >= 35 && cot.edad <= 31) ||
          (cot.edad <= 23 && cot.nivel >= 74 && cot.trayectoria === 1 && cot.pruebas >= 30)
        );
      case 3:
        return (
          (cot.nivel >= 70 && cot.pruebas >= 25 && cot.visibilidad >= 25 && cot.edad <= 32) ||
          (cot.edad <= 21 && cot.nivel >= 68 && cot.pruebas >= 20)
        );
      case 2:
        return cot.nivel >= 60 && cot.pruebas >= 15;
      default:
        /* Un chico no puede pagar a alguien muy por encima de su nivel, salvo que venga de vuelta. */
        return !(cot.nivel > club.fuerza + 12 && cot.edad < 30 && cot.trayectoria >= 0);
    }
  })();
  if (!pasa && !ctx.esDeLaCasa) {
    /* Si te rechaza el nivel pero te podría haber visto, es candidato a sorpresa. */
    return mismoContinente || cot.visibilidad >= 30 ? 'nivel' : 'geografia';
  }

  /*
   * Geografía por visibilidad. A un chico de dieciocho en Cusco lo vio Perú; al que ganó la Libertadores
   * lo vio el continente y algún scout de Porto o Ajax; al que juega en Europa lo ve el mundo.
   */
  if (!historia) {
    const vendedorEuropeo = VENDEDORES.has(club.slug) && liga.continente === 'europa';
    if (cot.visibilidad < 30 && !mismoPais) return 'geografia';
    if (cot.visibilidad < 55 && !mismoContinente && !(vendedorEuropeo && joya)) return 'geografia';
  }

  /* No se baja en pleno ascenso. Hasta los 22 se permite un escalón para jugar; el banco también. */
  const bajada = ctx.nivelActual - nivel;
  if (!historia && !ctx.enElBanco && cot.edad < 30 && cot.trayectoria >= 0) {
    if (bajada >= 2) return 'sentido';
    if (bajada === 1 && cot.edad > 22) return 'sentido';
  }
  /* El descenso de los treinta y tres: solo de tu nivel para abajo, salvo tu casa. */
  if (cot.edad >= 33 && nivel > ctx.nivelActual && !ctx.esDeLaCasa) return 'sentido';

  /* Cuánto te quiere, para ordenar dentro del nivel: el que más te necesita y al que más le encajás. */
  let deseo = nivel === 5 ? 60 : 60 - Math.abs(cot.nivel - club.fuerza) * 1.5;
  deseo += cot.pruebas * 0.2;
  if (nivel >= 4 && cot.edad >= 22 && cot.edad <= 27) deseo += 15;
  if (VENDEDORES.has(club.slug) && cot.edad <= 23) deseo += 10 + cot.proyeccion * 0.2;
  if (nivel > ctx.nivelActual) deseo += 12;
  if (ctx.esDeLaCasa) deseo += 30;
  if (ctx.esRival) deseo += 15;
  return Math.max(1, deseo);
}

/* ───────────────────────────────────── las cuatro ofertas ───────────────────────────────────── */

export interface ParametrosDeMercado {
  mundo: Mundo;
  /** El club del que hay que salir: nunca se ofrece a sí mismo. */
  actual: Club | null;
}

const esDeTitular = (rol: Rol): boolean => rol === 'titular' || rol === 'estrella' || rol === 'capitan';

/**
 * Las cuatro ofertas de la ventana: cuatro caminos, no cuatro sorteos.
 *
 * Antes se sacaban cuatro al azar entre todos los que te querían, una por liga. Con 90 de media hay
 * cuarenta clubes europeos interesados y los ocho millonarios son el 20% del pozo: perdían el sorteo
 * contra Roma y PSV tantas veces como lo ganaban. Ahora cada casillero tiene un sentido:
 *
 *   1. el salto — el club del nivel más alto que te quiere;
 *   2. el puesto — el mejor club donde jugarías de titular, de otra liga;
 *   3. la historia — la casa, el rival o el club al que juraste no ir; si no hay, otro país, y si sos
 *      élite, el segundo millonario;
 *   4. el comodín — el préstamo si estás en el banco, el destino tardío si tenés la edad, la sorpresa
 *      uno de cada cinco mercados, o el siguiente mejor.
 *
 * **Siempre son cuatro.** Si las reglas de sentido no alcanzan, se relaja "otra liga"; si sigue
 * faltando, se completa con clubes chicos de tu país, que siempre existen. La mala carrera no se siente
 * en que falten ofertas: se siente en que las cuatro sean chicas.
 */
export function armarOfertas(azar: Azar, carrera: Carrera, params: ParametrosDeMercado): Oferta[] {
  const { mundo, actual } = params;
  const cot = cotizacionDe(carrera, mundo);

  const ligaActual = mundo.ligas.find((l) => l.slug === actual?.ligaSlug) ?? null;
  const rival = actual && ligaActual ? rivalDe(azar, ligaActual, actual) : null;
  const casa = carrera.clubDeOrigen;
  const ligaDeCasa = casa ? (mundo.ligas.find((l) => l.slug === casa.ligaSlug) ?? null) : null;
  const rivalDeCasa = casa && ligaDeCasa ? rivalDe(crearAzarDeCasa(carrera), ligaDeCasa, casa) : null;
  /* El último capítulo de una carrera es volver: la casa y su clásico entran siempre pasados los 33. */
  const vuelveACasa = cot.edad >= 33 && casa !== null;

  const base: Omit<Contexto, 'esDeLaCasa' | 'esRival'> = {
    nivelActual: actual && ligaActual ? nivelDeClub(actual, ligaActual) : 1,
    paisActual: actual?.paisCodigo ?? carrera.futbolista.paisCodigo,
    continenteActual: ligaActual?.continente ?? ligaDeCasa?.continente ?? 'sudamerica',
    enElBanco: carrera.rol === 'suplente' || carrera.rol === 'promesa',
  };

  const candidatos: Candidato[] = [];
  const rechazadosPorNivel: Candidato[] = [];
  for (const liga of mundo.ligas) {
    for (const club of liga.clubes) {
      if (club.slug === actual?.slug) continue;
      const esDeLaCasa = club.slug === casa?.slug;
      const esRival = club.slug === rival?.slug || (vuelveACasa && club.slug === rivalDeCasa?.slug);
      if (club.renombre < RENOMBRE_MINIMO && !esDeLaCasa && !esRival) continue;

      const nivel = nivelDeClub(club, liga);
      const matices: string[] = [];
      if (club.slug === rival?.slug) matices.push('rival');
      if (esDeLaCasa && carrera.clubes.length > 1) matices.push('regreso');
      if (vuelveACasa && club.slug === rivalDeCasa?.slug && club.slug !== rival?.slug) matices.push('rival', 'regreso-rival');
      if (liga.slug !== actual?.ligaSlug) matices.push('afuera');
      if (carrera.recuerdos.some((r) => r.etiquetas.includes(`promesa:nunca:${club.slug}`))) matices.push('promesa-rota');

      /* Al final de la carrera la casa y su rival entran aunque las cuentas digan otra cosa. */
      if (vuelveACasa && (esDeLaCasa || club.slug === rivalDeCasa?.slug)) {
        candidatos.push({ club, liga, nivel, deseo: 160, matices });
        continue;
      }
      const veredicto = quiere(club, liga, nivel, cot, { ...base, esDeLaCasa, esRival });
      if (typeof veredicto === 'number') candidatos.push({ club, liga, nivel, deseo: veredicto, matices });
      else if (veredicto === 'nivel') rechazadosPorNivel.push({ club, liga, nivel, deseo: 1, matices });
    }
  }

  const elegidos: Candidato[] = [];
  const yaEsta = (c: Candidato) => elegidos.some((e) => e.club.slug === c.club.slug);
  const otraLiga = (c: Candidato) => !elegidos.some((e) => e.liga.slug === c.liga.slug);
  const otroPais = (c: Candidato) => !elegidos.some((e) => e.club.paisCodigo === c.club.paisCodigo);
  /*
   * Cuántas de afuera caben, según cuánto te vieron: ninguna mientras solo te conoce tu país, una
   * cuando el continente empieza a mirar, dos cuando ya te siguen, todas cuando te ve el mundo. La
   * casa y el rival no cuentan: son la historia, vengan de donde vengan.
   */
  const cupoDeAfuera = cot.visibilidad < 30 ? 0 : cot.visibilidad < 45 ? 1 : cot.visibilidad < 55 ? 2 : MAX_OFERTAS;
  const esLocal = (c: Candidato) => c.club.paisCodigo === base.paisActual;
  const cabe = (c: Candidato) =>
    esLocal(c) ||
    c.matices.includes('regreso') ||
    c.matices.includes('rival') ||
    elegidos.filter((e) => !esLocal(e)).length < cupoDeAfuera;
  const sortear = (lista: Candidato[]): Candidato | null =>
    pesado(azar, lista.filter(cabe).map((c) => ({ item: c, peso: c.deseo })));
  const tomar = (c: Candidato | null) => {
    if (c && !yaEsta(c)) elegidos.push(c);
  };

  const nivelMax = candidatos.reduce<NivelDeClub>((alto, c) => (c.nivel > alto ? c.nivel : alto), 1);

  /* 1. El salto. */
  tomar(sortear(candidatos.filter((c) => c.nivel === nivelMax)));

  /* 2. El puesto: donde jugarías de titular, en otra liga. */
  tomar(
    sortear(
      candidatos.filter(
        (c) =>
          !yaEsta(c) &&
          otraLiga(c) &&
          c.nivel >= nivelMax - 1 &&
          esDeTitular(rolPrometido(azar, c.club, cot.nivel, cot.edad)),
      ),
    ),
  );

  /* 3. La historia, o el segundo millonario, o otro país. */
  const historia = candidatos
    .filter((c) => !yaEsta(c) && c.matices.some((m) => m === 'regreso' || m === 'rival' || m === 'promesa-rota'))
    .sort((a, b) => b.deseo - a.deseo)[0];
  if (historia && (vuelveACasa || chance(azar, 0.55))) tomar(historia);
  else if (nivelMax === 5) tomar(sortear(candidatos.filter((c) => !yaEsta(c) && c.nivel === 5 && otraLiga(c))));
  if (elegidos.length < 3) tomar(sortear(candidatos.filter((c) => !yaEsta(c) && otroPais(c))));

  /* 4. El comodín: préstamo, destino tardío, la sorpresa, o el siguiente mejor. */
  const prestamo = ofertaDePrestamo(azar, carrera, mundo);
  const tardio = sortear(candidatos.filter((c) => !yaEsta(c) && esDestinoTardio(c.liga)));
  const sorpresaPosible = rechazadosPorNivel.filter(
    (c) => c.nivel === nivelMax + 1 && !(c.nivel === 5 && (cot.edad < 22 || cot.pruebas < 30)),
  );
  const sorpresa = chance(azar, 0.25) ? sortear(sorpresaPosible) : null;
  if (prestamo) {
    /* el préstamo se agrega abajo ya como Oferta */
  } else if (sorpresa) tomar({ ...sorpresa, matices: [...sorpresa.matices, 'sorpresa'] });
  else if (tardio && cot.edad >= 29) tomar(tardio);
  else tomar(sortear(candidatos.filter((c) => !yaEsta(c) && otraLiga(c))));

  /* Siempre cuatro: primero se relaja "otra liga", después entran los chicos de tu país. */
  const tope = prestamo ? MAX_OFERTAS - 1 : MAX_OFERTAS;
  while (elegidos.length < tope) {
    const siguiente = sortear(candidatos.filter((c) => !yaEsta(c)));
    if (!siguiente) break;
    tomar(siguiente);
  }
  if (elegidos.length < tope) {
    const delPais = mundo.ligas
      .flatMap((l) => l.clubes.map((club) => ({ club, liga: l })))
      .filter(({ club }) => club.paisCodigo === base.paisActual && club.slug !== actual?.slug)
      .filter(({ club }) => !elegidos.some((e) => e.club.slug === club.slug))
      .sort((a, b) => Math.abs(a.club.fuerza - cot.nivel) - Math.abs(b.club.fuerza - cot.nivel));
    for (const { club, liga } of delPais) {
      if (elegidos.length >= tope) break;
      elegidos.push({ club, liga, nivel: nivelDeClub(club, liga), deseo: 1, matices: liga.slug !== actual?.ligaSlug ? ['afuera'] : [] });
    }
  }

  const usados = new Set<string>();
  const ofertas: Oferta[] = elegidos.map((e, i) => {
    const rol = rolPrometido(azar, e.club, cot.nivel, cot.edad);
    const riesgo: Oferta['riesgo'] =
      e.matices.includes('rival') || e.matices.includes('sorpresa') || e.club.fuerza - cot.nivel > 8
        ? 'alto'
        : e.club.fuerza - cot.nivel > 0
          ? 'medio'
          : 'bajo';
    return {
      id: `oferta-${carrera.anio}-${i}`,
      club: e.club,
      salario: salarioDe(azar, e.club, carrera.valor, rol),
      rolPrometido: rol,
      proyecto: proyectoDe(azar, e.club, rol, riesgo, usados),
      /* Cuatro a ocho años: dos a cuatro capítulos. */
      temporadas: entre(azar, 4, 8),
      matices: e.matices,
      riesgo,
      escalon: nombreDelNivelDeClub(e.nivel, e.liga),
    } satisfies Oferta;
  });
  return prestamo ? [...ofertas, prestamo] : ofertas;
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
      escalon: nombreDelNivelDeClub(nivelDeClub(club, liga), liga),
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
    escalon: nombreDelNivelDeClub(nivelDeClub(club, ligaDelClub(mundo, club)), ligaDelClub(mundo, club)),
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
