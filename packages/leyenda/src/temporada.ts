/**
 * La temporada: minutos, goles, notas y la tabla.
 *
 * No se simula partido por partido. Un tramo resume varias fechas con las cifras que el producto
 * muestra —partidos, goles, asistencias, nota media— porque lo que el juego cuenta es una carrera, no
 * noventa minutos. Los partidos que sí se juegan a mano son los momentos, y son pocos a propósito:
 * si todo fuera jugable, nada sería importante.
 *
 * El rendimiento sale de tres cosas que se multiplican: cuánto juega (rol), cuánto rinde (OVR y
 * forma) y con quién juega (fuerza del club). Un crack en un club chico mete goles y no gana nada; un
 * suplente en un grande gana todo y no mete ninguno. Las dos carreras tienen que ser posibles.
 */
import { campana, chance, elegir, entre, limitar, pesado, type Azar } from './azar.js';
import type { Carrera, Club, Liga, Puesto, Rol, Temporada } from './estado.js';

/** Cuántos de los partidos del tramo juega, según el rol. */
const MINUTOS_POR_ROL: Record<Rol, [number, number]> = {
  promesa: [0.1, 0.35],
  suplente: [0.15, 0.45],
  rotacion: [0.45, 0.7],
  titular: [0.75, 0.95],
  estrella: [0.85, 1],
  capitan: [0.85, 1],
};

/**
 * Goles esperados por partido completo, por puesto. Se corrige por tiro, forma y club.
 *
 * Calibrado contra la realidad: un delantero titular de elite ronda los 25 goles por temporada, no
 * 45. Con el bienio como unidad los números se duplican en pantalla y cualquier exceso salta a la
 * vista; era lo que hacía que una carrera terminara con cifras de arcade.
 */
const GOLES_BASE: Record<Puesto, number> = {
  POR: 0,
  DFC: 0.04,
  LAT: 0.04,
  MC: 0.08,
  MO: 0.2,
  EXT: 0.24,
  DC: 0.38,
};

const ASISTENCIAS_BASE: Record<Puesto, number> = {
  POR: 0,
  DFC: 0.02,
  LAT: 0.1,
  MC: 0.13,
  MO: 0.22,
  EXT: 0.2,
  DC: 0.1,
};

export interface Rendimiento {
  partidos: number;
  goles: number;
  asistencias: number;
  minutos: number;
  nota: number;
  amarillas: number;
  rojas: number;
  lesion: { semanas: number; motivo: string } | null;
}

const MOTIVOS_DE_LESION = [
  'desgarro del isquiotibial',
  'esguince de tobillo',
  'golpe en la rodilla',
  'sobrecarga muscular',
  'fractura del quinto metatarsiano',
  'lesión en el aductor',
];

/**
 * Dos temporadas de fútbol, resumidas.
 *
 * Es la unidad del juego: un capítulo simula un bienio completo —unas 68 fechas entre liga y copas—
 * y de ahí salen los números de una fila de la carrera. Antes esto simulaba un tramo de temporada y
 * hacían falta hasta seis llamadas por año; el cálculo es el mismo, la dosis no.
 */
export function simularBienio(azar: Azar, carrera: Carrera, fechas = 68): Rendimiento {
  const { futbolista, vida, rol, clubActual } = carrera;
  const fuerzaClub = clubActual?.fuerza ?? 50;

  const [minRol, maxRol] = MINUTOS_POR_ROL[rol];
  /* La condición física recorta minutos incluso al titular indiscutido. */
  const porCondicion = limitar(vida.condicion / 100, 0.5, 1);
  const participacion = limitar(
    (minRol + azar.siguiente() * (maxRol - minRol)) * porCondicion,
    0,
    1,
  );
  const partidos = Math.round(fechas * participacion);
  const minutos = Math.round(partidos * entre(azar, 62, 90));

  const porForma = 0.8 + (vida.forma / 100) * 0.45;
  /* Un club fuerte genera más situaciones: el mismo delantero mete más en un grande. */
  const porClub = 0.75 + (fuerzaClub / 100) * 0.55;
  const porTiro = 0.6 + (futbolista.atributos.tiro / 100) * 0.9;
  const porPase = 0.6 + (futbolista.atributos.pase / 100) * 0.9;

  const esperadosGol = GOLES_BASE[futbolista.puesto] * partidos * porForma * porClub * porTiro;
  const esperadosAsis =
    ASISTENCIAS_BASE[futbolista.puesto] * partidos * porForma * porClub * porPase;

  const goles = poisson(azar, esperadosGol);
  const asistencias = poisson(azar, esperadosAsis);

  /*
   * La nota media parte del OVR llevado a la escala de 10 y sube con lo que hizo: un 6,8 es un
   * jugador que cumplió y un 7,6 es uno del que se habla. Se mueve poco a propósito —las notas
   * reales se mueven poco— y por eso los goles pesan tanto en ella.
   */
  const notaBase = 5.9 + (carrera.ovr - 60) / 22;
  const aporte = partidos > 0 ? ((goles * 2 + asistencias) / partidos) * 0.8 : 0;
  /*
   * La cabeza juega. Un jugador con la confianza por el piso rinde por debajo de su media y uno
   * fundido de estrés se equivoca más: son los dos diales que las decisiones mueven todo el tiempo y
   * que hasta ahora no llegaban a ninguna parte. Vale medio punto de nota entre el mejor y el peor
   * estado anímico, que es más o menos lo que se ve en la realidad.
   */
  const porCabeza = (vida.confianza - 55) / 220 - (vida.estres - 45) / 260;
  const nota = limitar(campana(azar, notaBase + aporte + porCabeza, 0.3), 4.5, 9.6);

  const propension = (100 - futbolista.personalidad.disciplina) / 100;
  const amarillas = poisson(azar, partidos * (0.12 + propension * 0.2));
  const rojas = chance(azar, partidos * 0.006 * (0.5 + propension)) ? 1 : 0;

  /* Menos condición y más minutos, más riesgo. Una lesión no es castigo: abre historias. */
  const riesgo = (minutos / 3000) * (1.4 - vida.condicion / 100) * (futbolista.edad > 31 ? 1.4 : 1);
  const lesion = chance(azar, limitar(riesgo, 0, 0.32))
    ? { semanas: entre(azar, 2, 16), motivo: elegir(azar, MOTIVOS_DE_LESION) }
    : null;

  return {
    partidos,
    goles,
    asistencias,
    minutos,
    nota: Math.round(nota * 10) / 10,
    amarillas,
    rojas,
    lesion,
  };
}

