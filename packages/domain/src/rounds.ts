/**
 * El orden, el nombre y la etapa de las rondas de una copa.
 *
 * El proveedor las manda en inglés, sin orden y con un vocabulario que cambia entre temporadas y entre
 * países: **506 strings distintos** para 61 competencias. Una lista alfabética pondría la final antes
 * de los cuartos, así que el rango es explícito: el fútbol tiene un orden y no se deduce de las
 * palabras.
 *
 * La etapa es lo que ordena la página de una copa. Una fase previa, una fase de grupos y una llave de
 * octavos no son rondas comparables: mientras se juegan los octavos, a nadie le interesa la fase
 * previa, y entre la previa y los octavos está la fase de grupos, que no es un cuadro.
 *
 * El orden del arreglo **es** la decisión: gana la primera regla que coincide, así que lo específico va
 * antes que lo general. Cada trampa salió de auditar los datos reales, no de imaginarlas:
 *
 * - `1/128-finals` y `1/256-finals` son las primeras rondas de la Copa del Rey, la Coupe de France, la
 *   Taça de Portugal, la FA Cup y la Copa do Brasil. Terminan en "finals", así que caían en la regla de
 *   la final: la Copa del Rey mostraba **dos columnas "Final"**, la de septiembre con diez llaves y la
 *   de abril con una. Las reglas `1/64`, `1/32`, `1/16` que había antes no matcheaban un solo partido.
 * - `Round of 64` son los 32avos y `Round of 32` los 16avos: el rótulo va en número porque
 *   "treintaidosavos" no se escribe.
 * - `8th Finals` y `16th Finals` son octavos y dieciseisavos, no finales.
 * - `Knockout Round Play-offs` es el repechaje posterior a la fase liga (febrero), no la previa de
 *   agosto: va antes que la regla de `Play-offs`, que lo capturaba.
 * - `1st Round Qualifying` es clasificación y `1st Round` es el cuadro principal: en la FA Cup los
 *   separan cuatro meses y caían en el mismo rótulo. Las reglas de clasificación van primero.
 * - Las rondas numeradas de la 4ª a la 8ª existen —la Coupe de France juega su 7ª ronda con noventa
 *   llaves— y quedaban fuera del cuadro por no tener regla.
 * - Un prefijo antes de " - " es un torneo dentro de la temporada: `Apertura - Final` y
 *   `Clausura - Final` son dos finales distintas y el rótulo tiene que decir cuál.
 * - `1st Round - 3` es la fecha 3 de una liguilla, no la primera ronda: el sufijo numérico se conserva.
 */

/** Las tres etapas de una copa, en orden de importancia para quien mira. */
export type Etapa = 'final' | 'grupos' | 'previa';

export interface Ronda {
  /** Cómo la nombra el proveedor. */
  round: string;
  /** Nombre para mostrar, en español. */
  label: string;
  /** Posición en el camino del torneo: más chico, más temprano. */
  rank: number;
  /** Cierto en las rondas de eliminación directa, que son las que forman un cuadro. */
  eliminatoria: boolean;
  /** A qué parte del torneo pertenece; null cuando el proveedor mandó algo que no reconocemos. */
  etapa: Etapa | null;
}

interface Regla {
  patron: RegExp;
  label: string;
  rank: number;
  etapa: Etapa;
  /** Por omisión, una ronda de etapa `final` o `previa` es eliminatoria y una de grupos no. */
  eliminatoria?: boolean;
  /** La ronda es una fecha de liga: el rótulo sale del encabezado y no de la regla. */
  jornada?: boolean;
  /**
   * Ronda numerada del tipo "3rd Round": es fase previa cuando el torneo tiene fase de grupos —la
   * Libertadores— y es el cuadro principal cuando no la tiene —la FA Cup, la Copa del Rey—. Lo
   * resuelve `clasificarRondas` mirando la temporada completa.
   */
  numerada?: number;
}

