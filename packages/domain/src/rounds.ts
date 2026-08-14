/**
 * El orden, el nombre y la etapa de las rondas de una copa.
 *
 * El proveedor las manda en inglés, sin orden y con un vocabulario que cambió entre temporadas: para
 * las mismas nueve copas hay **147 strings distintos** en la base. Una lista alfabética pondría la
 * final antes de los cuartos, así que el rango es explícito: el fútbol tiene un orden y no se deduce
 * de las palabras.
 *
 * La etapa es lo que ordena la página de una copa. Una fase previa, una fase de grupos y una llave de
 * octavos no son rondas comparables: mientras se juegan los octavos, a nadie le interesa la fase
 * previa, y entre la previa y los octavos está la fase de grupos —que no es un cuadro—. Sin separar
 * las tres, la Libertadores mostraba "Fase previa 1, 2, 3 y Octavos" en fila, como si una siguiera a
 * la otra.
 *
 * El orden del arreglo de reglas **es** la decisión: gana la primera que coincide, así que lo
 * específico va antes que lo general. Cada trampa de acá abajo salió de mirar los datos reales:
 *
 * - `8th Finals` y `16th Finals` son octavos y dieciseisavos, no finales. Caían en `/final/i` y en el
 *   Mundial de Clubes 2025 el cuadro mostraba "Final" dos veces, con los octavos después de la semi.
 * - `Knockout Round Play-offs` es el repechaje **posterior** a la fase liga (febrero), no la previa de
 *   agosto: tiene que ir antes que la regla de `Play-offs`, que lo capturaba y lo mandaba al arranque
 *   del torneo.
 * - `1st/2nd/3rd Round` son las fases previas de la Libertadores hasta 2025; el proveedor pasó a
 *   `Qualification Round N` en 2026. Sin la primera forma, esas rondas no entraban al cuadro.
 * - `League Stage` y `League Phase East/West` son la fase liga del formato nuevo de la UEFA y de la
 *   AFC: son fase de grupos, no una ronda desconocida al final de la lista.
 * - Las cinco variantes de "Preliminary" son rondas distintas: la CAF juega dos en la misma temporada.
 * - Cuando la letra del grupo viene dentro de la ronda —`Group H - 6`, como en las temporadas viejas
 *   del archivo— se conserva en el rótulo.
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
}

const REGLAS: Regla[] = [
  /* --- fase previa: antes de que el torneo tenga forma --- */
  { patron: /^preliminary\s*round\s*-\s*(final|semi)/i, label: 'Ronda preliminar', rank: 3, etapa: 'previa' },
  { patron: /1st\s*preliminary|preliminary\s*round\s*1|preliminary\s*1/i, label: 'Preliminar 1', rank: 1, etapa: 'previa' },
  { patron: /2nd\s*preliminary|preliminary\s*round\s*2|preliminary\s*2/i, label: 'Preliminar 2', rank: 2, etapa: 'previa' },
  { patron: /preliminary/i, label: 'Ronda preliminar', rank: 3, etapa: 'previa' },
  { patron: /(qualif\w*\s*round\s*1|1st\s*qualif|^1st\s*round)/i, label: 'Fase previa 1', rank: 4, etapa: 'previa' },
  { patron: /(qualif\w*\s*round\s*2|2nd\s*qualif|^2nd\s*round)/i, label: 'Fase previa 2', rank: 5, etapa: 'previa' },
  { patron: /(qualif\w*\s*round\s*3|3rd\s*qualif|^3rd\s*round)/i, label: 'Fase previa 3', rank: 6, etapa: 'previa' },
  { patron: /qualif/i, label: 'Fase previa', rank: 7, etapa: 'previa' },

  /*
   * El repechaje de la fase liga va **antes** que la regla de "Play-offs": el string termina en
   * "Play-offs" y si no se lo saca primero, febrero termina ordenado en agosto.
   */
  { patron: /knockout\s*(round\s*)?play-?offs?/i, label: 'Repechaje', rank: 25, etapa: 'final' },
  { patron: /play-?offs?/i, label: 'Repechaje de acceso', rank: 8, etapa: 'previa' },

  /* --- fase de grupos, en cualquiera de sus formatos --- */
  { patron: /ranking\s*of\s*second/i, label: 'Mejores segundos', rank: 12, etapa: 'grupos' },
  { patron: /league\s*(stage|phase)/i, label: 'Fase liga', rank: 10, etapa: 'grupos' },
  { patron: /group\s*stage|regular\s*season|1st\s*phase/i, label: 'Fase de grupos', rank: 10, etapa: 'grupos' },
  /* `Group H - 6`: la letra viene dentro de la ronda y se conserva en el rótulo. */
  { patron: /^group\s+([a-l])\b/i, label: 'Grupo', rank: 10, etapa: 'grupos' },
  { patron: /group/i, label: 'Fase de grupos', rank: 10, etapa: 'grupos' },

  /* --- fase final: el cuadro que termina en la copa --- */
  { patron: /round\s*of\s*128|1\/64/i, label: 'Ronda de 128', rank: 28, etapa: 'final' },
  { patron: /round\s*of\s*64|1\/32|32nd\s*finals/i, label: 'Treintaidosavos', rank: 30, etapa: 'final' },
  { patron: /round\s*of\s*32|1\/16|16th\s*finals/i, label: 'Dieciseisavos', rank: 35, etapa: 'final' },
  { patron: /round\s*of\s*16|1\/8|8th\s*finals/i, label: 'Octavos de final', rank: 40, etapa: 'final' },
  { patron: /quarter|1\/4/i, label: 'Cuartos de final', rank: 50, etapa: 'final' },
  { patron: /semi/i, label: 'Semifinales', rank: 60, etapa: 'final' },
  /* Los puestos de consuelo, antes de la regla de la final: los dos dicen "Final". */
  { patron: /(3rd|third|tercer)\s*place/i, label: 'Tercer puesto', rank: 65, etapa: 'final' },
  { patron: /\d+(st|nd|rd|th)\s*place/i, label: 'Definición de puestos', rank: 66, etapa: 'final' },
  { patron: /finals?$|^finals?\b/i, label: 'Final', rank: 70, etapa: 'final' },
];