/** Poisson por el método de Knuth: para pocas ocurrencias por tramo alcanza y sobra. */
function poisson(azar: Azar, lambda: number): number {
  if (lambda <= 0) return 0;
  const limite = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= azar.siguiente();
  } while (p > limite && k < 60);
  return k - 1;
}

/**
 * Dónde termina el club en su liga.
 *
 * La tabla no se simula equipo por equipo: se ordena por fuerza con ruido, que produce sorpresas
 * creíbles —un club de fuerza 70 puede salir cuarto o campeón— sin arrastrar veinte simulaciones por
 * temporada. El aporte del jugador empuja: si rindió, su club sube algunos puestos.
 */
export function posicionEnLaTabla(
  azar: Azar,
  liga: Liga,
  club: Club,
  aporte: number,
): { posicion: number; total: number } {
  const total = Math.max(8, liga.clubes.length);
  const conRuido = liga.clubes.map((c) => ({
    slug: c.slug,
    /*
     * El ruido alto es lo que hace que el campeonato no sea una cuenta: el grande gana seguido, no
     * siempre. Subió de 18 a 38 tras medir dos mil carreras: con el ruido viejo, una carrera que
     * pasaba por los grandes de Europa se llevaba nueve ligas de veinticuatro temporadas y el título
     * dejaba de significar nada. Con este, el grande sigue ganando más que nadie pero pierde años.
     */
    puntaje: c.fuerza + campana(azar, 0, 38) + (c.slug === club.slug ? aporte : 0),
  }));
  conRuido.sort((a, b) => b.puntaje - a.puntaje);
  const posicion = conRuido.findIndex((c) => c.slug === club.slug) + 1;
  return { posicion: posicion > 0 ? posicion : total, total };
}

/**
 * Cuánto empuja el jugador a su club, en unidades de fuerza. Un crack en un equipo chico vale
 * quince puntos de tabla; un suplente, nada. Es el canal por el que el rendimiento propio se
 * convierte en títulos colectivos.
 */
export function aporteDelJugador(carrera: Carrera & { enCurso: Temporada | null }): number {
  const t = carrera.enCurso;
  if (!t || t.partidos === 0) return 0;
  const porNota = (t.notaMedia - 6.5) * 7;
  const porRol = carrera.rol === 'estrella' || carrera.rol === 'capitan' ? 4 : 0;
  /* Sigues siendo decisivo, pero no ganas la liga tú solo: el techo bajó de 18 a 12. */
  return limitar(porNota + porRol, -5, 12);
}

/**
 * El rol de la próxima temporada. Lo decide el club mirando lo de siempre: cuánto rendiste, cuánto
 * valés respecto del plantel y qué tan bien te llevás con el técnico. Perder la titularidad es una
 * de las formas de fracaso que el juego necesita que existan.
 */
