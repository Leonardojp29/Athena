import { STAT_ROWS, type TeamStatistics, type TeamSummary } from './api';

export interface FilaDeEstadistica {
  key: keyof TeamStatistics;
  label: string;
  isPercent?: boolean;
  homeValue: number | null;
  awayValue: number | null;
}

/**
 * Las filas comparables de un partido: las que al menos un equipo tiene.
 *
 * Vive acá y no dentro de la tarjeta porque el resumen decide su grilla según haya estadísticas o
 * no, y una regla duplicada entre el padre y el hijo termina en una columna vacía.
 */
export function filasDeEstadisticas(
  statistics: TeamStatistics[],
  homeTeam: TeamSummary,
  awayTeam: TeamSummary,
): FilaDeEstadistica[] {
  const home = statistics.find((s) => s.teamId === homeTeam.id);
  const away = statistics.find((s) => s.teamId === awayTeam.id);
  if (!home || !away) return [];

  return STAT_ROWS.map((row) => ({
    ...row,
    homeValue: home[row.key] as number | null,
    awayValue: away[row.key] as number | null,
  })).filter((row) => row.homeValue !== null || row.awayValue !== null);
}