/* Los rangos van espaciados por banda: previa 10-100, grupos 200-210, cuadro 300-470. */
const REGLAS: Regla[] = [
  /* --- fase previa: antes de que el torneo tenga forma --- */
  { patron: /extra\s*preliminary/i, label: 'Previa preliminar', rank: 10, etapa: 'previa' },
  { patron: /1st\s*preliminary|preliminary\s*round\s*1|preliminary\s*1/i, label: 'Preliminar 1', rank: 20, etapa: 'previa' },
  { patron: /2nd\s*preliminary|preliminary\s*round\s*2|preliminary\s*2/i, label: 'Preliminar 2', rank: 30, etapa: 'previa' },
  { patron: /3rd\s*preliminary|preliminary\s*round\s*3/i, label: 'Preliminar 3', rank: 40, etapa: 'previa' },
  { patron: /4th\s*preliminary|preliminary\s*round\s*4/i, label: 'Preliminar 4', rank: 45, etapa: 'previa' },
  { patron: /preliminary/i, label: 'Ronda preliminar', rank: 50, etapa: 'previa' },
  /*
   * La Copa Chile arranca por zonas y su llave regional convive con la nacional: sin estas reglas,
   * "Regional Semi-finals" y "Semi-finals" eran la misma columna en el mismo torneo.
   */
  { patron: /^regional\s+quarter/i, label: 'Regional · cuartos', rank: 53, etapa: 'previa' },
  { patron: /^regional\s+semi/i, label: 'Regional · semifinales', rank: 54, etapa: 'previa' },
  { patron: /^regional\s+finals?/i, label: 'Regional · final', rank: 55, etapa: 'previa' },
  { patron: /^regional\b/i, label: 'Fase regional', rank: 52, etapa: 'previa' },
  /* La clasificación va antes que las rondas numeradas: "1st Round Qualifying" no es "1st Round". */
  { patron: /(1st|first)\s*(round\s*)?qualif|qualif\w*\s*round\s*1/i, label: 'Fase previa 1', rank: 60, etapa: 'previa' },
  { patron: /(2nd|second)\s*(round\s*)?qualif|qualif\w*\s*round\s*2/i, label: 'Fase previa 2', rank: 70, etapa: 'previa' },
  { patron: /(3rd|third)\s*(round\s*)?qualif|qualif\w*\s*round\s*3/i, label: 'Fase previa 3', rank: 80, etapa: 'previa' },
  { patron: /(4th|fourth)\s*(round\s*)?qualif|qualif\w*\s*round\s*4/i, label: 'Fase previa 4', rank: 90, etapa: 'previa' },
  { patron: /qualif/i, label: 'Fase previa', rank: 95, etapa: 'previa' },

  /* El repechaje de la fase liga, antes que la regla de "Play-offs" que lo capturaba. */
  { patron: /knockout\s*(round\s*)?play[\s-]?offs?/i, label: 'Repechaje', rank: 425, etapa: 'final' },
  { patron: /play[\s-]?in/i, label: 'Play-in', rank: 415, etapa: 'final' },
  /* Con guion, con espacio o pegado: el proveedor escribe "Play-offs", "Play Offs" y "Playoffs". */
  { patron: /play[\s-]?offs?/i, label: 'Repechaje de acceso', rank: 100, etapa: 'previa' },

  /* --- fase de grupos, en cualquiera de sus formatos --- */
  { patron: /ranking\s*of\s*second/i, label: 'Mejores segundos', rank: 210, etapa: 'grupos' },
  /* La AFC juega su fase liga en dos zonas a la vez y la fecha 1 existe dos veces. */
  { patron: /league\s*phase\s*east/i, label: 'Fase liga Este', rank: 200, etapa: 'grupos' },
  { patron: /league\s*phase\s*west/i, label: 'Fase liga Oeste', rank: 202, etapa: 'grupos' },
  { patron: /league\s*(stage|phase)/i, label: 'Fase liga', rank: 200, etapa: 'grupos' },
  /* "Regular Season - 12" es la fecha 12 de una liga, no una fase de grupos. */
  { patron: /regular\s*season/i, label: 'Temporada regular', rank: 200, etapa: 'grupos' },
  /* Dos fases de liga con la misma numeración de fechas: sin nombre propio, la fecha 3 era una sola. */
  { patron: /1st\s*phase/i, label: 'Primera fase', rank: 200, etapa: 'grupos' },
  { patron: /2nd\s*phase/i, label: 'Segunda fase', rank: 205, etapa: 'grupos' },
  { patron: /group\s*stage/i, label: 'Fase de grupos', rank: 200, etapa: 'grupos' },
  /* `Group H - 6`: la letra viene dentro de la ronda y se conserva en el rótulo. */
  { patron: /^group\s+([a-l])\b/i, label: 'Grupo', rank: 200, etapa: 'grupos' },
  /*
   * El cierre por grupos de una liga europea: campeonato, descenso y ubicación se juegan a la vez y con
   * la misma fecha, así que cada uno necesita su nombre.
   */
  { patron: /championship\s*(group|round)/i, label: 'Grupo campeonato', rank: 200, etapa: 'grupos' },
  { patron: /relegation\s*(group|round)/i, label: 'Grupo descenso', rank: 202, etapa: 'grupos' },
  { patron: /placement\s*group/i, label: 'Grupo de ubicación', rank: 204, etapa: 'grupos' },
  { patron: /group|relegation/i, label: 'Fase de grupos', rank: 200, etapa: 'grupos' },
  /*
   * Cualquier ronda que termine en "- N" es una fecha, no una llave: de los treinta y seis
   * encabezados que existen en la base —Apertura, Clausura, Regular Season, Torneo Intermedio— ninguno
   * es de eliminación directa. Va antes que las rondas numeradas porque las quince fechas de
   * "1st Round - N" de la Liga Pro son una liguilla y se dibujaban como quince columnas de cuadro.
   */
  { patron: /-\s*\d+\s*$/, label: '', rank: 200, etapa: 'grupos', jornada: true },

  /* --- el cuadro: de la ronda más lejana a la copa --- */
  { patron: /1\/256/i, label: '256avos de final', rank: 300, etapa: 'final' },
  { patron: /1\/128/i, label: '128avos de final', rank: 310, etapa: 'final' },
  /* Rondas numeradas del cuadro principal; `numerada` deja que la temporada decida su etapa. */
  { patron: /^(1st|first)\s*round\b|^round\s*1\b/i, label: '1ª ronda', rank: 320, etapa: 'final', numerada: 1 },
  { patron: /^(2nd|second)\s*round\b|^round\s*2\b/i, label: '2ª ronda', rank: 330, etapa: 'final', numerada: 2 },
  { patron: /^(3rd|third)\s*round\b|^round\s*3\b/i, label: '3ª ronda', rank: 340, etapa: 'final', numerada: 3 },
  { patron: /^(4th|fourth)\s*round\b|^round\s*4\b/i, label: '4ª ronda', rank: 350, etapa: 'final', numerada: 4 },
  { patron: /^(5th|fifth)\s*round\b/i, label: '5ª ronda', rank: 360, etapa: 'final', numerada: 5 },
  { patron: /^(6th|sixth)\s*round\b/i, label: '6ª ronda', rank: 370, etapa: 'final', numerada: 6 },
  { patron: /^(7th|seventh)\s*round\b/i, label: '7ª ronda', rank: 380, etapa: 'final', numerada: 7 },
  { patron: /^(8th|eighth)\s*round\b/i, label: '8ª ronda', rank: 390, etapa: 'final', numerada: 8 },
  { patron: /round\s*of\s*128|64th\s*finals/i, label: '64avos de final', rank: 400, etapa: 'final' },
  { patron: /round\s*of\s*64|32nd\s*finals/i, label: '32avos de final', rank: 410, etapa: 'final' },
  { patron: /round\s*of\s*32|16th\s*finals/i, label: '16avos de final', rank: 420, etapa: 'final' },
  { patron: /round\s*of\s*16|8th\s*finals/i, label: 'Octavos de final', rank: 430, etapa: 'final' },
  { patron: /quarter/i, label: 'Cuartos de final', rank: 440, etapa: 'final' },
  /* En los playoffs canadienses la Grand Final es el título y la Elimination Final es la puerta. */
  { patron: /grand\s*final/i, label: 'Final', rank: 470, etapa: 'final' },
  { patron: /elimination\s*final/i, label: 'Eliminación', rank: 435, etapa: 'final' },
  { patron: /conference\s*semi-?finals?/i, label: 'Semifinales de conferencia', rank: 443, etapa: 'final' },
  { patron: /conference\s*finals?/i, label: 'Finales de conferencia', rank: 445, etapa: 'final' },
  /* El repechaje sudamericano por un cupo continental, al final de la temporada de liga. */
  { patron: /reclasificaci/i, label: 'Reclasificación', rank: 415, etapa: 'final' },
  { patron: /semi/i, label: 'Semifinales', rank: 450, etapa: 'final' },
  /* Los puestos de consuelo, antes de la regla de la final: los dos dicen "Final". */
  { patron: /(3rd|third|tercer)\s*place/i, label: 'Tercer puesto', rank: 460, etapa: 'final' },
  { patron: /\d+(st|nd|rd|th)\s*place/i, label: 'Definición de puestos', rank: 465, etapa: 'final' },
  { patron: /finals?$|^finals?\b/i, label: 'Final', rank: 470, etapa: 'final' },
];

