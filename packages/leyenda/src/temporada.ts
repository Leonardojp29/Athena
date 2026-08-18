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
import type { Guion } from './beats.js';
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

/** Goles esperados por partido completo, por puesto. Se corrige por tiro, forma y club. */
const GOLES_BASE: Record<Puesto, number> = {
  POR: 0,
  DFC: 0.05,
  LAT: 0.05,
  MC: 0.1,
  MO: 0.28,
  EXT: 0.32,
  DC: 0.52,
};

const ASISTENCIAS_BASE: Record<Puesto, number> = {
  POR: 0,
  DFC: 0.03,
  LAT: 0.14,
  MC: 0.18,
  MO: 0.3,
  EXT: 0.26,
  DC: 0.14,
};

export interface Tramo {
  rotulo: string;
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
 * Un tramo de temporada. `fechas` es cuántos partidos abarca: sale de dividir un calendario de ~38
 * entre los tramos del ritmo elegido, así una carrera exprés y una intensa cuentan la misma
 * temporada con distinto detalle en lugar de ser dos juegos distintos.
 */
export function simularTramo(
  azar: Azar,
  carrera: Carrera,
  fechas: number,
  rotulo: string,
): Tramo {
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
  const nota = limitar(campana(azar, notaBase + aporte, 0.3), 4.5, 9.6);

  const propension = (100 - futbolista.personalidad.disciplina) / 100;
  const amarillas = poisson(azar, partidos * (0.12 + propension * 0.2));
  const rojas = chance(azar, partidos * 0.006 * (0.5 + propension)) ? 1 : 0;

  /* Menos condición y más minutos, más riesgo. Una lesión no es castigo: abre historias. */
  const riesgo = (minutos / 3000) * (1.4 - vida.condicion / 100) * (futbolista.edad > 31 ? 1.4 : 1);
  const lesion = chance(azar, limitar(riesgo, 0, 0.32))
    ? { semanas: entre(azar, 2, 16), motivo: elegir(azar, MOTIVOS_DE_LESION) }
    : null;

  return {
    rotulo,
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

export function acumularEnTemporada(temporada: Temporada, tramo: Tramo): void {
  temporada.partidos += tramo.partidos;
  temporada.goles += tramo.goles;
  temporada.asistencias += tramo.asistencias;
  temporada.minutos += tramo.minutos;
  temporada.amarillas += tramo.amarillas;
  temporada.rojas += tramo.rojas;
  if (tramo.lesion) temporada.lesiones += 1;
  /* La nota de la temporada es el promedio ponderado por partidos jugados en cada tramo. */
  const jugadosAntes = temporada.partidos - tramo.partidos;
  temporada.notaMedia =
    temporada.partidos === 0
      ? 0
      : Math.round(
          ((temporada.notaMedia * jugadosAntes + tramo.nota * tramo.partidos) / temporada.partidos) *
            10,
        ) / 10;
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
    puntaje: c.fuerza + campana(azar, 0, 14) + (c.slug === club.slug ? aporte : 0),
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
export function aporteDelJugador(carrera: Carrera): number {
  const t = carrera.enCurso;
  if (!t || t.partidos === 0) return 0;
  const porNota = (t.notaMedia - 6.5) * 8;
  const porRol = carrera.rol === 'estrella' || carrera.rol === 'capitan' ? 4 : 0;
  return limitar(porNota + porRol, -6, 18);
}

/**
 * El rol de la próxima temporada. Lo decide el club mirando lo de siempre: cuánto rendiste, cuánto
 * valés respecto del plantel y qué tan bien te llevás con el técnico. Perder la titularidad es una
 * de las formas de fracaso que el juego necesita que existan.
 */
export function rolSiguiente(azar: Azar, carrera: Carrera): Rol {
  const club = carrera.clubActual;
  if (!club) return 'promesa';

  /* La brecha entre lo que sos y lo que pide el club: negativa, estás por encima del plantel. */
  const brecha = club.fuerza - carrera.ovr;
  const conDt = carrera.relaciones.dt.confianza - carrera.relaciones.dt.rencor;
  const rendimiento = (carrera.enCurso?.notaMedia ?? 6.5) - 6.5;

  const puntaje =
    -brecha * 0.8 + conDt * 0.25 + rendimiento * 14 + (carrera.futbolista.edad < 20 ? -8 : 0);

  const escala: Array<{ item: Rol; peso: number }> = [
    { item: 'promesa', peso: puntaje < -18 ? 3 : 0 },
    { item: 'suplente', peso: puntaje < -6 ? 3 : 0.4 },
    { item: 'rotacion', peso: puntaje >= -14 && puntaje < 8 ? 3 : 0.6 },
    { item: 'titular', peso: puntaje >= 2 ? 3 : 0.3 },
    { item: 'estrella', peso: puntaje >= 16 ? 2.4 : 0 },
    { item: 'capitan', peso: puntaje >= 22 && carrera.futbolista.edad >= 27 ? 1.6 : 0 },
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
  },
): Array<{ nombre: string; clase: 'liga' | 'copa' | 'continental'; detalle?: string }> {
  const salida: Array<{ nombre: string; clase: 'liga' | 'copa' | 'continental'; detalle?: string }> = [];
  const { liga, club, posicion, jugoContinental, copaContinental } = params;

  if (posicion === 1) salida.push({ nombre: liga.nombre, clase: 'liga' });

  /* La copa nacional es más azarosa que la liga: un equipo mediano la gana. */
  const chanceCopa = limitar((club.fuerza / 100) * 0.22 + (posicion <= 4 ? 0.06 : 0), 0.02, 0.3);
  if (chance(azar, chanceCopa)) {
    salida.push({ nombre: `Copa de ${liga.pais}`, clase: 'copa' });
  }

  if (jugoContinental && copaContinental) {
    const chanceContinental = limitar((club.fuerza - 55) / 100 * 0.35, 0.01, 0.28);
    if (chance(azar, chanceContinental)) {
      salida.push({ nombre: copaContinental, clase: 'continental' });
    }
  }
  return salida;
}

/** Premios individuales. Piden temporada grande, no solo OVR alto. */
export function premiosDeLaTemporada(
  azar: Azar,
  carrera: Carrera,
  campeon: boolean,
): string[] {
  const t = carrera.enCurso;
  if (!t || t.partidos < 12) return [];
  const salida: string[] = [];
  const goleador = t.goles >= 18 && (carrera.futbolista.puesto === 'DC' || carrera.futbolista.puesto === 'EXT');
  const notaAlta = t.notaMedia >= 7.4;

  if (goleador && chance(azar, 0.55)) salida.push(`Goleador de ${t.ligaNombre}`);
  if (notaAlta && campeon && chance(azar, 0.5)) salida.push(`Mejor jugador de ${t.ligaNombre}`);
  if (carrera.futbolista.edad <= 21 && notaAlta && chance(azar, 0.35)) {
    salida.push('Mejor jugador joven');
  }
  /* El premio grande exige todo junto: nivel, títulos y una temporada de época. */
  if (carrera.ovr >= 88 && notaAlta && campeon && carrera.trofeos.some((tr) => tr.clase === 'continental')) {
    if (chance(azar, 0.4)) salida.push('Balón de Oro');
  }
  return salida;
}

/** El texto del tramo, con la fecha del calendario. */
export function rotuloDeTramo(indice: number, total: number): string {
  if (total <= 2) return indice === 0 ? 'Primera mitad' : 'Segunda mitad';
  const nombres = ['Arranque', 'Primera vuelta', 'Mitad de año', 'Segunda vuelta', 'Recta final', 'Cierre'];
  return nombres[Math.min(indice, nombres.length - 1)] as string;
}

/** Escribe en el guion lo que pasó en el tramo, gol por gol. */
export function narrarTramo(guion: Guion, azar: Azar, tramo: Tramo, rival: string, competencia: string): void {
  for (let i = 0; i < Math.min(tramo.goles, 4); i++) {
    guion.agregar({
      clase: 'gol',
      minuto: entre(azar, 3, 92),
      rival,
      competencia,
      intensidad: i === 0 ? 'drama' : 'ui',
    });
  }
  if (tramo.goles > 4) {
    guion.texto(`Y ${tramo.goles - 4} goles más en el tramo.`, 'ui');
  }
  if (tramo.rojas > 0) {
    guion.agregar({ clase: 'tarjeta', color: 'roja', motivo: 'falta grave', intensidad: 'ui' });
  }
  if (tramo.lesion) {
    guion.agregar({
      clase: 'lesion',
      semanas: tramo.lesion.semanas,
      motivo: tramo.lesion.motivo,
      intensidad: 'drama',
    });
  }
}
