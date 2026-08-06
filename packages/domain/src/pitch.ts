/**
 * Geometría de la cancha. Puro, sin DOM y sin proveedor: la posición de once jugadores es
 * una decisión de dominio y es el único lugar del rediseño donde un error se ve a simple
 * vista y a la vez es fácil de testear.
 *
 * Coordenadas en el área propia del equipo, en porcentaje: `y = 0` es su línea de gol y
 * `y = 100` la mitad de la cancha; `x = 0` es una banda y `x = 100` la otra. Quien dibuje
 * decide cómo mapear eso a la cancha completa.
 */

/** Medidas reglamentarias en metros: la cancha no es un rectángulo cualquiera. */
export const PITCH_LENGTH_M = 105;
export const PITCH_WIDTH_M = 68;

/**
 * El proveedor no documenta si la columna 1 es la banda izquierda o la derecha. Queda
 * detrás de esta constante: si se ve espejado, se cambia acá y en ningún otro lado.
 */
const COL_ONE_IS_LEFT = false;

/*
 * Márgenes a lo largo: el arquero no pisa la línea de gol y la línea más adelantada se queda
 * corta de la mitad. El segundo importa más de lo que parece: con los dos equipos en la misma
 * cancha, dos volantes de contención a 7% de distancia se superponen en un teléfono.
 */
const LARGO_ATRAS = 8;
const LARGO_ADELANTE = 13;

export interface GridPosition {
  row: number;
  col: number;
}

export interface PlacedPlayer<T> {
  player: T;
  x: number;
  y: number;
  row: number;
}

export interface LayoutOptions {
  /** Formación del proveedor, p. ej. "4-2-3-1". Se usa cuando falta el grid. */
  formation?: string | null;
  /** Invierte el eje transversal; útil para enfrentar a los dos equipos. */
  mirrored?: boolean;
}

/** "3:2" → { row: 3, col: 2 }. Cualquier otra cosa es null y no se adivina. */
export function parseGrid(grid: string | null | undefined): GridPosition | null {
  if (!grid) return null;
  const match = /^(\d+):(\d+)$/.exec(grid.trim());
  if (!match) return null;
  const row = Number(match[1]);
  const col = Number(match[2]);
  if (row < 1 || col < 1) return null;
  return { row, col };
}

/**
 * "4-2-3-1" → [1, 4, 2, 3, 1]: el arquero se agrega adelante porque la formación nunca lo
 * nombra. Devuelve null si la suma no da once, que es la señal de que no hay que confiar.
 */
export function rowsFromFormation(formation: string | null | undefined): number[] | null {
  if (!formation) return null;
  const parts = formation.trim().split(/[-–]/);
  const lines = parts.map((part) => Number(part.trim()));
  if (lines.length < 2 || lines.some((n) => !Number.isInteger(n) || n < 1)) return null;

  const total = lines.reduce((sum, n) => sum + n, 0);
  if (total !== 10) return null;
  return [1, ...lines];
}

/**
 * Ubica a los jugadores. Escalera de degradación: primero el grid del proveedor, después la
 * formación, y si nada sirve devuelve null para que la interfaz muestre la lista. Una cancha
 * a medias es peor que ninguna.
 */
export function layout<T extends { grid?: string | null }>(
  players: T[],
  options: LayoutOptions = {},
): PlacedPlayer<T>[] | null {
  if (players.length === 0) return null;

  const byGrid = fromGrid(players);
  if (byGrid) return place(byGrid, options.mirrored ?? false);

  const rows = rowsFromFormation(options.formation);
  if (!rows || players.length !== rows.reduce((sum, n) => sum + n, 0)) return null;

  return place(fromFormation(players, rows), options.mirrored ?? false);
}

/** Agrupa por fila usando el grid. Exige que todos lo tengan: uno solo sin él descuadra todo. */
function fromGrid<T extends { grid?: string | null }>(players: T[]): T[][] | null {
  const parsed = players.map((player) => ({ player, pos: parseGrid(player.grid) }));
  if (parsed.some((entry) => entry.pos === null)) return null;

  const rows = new Map<number, Array<{ player: T; col: number }>>();
  for (const entry of parsed) {
    const pos = entry.pos as GridPosition;
    const bucket = rows.get(pos.row) ?? [];
    bucket.push({ player: entry.player, col: pos.col });
    rows.set(pos.row, bucket);
  }

  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, bucket]) => bucket.sort((a, b) => a.col - b.col).map((entry) => entry.player));
}

/** Sin grid, el orden de la lista es el orden de la formación: arquero, defensa, y así. */
function fromFormation<T>(players: T[], rows: number[]): T[][] {
  const grouped: T[][] = [];
  let cursor = 0;
  for (const size of rows) {
    grouped.push(players.slice(cursor, cursor + size));
    cursor += size;
  }
  return grouped;
}

function place<T>(rows: T[][], mirrored: boolean): PlacedPlayer<T>[] {
  const usable = 100 - LARGO_ATRAS - LARGO_ADELANTE;
  const step = rows.length > 1 ? usable / (rows.length - 1) : 0;

  return rows.flatMap((row, rowIndex) => {
    const y = rows.length > 1 ? LARGO_ATRAS + rowIndex * step : 50;
    return row.map((player, colIndex) => {
      const share = (colIndex + 0.5) / row.length;
      const base = COL_ONE_IS_LEFT ? share : 1 - share;
      return {
        player,
        x: Math.round((mirrored ? 1 - base : base) * 1000) / 10,
        y: Math.round(y * 10) / 10,
        row: rowIndex,
      };
    });
  });
}
