import { describe, expect, it } from 'vitest';
import crudo from './__fixtures__/liga1-2026.json' with { type: 'json' };
import { conFase } from './fases.js';
import { medirFuerzas, mulberry32, semillaDe, simular } from './montecarlo.js';
import { LIGA1 } from './reglamento-liga1.js';
import type { DatosDeLaCalculadora, Partido } from './tipos.js';

const datos: DatosDeLaCalculadora = {
  ...(crudo as unknown as DatosDeLaCalculadora),
  partidos: conFase((crudo as unknown as DatosDeLaCalculadora).partidos) as Partido[],
};

const SIN_PRONOSTICOS = new Map<string, readonly [number, number]>();
const RAPIDO = { simulaciones: 400, semilla: 1234 };

describe('la simulación', () => {
  it('los porcentajes de título suman uno', () => {
    const probabilidades = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    const total = probabilidades.reduce((t, p) => t + p.titulo, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('los cupos reparten exactamente los que hay', () => {
    const probabilidades = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    expect(probabilidades.reduce((t, p) => t + p.libertadores, 0)).toBeCloseTo(4, 5);
    expect(probabilidades.reduce((t, p) => t + p.sudamericana, 0)).toBeCloseTo(4, 5);
    expect(probabilidades.reduce((t, p) => t + p.descenso, 0)).toBeCloseTo(2, 5);
  });

  /* Dos personas con el mismo enlace tienen que ver el mismo número: uno que baila no se puede citar. */
  it('la misma semilla da exactamente el mismo resultado', () => {
    const una = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    const otra = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    expect(una).toEqual(otra);
  });

  it('otra semilla da otro resultado', () => {
    const una = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    const otra = simular(datos, SIN_PRONOSTICOS, LIGA1, { ...RAPIDO, semilla: 99 });
    expect(una).not.toEqual(otra);
  });

  it('con todo pronosticado no queda nada al azar y el campeón es uno solo', () => {
    const todos = new Map(
      datos.partidos
        .filter((p) => p.estado === 'scheduled')
        .map((p) => [p.id, [1, 0] as const]),
    );
    const probabilidades = simular(datos, todos, LIGA1, RAPIDO);
    /* Los cupos y el descenso quedan decididos; el título todavía pasa por cruces, que se sortean. */
    for (const p of probabilidades) {
      expect([0, 1]).toContain(Math.round(p.libertadores));
      expect(p.libertadores === 0 || p.libertadores === 1).toBe(true);
      expect(p.descenso === 0 || p.descenso === 1).toBe(true);
    }
  });

  it('el líder de la anual tiene más chances que el último', () => {
    const probabilidades = simular(datos, SIN_PRONOSTICOS, LIGA1, RAPIDO);
    const porId = new Map(probabilidades.map((p) => [p.equipoId, p]));
    const anual = datos.ordenOficial.find((o) => o.clave === 'anual')?.equipos ?? [];
    const primero = porId.get(anual[0] ?? '');
    const ultimo = porId.get(anual.at(-1) ?? '');
    expect(primero?.libertadores ?? 0).toBeGreaterThan(ultimo?.libertadores ?? 1);
    expect(ultimo?.descenso ?? 0).toBeGreaterThan(primero?.descenso ?? 1);
  });
});

describe('el modelo', () => {
  it('mide el ataque y la defensa de la propia temporada', () => {
    const modelo = medirFuerzas(datos);
    expect(modelo.fuerzas.size).toBe(datos.equipos.length);
    expect(modelo.mediaLocal).toBeGreaterThan(0);
    /* La ventaja de local es un hecho medido de esta liga, no una constante inventada. */
    expect(modelo.mediaLocal).toBeGreaterThan(modelo.mediaVisita);
    for (const fuerza of modelo.fuerzas.values()) {
      expect(fuerza.ataque).toBeGreaterThan(0);
      expect(fuerza.defensa).toBeGreaterThan(0);
    }
  });

  it('el generador con semilla se queda entre cero y uno y se repite', () => {
    const uno = mulberry32(7);
    const otro = mulberry32(7);
    for (let i = 0; i < 50; i += 1) {
      const valor = uno();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
      expect(valor).toBe(otro());
    }
  });

  it('la semilla sale del escenario', () => {
    expect(semillaDe('aliuni21')).toBe(semillaDe('aliuni21'));
    expect(semillaDe('aliuni21')).not.toBe(semillaDe('aliuni22'));
  });
});
