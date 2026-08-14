/*
 * El once ideal, sin saber de dónde salió.
 *
 * El once de la fecha y el once del torneo responden preguntas distintas —la última jornada contra
 * toda la temporada— pero se dibujan igual, así que la cancha trabaja sobre esta forma y cada vista
 * adapta sus filas. La formación se decide acá porque quien llama necesita saber, antes de dibujar,
 * si el once cierra: media cancha con seis fichas no es una alineación.
 */
export interface FichaOnce {
  /** `G`, `D`, `M` o `F`; la cancha ordena por eso. */
  puesto: string;
  nombre: string;
  href: string;
  fotoUrl: string | null;
  equipo: string;
  nota: string | null;
  dorsal?: number | null;
  goles?: number | null;
  /** Cuando viene, la ficha abre el modal del partido en lugar de navegar. */
  ficha?: string | null;
  /**
   * La casilla del proveedor, `fila:columna`. Cuando existe —una alineación real— manda sobre la
   * formación deducida: un 4-2-3-1 se dibuja como tal y no como un 4-5-1.
   */
  grid?: string | null;
}

export const PUESTOS = ['G', 'D', 'M', 'F'] as const;

export const LINEA: Record<string, string> = {
  G: 'Arquero',
  D: 'Defensa',
  M: 'Mediocampo',
  F: 'Ataque',
};

export function porPuesto(jugadores: FichaOnce[]): Map<string, FichaOnce[]> {
  return new Map(PUESTOS.map((p) => [p, jugadores.filter((j) => j.puesto === p)]));
}

/** `4-4-2` cuando hay un arquero y once en total; null cuando no hay once que dibujar. */
export function formacionDe(jugadores: FichaOnce[]): string | null {
  const grupos = porPuesto(jugadores);
  if ((grupos.get('G')?.length ?? 0) !== 1) return null;
  if (PUESTOS.reduce((n, p) => n + (grupos.get(p)?.length ?? 0), 0) !== 11) return null;
  return PUESTOS.slice(1)
    .map((p) => grupos.get(p)?.length ?? 0)
    .join('-');
}

export const notaDe = (valor: string | null): string | null =>
  valor === null ? null : Number(valor).toFixed(1);

export const apellidoDe = (nombre: string): string => nombre.split(' ').at(-1) ?? nombre;