/** Cuando la ronda numerada es fase previa, su rango baja a la banda de la previa. */
const RANGO_PREVIA_NUMERADA: Record<number, number> = { 1: 60, 2: 70, 3: 80, 4: 90, 5: 91, 6: 92, 7: 93, 8: 94 };

/** El número de fecha al final de la ronda: "Group Stage - 6" o "1st Round - 3" → "6" / "3". */
const FECHA = /-\s*(\d+)\s*$/;

/**
 * Parte `X - Y` en sus dos mitades cuando la segunda es una ronda: `Apertura - Final`,
 * `Conference League Play-offs - Semi-finals`, `Preliminary Round - Final`.
 *
 * El rango y la etapa los decide la regla que gana sobre el string completo —un repechaje de acceso
 * sigue siendo previa aunque su llave termine en una final—, pero el rótulo necesita las dos partes: la
 * final del Apertura y la del Clausura son dos finales, y sin la mitad de adelante eran una sola.
 */
function partirEnGuion(round: string): [string, string] | null {
  const corte = round.indexOf(' - ');
  if (corte === -1) return null;
  const cabeza = round.slice(0, corte).trim();
  const cola = round.slice(corte + 3).trim();
  if (cabeza === '' || cola === '' || /^\d+$/.test(cola)) return null;
  return REGLAS.some((r) => r.patron.test(cola)) ? [cabeza, cola] : null;
}