export function rolSiguiente(azar: Azar, carrera: Carrera & { enCurso: Temporada | null }): Rol {
  const club = carrera.clubActual;
  if (!club) return 'promesa';

  /* La brecha entre lo que sos y lo que pide el club: negativa, estás por encima del plantel. */
  const brecha = club.fuerza - carrera.ovr;
  const conDt = carrera.relaciones.dt.confianza - carrera.relaciones.dt.rencor;
  const rendimiento = (carrera.enCurso?.notaMedia ?? 6.5) - 6.5;
  /*
   * La tribuna también pone once. Un ídolo con la hinchada encima se queda en el equipo aunque el
   * técnico no lo quiera, y uno silbado se cae del once por mucho que rinda. Es el canal por el que
   * un escándalo de hace dos años te cuesta el puesto hoy.
   */
  const conLaTribuna = (carrera.vida.carinoDeLaHinchada - 50) / 8;

  const puntaje =
    -brecha * 0.8 +
    conDt * 0.25 +
    conLaTribuna +
    rendimiento * 14 +
    (carrera.futbolista.edad < 20 ? -8 : 0);

  /*
   * Y un techo duro por nivel, que el rendimiento no compra.
   *
   * Los pesos de abajo nunca eran cero del todo —`titular` conservaba 0,3 incluso con el puntaje en
   * contra— y con eso un jugador de 65 se sostenía de titular en el Manchester United temporada tras
   * temporada. Rendir bien te mantiene en un plantel que te queda grande; no te pone en el once. Un
   * club no alinea a alguien diez puntos por debajo de su nivel por mucho que se porte bien.
   */
  const brechaGrande = brecha > 10;
  const escala: Array<{ item: Rol; peso: number }> = [
    { item: 'promesa', peso: puntaje < -18 ? 3 : 0 },
    { item: 'suplente', peso: puntaje < -6 || brecha > 16 ? 3 : 0.4 },
    { item: 'rotacion', peso: (puntaje >= -14 && puntaje < 8) || brechaGrande ? 3 : 0.6 },
    { item: 'titular', peso: brechaGrande ? 0 : puntaje >= 2 ? 3 : 0.3 },
    { item: 'estrella', peso: brecha > 4 ? 0 : puntaje >= 16 ? 2.4 : 0 },
    { item: 'capitan', peso: brecha > 2 ? 0 : puntaje >= 22 && carrera.futbolista.edad >= 27 ? 1.6 : 0 },
  ];
  return pesado(azar, escala) ?? 'rotacion';
}

/** Los títulos de la temporada, según dónde terminó el club y qué copas jugó. */
export function titulosDeLaTemporada(
  azar: Azar,
  params: {
    liga: Liga;
    club: Club;
    posicion: number;
    total: number;
    jugoContinental: boolean;
    copaContinental: string | null;
    /** La copa ya se definió en la cancha, en un momento jugable: no se sortea otra vez. */
    sinCopa?: boolean;
    /** El nombre real de la copa del país, cuando el mundo lo trae. */
    copaNacional?: string | null;
  },
): Array<{ nombre: string; clase: 'liga' | 'copa' | 'continental'; detalle?: string }> {
  const salida: Array<{ nombre: string; clase: 'liga' | 'copa' | 'continental'; detalle?: string }> = [];
  const { liga, club, posicion, jugoContinental, copaContinental } = params;

  if (posicion === 1) salida.push({ nombre: liga.nombre, clase: 'liga' });

  /*
   * La copa nacional es más azarosa que la liga: un equipo mediano la gana. Las probabilidades están
   * bajas a propósito —una gran carrera termina con ocho o diez títulos, no con veinticinco— porque
   * un trofeo que llega todos los años deja de ser un trofeo.
   */
  if (!params.sinCopa) {
    const chanceCopa = limitar((club.fuerza / 100) * 0.09 + (posicion <= 4 ? 0.02 : 0), 0.01, 0.12);
    if (chance(azar, chanceCopa)) {
      salida.push({ nombre: params.copaNacional ?? `Copa de ${liga.pais}`, clase: 'copa' });
    }
  }

  if (jugoContinental && copaContinental) {
    const chanceContinental = limitar(((club.fuerza - 68) / 100) * 0.28, 0.005, 0.1);
    if (chance(azar, chanceContinental)) {
      salida.push({ nombre: copaContinental, clase: 'continental' });
    }
  }
  return salida;
}

/** Premios individuales. Piden temporada grande, no solo OVR alto. */
export function premiosDeLaTemporada(
  azar: Azar,
  carrera: Carrera & { enCurso: Temporada | null },
  campeon: boolean,
): string[] {
  const t = carrera.enCurso;
  if (!t || t.partidos < 20) return [];
  const salida: string[] = [];
  /* Los umbrales miran el bienio entero: treinta goles en dos años es una temporada de goleador. */
  const goleador = t.goles >= 30 && (carrera.futbolista.puesto === 'DC' || carrera.futbolista.puesto === 'EXT');
  const notaAlta = t.notaMedia >= 7.5;

  if (goleador && chance(azar, 0.22)) salida.push(`Goleador de ${t.ligaNombre}`);
  if (notaAlta && campeon && chance(azar, 0.18)) salida.push(`Mejor jugador de ${t.ligaNombre}`);
  if (carrera.futbolista.edad <= 21 && notaAlta && chance(azar, 0.2)) {
    salida.push('Mejor jugador joven');
  }
  /* El premio grande exige todo junto: nivel, títulos y una temporada de época. */
  if (carrera.ovr >= 89 && notaAlta && campeon && carrera.trofeos.some((tr) => tr.clase === 'continental')) {
    /* El premio grande, una vez cada tanto incluso para el mejor del mundo. */
    if (chance(azar, 0.14)) salida.push('Balón de Oro');
  }
  return salida;
}

