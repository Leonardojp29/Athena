/**
 * El orden y el nombre de las rondas de una copa.
 *
 * El proveedor las manda en inglés y sin ningún orden —"Round of 16", "Quarter-finals",
 * "Qualification Round 2", "Group Stage - 6"—, y una lista alfabética pondría la final antes de los
 * cuartos. El rango es explícito porque el fútbol tiene un orden y no se deduce de las palabras.
 */
export interface Ronda {
  /** Cómo la nombra el proveedor. */
  round: string;
  /** Nombre para mostrar, en español. */
  label: string;
  /** Posición en el camino del torneo: más chico, más temprano. */
  rank: number;
  /** Cierto en las rondas de eliminación directa, que son las que forman el cuadro. */
  eliminatoria: boolean;
}

const REGLAS: Array<{ patron: RegExp; label: string; rank: number; eliminatoria: boolean }> = [
  { patron: /preliminary/i, label: 'Preliminar', rank: 0, eliminatoria: true },
  { patron: /qualif\w*\s*round\s*1|1st\s*qualif/i, label: 'Fase previa 1', rank: 1, eliminatoria: true },
  { patron: /qualif\w*\s*round\s*2|2nd\s*qualif/i, label: 'Fase previa 2', rank: 2, eliminatoria: true },
  { patron: /qualif\w*\s*round\s*3|3rd\s*qualif/i, label: 'Fase previa 3', rank: 3, eliminatoria: true },
  { patron: /play-?offs?\s*round|play-?offs?$/i, label: 'Repechaje', rank: 4, eliminatoria: true },
  { patron: /group\s*stage|regular\s*season|1st\s*phase|group\s/i, label: 'Fase de grupos', rank: 10, eliminatoria: false },
  { patron: /knockout\s*round\s*play-?offs/i, label: 'Playoff de octavos', rank: 15, eliminatoria: true },
  { patron: /round\s*of\s*32|1\/16/i, label: 'Dieciseisavos', rank: 20, eliminatoria: true },
  { patron: /round\s*of\s*16|1\/8/i, label: 'Octavos', rank: 30, eliminatoria: true },
  { patron: /quarter/i, label: 'Cuartos de final', rank: 40, eliminatoria: true },
  { patron: /semi/i, label: 'Semifinales', rank: 50, eliminatoria: true },
  { patron: /3rd\s*place|third\s*place|tercer/i, label: 'Tercer puesto', rank: 55, eliminatoria: true },
  { patron: /final/i, label: 'Final', rank: 60, eliminatoria: true },
];

export function describirRonda(round: string): Ronda {
  const limpio = round.trim();
  const regla = REGLAS.find((r) => r.patron.test(limpio));
  if (!regla) return { round: limpio, label: limpio, rank: 99, eliminatoria: false };

  /*
   * En la fase de grupos el número de fecha es parte del nombre; en una llave, no hay número que
   * agregar. Se conserva para que "Fase de grupos · 6" siga distinguiéndose de la fecha 1.
   */
  const fecha = /-\s*(\d+)\s*$/.exec(limpio)?.[1];
  return {
    round: limpio,
    label: fecha && !regla.eliminatoria ? `${regla.label} · fecha ${fecha}` : regla.label,
    rank: regla.rank,
    eliminatoria: regla.eliminatoria,
  };
}

/** Ordena las rondas por el camino del torneo y no por el alfabeto. */
export function ordenarRondas(rondas: string[]): Ronda[] {
  return rondas
    .map(describirRonda)
    .sort((a, b) => a.rank - b.rank || a.round.localeCompare(b.round, 'es'));
}