export function describirRonda(round: string): Ronda {
  const limpio = round.trim();
  /*
   * Si el string completo no cae en ninguna regla, la mitad de atrás puede caer: "MLS Cup - Round 1" es
   * la primera ronda de los playoffs y quedaba fuera del cuadro por el nombre del torneo adelante.
   */
  const corte = limpio.indexOf(' - ');
  const regla =
    REGLAS.find((r) => r.patron.test(limpio)) ??
    (corte === -1 ? undefined : REGLAS.find((r) => r.patron.test(limpio.slice(corte + 3).trim())));
  if (!regla) return { round: limpio, label: limpio, rank: 999, eliminatoria: false, etapa: null };

  const eliminatoria = regla.eliminatoria ?? regla.etapa !== 'grupos';
  return {
    round: limpio,
    label: etiquetaDe(limpio, regla),
    rank: regla.rank,
    eliminatoria,
    etapa: regla.etapa,
  };
}

/**
 * El rótulo con lo que la ronda agrega: el torneo del que es parte, la letra del grupo cuando viene en
 * el nombre y el número de fecha cuando lo hay. Sin esto, las quince fechas de una liguilla llamada
 * "1st Round - N" colapsaban en un solo rótulo.
 */
function etiquetaDe(round: string, regla: Regla): string {
  const fecha = FECHA.exec(round)?.[1];
  if (regla.jornada) {
    /* "Clausura - Quadrangular - 3" → "Clausura · Quadrangular · fecha 3"; "Round - 12" → "Fecha 12". */
    const cabeza = round.replace(FECHA, '').trim();
    const propia = REGLAS.find((r) => r.patron.test(cabeza));
    const base = propia ? etiquetaDe(cabeza, propia) : cabeza.replace(/\s*-\s*/g, ' · ');
    return /^round$/i.test(base) || base === '' ? `Fecha ${fecha}` : `${base} · fecha ${fecha}`;
  }

  /* Cada mitad se rotula sola: la de adelante puede ser un torneo —"Apertura"— o una ronda. */
  const partes = partirEnGuion(round);
  if (partes) return partes.map((parte) => describirRonda(parte).label).join(' · ');

  const grupo = /^group\s+([a-l])\b/i.exec(round)?.[1]?.toUpperCase();
  const base = grupo ? `Grupo ${grupo}` : regla.label;
  return fecha ? `${base} · fecha ${fecha}` : base;
}

