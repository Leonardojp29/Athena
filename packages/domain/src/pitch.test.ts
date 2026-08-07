import { describe, expect, it } from 'vitest';
import { layout, parseGrid, rowsFromFormation } from './pitch.js';

/* Grids reales tomados de match_lineups: el proveedor los lista en columna descendente. */
const GRID_4_3_3 = [
  '1:1',
  '2:4',
  '2:3',
  '2:2',
  '2:1',
  '3:3',
  '3:2',
  '3:1',
  '4:3',
  '4:2',
  '4:1',
];
const GRID_4_2_1_3 = [
  '1:1',
  '2:4',
  '2:3',
  '2:2',
  '2:1',
  '3:2',
  '3:1',
  '4:1',
  '5:3',
  '5:2',
  '5:1',
];

const conGrid = (grids: string[]) => grids.map((grid, i) => ({ grid, id: i }));

describe('parseGrid', () => {
  it('lee fila y columna', () => {
    expect(parseGrid('3:2')).toEqual({ row: 3, col: 2 });
  });

  it('tolera espacios', () => {
    expect(parseGrid(' 2:1 ')).toEqual({ row: 2, col: 1 });
  });

  it('rechaza lo que no es una posición', () => {
    for (const valor of [null, undefined, '', '3', '3:', 'a:b', '0:1', '3:0', '3:2:1']) {
      expect(parseGrid(valor)).toBeNull();
    }
  });
});

describe('rowsFromFormation', () => {
  it('agrega el arquero adelante', () => {
    expect(rowsFromFormation('4-3-3')).toEqual([1, 4, 3, 3]);
    expect(rowsFromFormation('4-2-3-1')).toEqual([1, 4, 2, 3, 1]);
    expect(rowsFromFormation('3-5-2')).toEqual([1, 3, 5, 2]);
  });

  it('acepta el guion largo que a veces manda el proveedor', () => {
    expect(rowsFromFormation('4–4–2')).toEqual([1, 4, 4, 2]);
  });

  it('rechaza formaciones que no suman diez de campo', () => {
    for (const valor of [null, '', '4-3-4', '11', 'x-y-z', '4-3-3-1']) {
      expect(rowsFromFormation(valor)).toBeNull();
    }
  });
});

describe('layout', () => {
  it('ubica once jugadores en cuatro líneas con un 4-3-3', () => {
    const placed = layout(conGrid(GRID_4_3_3));
    expect(placed).not.toBeNull();
    expect(placed).toHaveLength(11);
    expect(new Set(placed?.map((p) => p.row)).size).toBe(4);
  });

  it('pone al arquero atrás y a los delanteros adelante', () => {
    const placed = layout(conGrid(GRID_4_3_3)) ?? [];
    const arquero = placed[0];
    const delanteros = placed.filter((p) => p.row === 3);
    expect(arquero?.y).toBeLessThan(delanteros[0]?.y ?? 0);
    expect(arquero?.x).toBe(50);
  });

  it('reparte una línea de cuatro simétricamente', () => {
    const placed = layout(conGrid(GRID_4_3_3)) ?? [];
    const defensa = placed.filter((p) => p.row === 1).map((p) => p.x);
    expect(defensa).toHaveLength(4);
    expect([...defensa].sort((a, b) => a - b)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });

  it('respeta las cinco líneas de un 4-2-1-3', () => {
    const placed = layout(conGrid(GRID_4_2_1_3)) ?? [];
    expect(new Set(placed.map((p) => p.row)).size).toBe(5);
    expect(placed.filter((p) => p.row === 2)).toHaveLength(2);
    expect(placed.filter((p) => p.row === 3)).toHaveLength(1);
  });

  /*
   * La orientación es lo único de este archivo que no se puede deducir leyendo el código: hay
   * que mirar un partido real. Verificado con el fixture 1549430 (Cienciano 2-0 Universitario),
   * donde `2:1` era Inga, lateral izquierdo, y `2:4` Polo por derecha.
   */
  it('pone la columna 1 en la banda izquierda del equipo', () => {
    const defensa = (layout(conGrid(GRID_4_3_3)) ?? [])
      .filter((p) => p.row === 1)
      .sort((a, b) => a.x - b.x);
    expect(defensa[0]?.player.grid).toBe('2:1');
    expect(defensa.at(-1)?.player.grid).toBe('2:4');
  });

  it('espeja el eje transversal sin mover las filas', () => {
    const normal = layout(conGrid(GRID_4_3_3)) ?? [];
    const espejado = layout(conGrid(GRID_4_3_3), { mirrored: true }) ?? [];
    for (const [i, p] of normal.entries()) {
      expect(espejado[i]?.y).toBe(p.y);
      expect((espejado[i]?.x ?? 0) + p.x).toBeCloseTo(100, 5);
    }
  });

  it('cae en la formación cuando falta un grid', () => {
    const sinGrid = Array.from({ length: 11 }, (_, i) => ({ grid: null, id: i }));
    const placed = layout(sinGrid, { formation: '4-4-2' });
    expect(placed).toHaveLength(11);
    expect(new Set(placed?.map((p) => p.row)).size).toBe(4);
  });

  it('un solo grid faltante manda todo a la formación, no a medias', () => {
    const casi = conGrid(GRID_4_3_3).map((p, i) => (i === 5 ? { ...p, grid: null } : p));
    expect(layout(casi, { formation: '4-3-3' })).toHaveLength(11);
    expect(layout(casi)).toBeNull();
  });

  it('devuelve null cuando la formación no coincide con la cantidad de jugadores', () => {
    const nueve = Array.from({ length: 9 }, (_, i) => ({ grid: null, id: i }));
    expect(layout(nueve, { formation: '4-3-3' })).toBeNull();
  });

  it('devuelve null sin jugadores', () => {
    expect(layout([])).toBeNull();
  });

  it('nadie queda pisando la línea de gol ni la mitad', () => {
    const placed = layout(conGrid(GRID_4_2_1_3)) ?? [];
    for (const p of placed) {
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(100);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(100);
    }
  });

  /*
   * Con los dos equipos enfrentados, la mitad de cada uno ocupa 0–50 de la cancha. Si la
   * línea más adelantada llega a 100 los volantes centrales se pisan; el margen es lo que
   * mantiene separadas las dos mitades y por eso vale un test.
   */
  it('deja aire antes de la mitad de la cancha', () => {
    for (const grids of [GRID_4_3_3, GRID_4_2_1_3]) {
      const placed = layout(conGrid(grids)) ?? [];
      const masAdelantado = Math.max(...placed.map((p) => p.y));
      expect(masAdelantado).toBeLessThanOrEqual(88);
      expect(Math.min(...placed.map((p) => p.y))).toBeGreaterThanOrEqual(7);
    }
  });
});
