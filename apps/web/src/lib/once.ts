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
  /** El minuto en que lo reemplazaron: la ficha lleva su flecha de salida. */
  salioEn?: number | null;
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

/**
 * El payload de una ficha, sin los nulos.
 *
 * Cada ficha lleva las veinticinco estadísticas del partido y la mitad viene en null —un defensor no
 * tiene atajadas ni penales—, así que el JSON pesaba el doble de lo que dice. La ficha ya omite la
 * fila cuando el valor falta, así que quitarlos no cambia nada de lo que se ve: en la tarjeta de
 * alineaciones, con cinco fechas y cien fichas, son decenas de kilobytes de HTML.
 */
export function fichaJson(payload: unknown): string {
  return JSON.stringify(payload, (_clave, valor) => (valor === null ? undefined : valor));
}

export const notaDe = (valor: string | null): string | null =>
  valor === null ? null : Number(valor).toFixed(1);

export const apellidoDe = (nombre: string): string => nombre.split(' ').at(-1) ?? nombre;
