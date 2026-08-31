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
import { chance, elegir, entre, limitar, mezclar, pesado, type Azar } from './azar.js';
import {
  MAX_OFERTAS,
  type Carrera,
  type Club,
  type Liga,
  type Mundo,
  type Oferta,
  type Rol,
} from './estado.js';

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

function proyectoDe(azar: Azar, club: Club, rol: Rol, riesgo: 'bajo' | 'medio' | 'alto'): string {
  if (riesgo === 'alto') return elegir(azar, PROYECTOS_RIESGO);
  if (rol === 'estrella' || club.fuerza < 60) return elegir(azar, PROYECTOS_PROYECTO);
  return elegir(azar, PROYECTOS_GRANDE);
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
const ESCALON = { local: 45, grandeLocal: 70, continental: 82, europaTop: 90 } as const;

/**
 * ¿Este club te querría? Devuelve el peso con el que aparecería entre las ofertas; 0 es "no te
 * llama". Un club nunca te llama si estás muy por debajo de su nivel, y pierde interés si estás muy
 * por encima del suyo salvo que seas de la casa.
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

  /* Un club diez puntos más fuerte que tu nivel no te mira, salvo que seas joven con techo. */
  if (brecha > 14 && futbolista.edad > 22) return 0;
  if (brecha > 22) return 0;

  /*
   * El salto grande hay que ganárselo. Un club muy por encima de tu nivel solo mira a alguien que
   * viene de dos años enormes: sin esto, cualquier juvenil de una liga chica pasaba a la Juventus en
   * su primer capítulo y el ascenso —que es el corazón del juego— salía gratis.
   */
  const ultima = carrera.temporadas.at(-1);
  if (brecha > 8 && (ultima?.notaMedia ?? 0) < 7 && (ultima?.goles ?? 0) < 25) return 0;

  let peso = 100 - Math.abs(brecha) * 4;
  if (brecha > 0) peso += Math.max(0, 12 - brecha) * 2;
  peso += (vida.fama / 100) * 12;
  peso += (carrera.temporadas.at(-1)?.notaMedia ?? 6.5) >= 7.2 ? 18 : 0;
  if (futbolista.edad >= 33) peso -= 35;
  if (futbolista.edad <= 20 && club.fuerza > ovr) peso += 14;
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
  /* El escalón siguiente al que estás es el que más pesa: de local a grande local, y así. */
  const objetivo =
    actual < ESCALON.grandeLocal
      ? ESCALON.grandeLocal
      : actual < ESCALON.continental
        ? ESCALON.continental
        : ESCALON.europaTop;
  if (club.renombre >= objetivo && ovr >= club.fuerza - 6) peso += 25;

  return Math.max(0, peso);
}

/**
 * Las ligas de destino tardío: Asia, África y las de peso bajo.
 *
 * No es un juicio sobre esas ligas, es una decisión de narrativa: nadie sueña con debutar en la liga
 * canadiense, pero la oferta millonaria de Arabia a los 31 —o el retiro dorado en la MLS— es una
 * decisión con sabor. Se abren a partir de los treinta.
 */
export function esDestinoTardio(liga: { continente: string; peso: number }): boolean {
  return liga.continente === 'asia' || liga.continente === 'africa' || liga.peso < 52;
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

  for (const liga of mundo.ligas) {
    /* Arabia, Japón o Canadá recién a los 30: antes rompen la carrera en lugar de darle sabor. */
    if (esDestinoTardio(liga) && carrera.futbolista.edad < 30) continue;
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

  if (candidatos.length === 0) return [];

  const elegidos: Array<{ club: Club; liga: Liga; matices: string[] }> = [];
  const ligasTomadas = new Set<string>();

  /* El rival y la casa entran primero: son las ofertas que hacen la historia. */
  for (const especial of ['rival', 'regreso']) {
    const encontrado = candidatos.find((c) => c.matices.includes(especial));
    if (encontrado && elegidos.length < MAX_OFERTAS && chance(azar, 0.55)) {
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
      proyecto: proyectoDe(azar, e.club, rol, riesgo),
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
  const cercanos = [...otros].sort(
    (a, b) => Math.abs(a.fuerza - club.fuerza) - Math.abs(b.fuerza - club.fuerza),
  );
  return elegir(azar, cercanos.slice(0, Math.min(3, cercanos.length)));
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

  return posibles.map((club, i) => {
    /* En un grande se arranca desde la cantera; en uno mediano se juega antes. */
    const rol = club.fuerza <= 58 ? 'rotacion' : 'promesa';
    return {
      id: `debut-${i}`,
      club,
      salario: salarioDe(azar, club, Math.max(0.4, carrera.valor), rol),
      rolPrometido: rol,
      proyecto:
        club.fuerza <= 58
          ? 'Necesitan gente ya: vas a jugar desde el arranque.'
          : elegir(azar, [
              'Te suman al plantel profesional y vas de a poco.',
              'Primero la reserva, y si andás, arriba.',
              'El técnico quiere verte en pretemporada.',
            ]),
      temporadas: entre(azar, 4, 6),
      matices: ['debut'],
      riesgo: club.fuerza > carrera.ovr + 8 ? 'medio' : 'bajo',
    } satisfies Oferta;
  });
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