/** El número de fecha de una ronda de grupos: "Group Stage - 6" → "6". */
const FECHA = /-\s*(\d+)\s*$/;

export function describirRonda(round: string): Ronda {
  const limpio = round.trim();
  const regla = REGLAS.find((r) => r.patron.test(limpio));
  if (!regla) return { round: limpio, label: limpio, rank: 99, eliminatoria: false, etapa: null };

  const eliminatoria = regla.eliminatoria ?? regla.etapa !== 'grupos';
  return {
    round: limpio,
    label: etiquetaDe(limpio, regla, eliminatoria),
    rank: regla.rank,
    eliminatoria,
    etapa: regla.etapa,
  };
}

/**
 * El rótulo con lo que la ronda agrega: la fecha en la fase de grupos y la letra del grupo cuando
 * viene dentro del nombre. En una llave no hay número que agregar.
 */
function etiquetaDe(round: string, regla: Regla, eliminatoria: boolean): string {
  const grupo = /^group\s+([a-l])\b/i.exec(round)?.[1]?.toUpperCase();
  const base = grupo ? `Grupo ${grupo}` : regla.label;
  const fecha = FECHA.exec(round)?.[1];
  return fecha && !eliminatoria ? `${base} · fecha ${fecha}` : base;
}

/** Ordena las rondas por el camino del torneo y no por el alfabeto. */
export function ordenarRondas(rondas: string[]): Ronda[] {
  return rondas
    .map(describirRonda)
    .sort((a, b) => a.rank - b.rank || a.round.localeCompare(b.round, 'es'));
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
 * Las rondas que faltan para llegar a la final, a partir de cuántas llaves tiene la primera.
 *
 * Una eliminatoria se parte en dos cada vez, así que con ocho llaves en octavos se sabe que vienen
 * cuartos, semis y final aunque el proveedor todavía no publique un solo partido. Es lo que permite
 * dibujar el camino completo al título en vez de una sola columna suelta.
 *
 * Devuelve vacío si el número de llaves no es potencia de dos: ahí la escalera no es deducible —un
 * tercer puesto, un grupo final, una liguilla— y suponerla sería inventar.
 */
export function escaleraDesde(llaves: number): Array<{ label: string; rank: number; llaves: number }> {
  if (llaves < 2 || (llaves & (llaves - 1)) !== 0) return [];

  const escalones: Array<{ label: string; rank: number; llaves: number }> = [];
  for (let restantes = llaves / 2; restantes >= 1; restantes /= 2) {
    const regla = REGLAS.find((r) => r.etapa === 'final' && r.rank === RANK_POR_LLAVES[restantes]);
    if (!regla) return escalones;
    escalones.push({ label: regla.label, rank: regla.rank, llaves: restantes });
  }
  return escalones;
}

/** Cuántas llaves tiene cada ronda del cuadro: ocho llaves son los octavos. */
const RANK_POR_LLAVES: Record<number, number> = { 64: 28, 32: 30, 16: 35, 8: 40, 4: 50, 2: 60, 1: 70 };