/**
 * Las rondas de una temporada, con las numeradas puestas en su lugar.
 *
 * "3rd Round" significa dos cosas distintas según el torneo: en la Libertadores es la tercera fase
 * previa —antes de los grupos— y en la FA Cup es la tercera ronda del cuadro, donde entran los
 * grandes. La diferencia no está en el nombre sino en la temporada: **si hay fase de grupos, las
 * rondas numeradas son previa; si no la hay, son el cuadro**.
 */
export function clasificarRondas(rondas: string[]): Ronda[] {
  const descritas = rondas.map(describirRonda);
  const hayGrupos = descritas.some((r) => r.etapa === 'grupos');
  if (!hayGrupos) return ordenarPorRango(descritas);

  return ordenarPorRango(
    descritas.map((ronda) => {
      const regla = REGLAS.find((r) => r.patron.test(ronda.round));
      if (!regla?.numerada) return ronda;
      return {
        ...ronda,
        etapa: 'previa' as Etapa,
        rank: RANGO_PREVIA_NUMERADA[regla.numerada] ?? ronda.rank,
        label: ronda.label.replace(/^(\d)ª ronda/, 'Fase previa $1'),
      };
    }),
  );
}

function ordenarPorRango(rondas: Ronda[]): Ronda[] {
  return [...rondas].sort((a, b) => a.rank - b.rank || a.round.localeCompare(b.round, 'es'));
}

/** A qué etapa pertenece una ronda; null cuando no se reconoce. */
export function etapaDeRonda(round: string | null | undefined): Etapa | null {
  return round ? describirRonda(round).etapa : null;
}

/**
 * Las etapas en el orden en que se muestran: primero la que se está jugando, después el resto por
 * importancia. Es lo que hace que la página se reordene sola cuando cambia la temporada: mientras se
 * juegan los octavos manda el cuadro, y cuando arranca la fase de grupos manda la fase de grupos.
 */
const IMPORTANCIA: Etapa[] = ['final', 'grupos', 'previa'];

export function ordenarEtapas(enJuego: Etapa | null): Etapa[] {
  if (enJuego === null) return [...IMPORTANCIA];
  return [enJuego, ...IMPORTANCIA.filter((e) => e !== enJuego)];
}

/**
 * Las rondas que faltan para llegar a la final, a partir de cuántas llaves tiene la última que existe.
 *
 * Una eliminatoria se parte en dos cada vez, así que con ocho llaves en octavos se sabe que vienen
 * cuartos, semis y final aunque el proveedor todavía no publique un solo partido. Devuelve vacío si el
 * número de llaves no es potencia de dos: ahí la escalera no es deducible —un tercer puesto, una
 * liguilla— y suponerla sería inventar.
 */
export function escaleraDesde(llaves: number): Array<{ label: string; rank: number; llaves: number }> {
  if (llaves < 2 || (llaves & (llaves - 1)) !== 0) return [];

  const escalones: Array<{ label: string; rank: number; llaves: number }> = [];
  for (let restantes = llaves / 2; restantes >= 1; restantes /= 2) {
    const rank = RANGO_POR_LLAVES[restantes];
    const regla = rank === undefined ? undefined : REGLAS.find((r) => r.rank === rank);
    if (!regla) return escalones;
    escalones.push({ label: regla.label, rank: regla.rank, llaves: restantes });
  }
  return escalones;
}

/** Cuántas llaves tiene cada ronda del cuadro: ocho llaves son los octavos. */
const RANGO_POR_LLAVES: Record<number, number> = {
  64: 400,
  32: 410,
  16: 420,
  8: 430,
  4: 440,
  2: 450,
  1: 470,
};
