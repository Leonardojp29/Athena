import { describe, expect, it } from 'vitest';
import { agruparPorHora, ahoraYProximos, cargaDelDia, enCuanto, realceDe, type Puestos } from './calendario';
import type { MatchCard } from './api';

const equipo = (slug: string) => ({
  id: `id-${slug}`,
  name: slug,
  shortName: null,
  slug,
  logoUrl: null,
});

const competencia = (slug: string) => ({
  id: `c-${slug}`,
  name: slug,
  slug,
  logoUrl: null,
  country: 'Peru',
  countryCode: 'PE',
  flagUrl: null,
  continent: 'sudamerica',
  format: 'league',
});

const partido = (
  id: string,
  kickoffUtc: string,
  extra: Partial<MatchCard> = {},
): MatchCard => ({
  id,
  kickoffUtc,
  status: 'scheduled',
  statusDetail: null,
  elapsedMinutes: null,
  round: null,
  homeScore: null,
  awayScore: null,
  homeTeam: equipo('local'),
  awayTeam: equipo('visita'),
  season: { year: 2026, competition: competencia('primera-division') },
  ...extra,
});

describe('agruparPorHora', () => {
  /* Lima es UTC-5: las 15:30 UTC son las 10:30 de acá y el bloque es el de las 10. */
  it('agrupa por la hora en punto de Lima, no por la del servidor', () => {
    const bloques = agruparPorHora([
      partido('a', '2026-09-12T15:30:00.000Z'),
      partido('b', '2026-09-12T15:45:00.000Z'),
      partido('c', '2026-09-13T01:00:00.000Z'),
    ]);
    expect(bloques.map((b) => b.etiqueta)).toEqual(['10:00', '20:00']);
    expect(bloques[0]!.partidos).toHaveLength(2);
  });

  it('ordena los partidos de un bloque por su horario exacto', () => {
    const bloques = agruparPorHora([
      partido('tarde', '2026-09-12T15:45:00.000Z'),
      partido('temprano', '2026-09-12T15:00:00.000Z'),
    ]);
    expect(bloques[0]!.partidos.map((p) => p.id)).toEqual(['temprano', 'tarde']);
  });

  it('cuenta lo que rueda y lo que ya terminó', () => {
    const bloques = agruparPorHora([
      partido('vivo', '2026-09-12T15:00:00.000Z', { status: 'in_play' }),
      partido('listo', '2026-09-12T15:10:00.000Z', { status: 'finished' }),
      partido('espera', '2026-09-12T15:20:00.000Z'),
    ]);
    expect(bloques[0]).toMatchObject({ vivos: 1, terminados: 1 });
  });
});

describe('cargaDelDia', () => {
  it('devuelve las veinticuatro horas, también las vacías', () => {
    const horas = cargaDelDia([partido('a', '2026-09-12T15:30:00.000Z')]);
    expect(horas).toHaveLength(24);
    expect(horas[10]).toBe(1);
    expect(horas[11]).toBe(0);
  });
});

describe('ahoraYProximos', () => {
  const ahora = new Date('2026-09-12T18:00:00.000Z');

  it('separa lo que rueda de lo que arranca', () => {
    const r = ahoraYProximos(
      [
        partido('vivo', '2026-09-12T17:00:00.000Z', { status: 'in_play' }),
        partido('luego', '2026-09-12T19:00:00.000Z'),
      ],
      ahora,
    );
    expect(r.enJuego.map((m) => m.id)).toEqual(['vivo']);
    expect(r.proximos.map((m) => m.id)).toEqual(['luego']);
    expect(r.faltan).toBe(60);
  });

  /* Los que arrancan juntos son un bloque: mostrar tres de seis sería elegir por el lector. */
  it('trae todos los que arrancan a la misma hora, no un puñado', () => {
    const r = ahoraYProximos(
      [
        partido('a', '2026-09-12T19:00:00.000Z'),
        partido('b', '2026-09-12T19:00:00.000Z'),
        partido('c', '2026-09-12T19:00:00.000Z'),
        partido('d', '2026-09-12T21:00:00.000Z'),
      ],
      ahora,
    );
    expect(r.proximos.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('sin nada por jugar no inventa un próximo', () => {
    const r = ahoraYProximos([partido('viejo', '2026-09-12T10:00:00.000Z', { status: 'finished' })], ahora);
    expect(r.proximos).toEqual([]);
    expect(r.faltan).toBeNull();
  });
});

describe('enCuanto', () => {
  it('escribe la espera como la diría alguien', () => {
    expect(enCuanto(0)).toBe('ya mismo');
    expect(enCuanto(40)).toBe('en 40 min');
    expect(enCuanto(60)).toBe('en 1 h');
    expect(enCuanto(135)).toBe('en 2 h 15');
  });
});

describe('realceDe', () => {
  const sinTabla: Puestos = {};

  it('reconoce un clásico declarado, en los dos sentidos', () => {
    const uno = partido('a', '2026-09-12T20:00:00.000Z', {
      homeTeam: equipo('alianza-lima'),
      awayTeam: equipo('universitario'),
    });
    const otro = partido('b', '2026-09-12T20:00:00.000Z', {
      homeTeam: equipo('universitario'),
      awayTeam: equipo('alianza-lima'),
    });
    expect(realceDe(uno, sinTabla)?.motivo).toBe('clasico');
    expect(realceDe(otro, sinTabla)?.motivo).toBe('clasico');
  });

  it('marca de cuartos en adelante y no las rondas de entrada', () => {
    const semi = partido('s', '2026-09-12T20:00:00.000Z', { round: 'Semi-finals' });
    const octavos = partido('o', '2026-09-12T20:00:00.000Z', { round: 'Round of 16' });
    expect(realceDe(semi, sinTabla)).toMatchObject({ motivo: 'definicion', etiqueta: 'Semifinales' });
    expect(realceDe(octavos, sinTabla)).toBeNull();
  });

  it('marca un duelo de arriba y dice los dos puestos', () => {
    const p = partido('p', '2026-09-12T20:00:00.000Z');
    expect(realceDe(p, { p: { local: 1, visita: 2 } })).toMatchObject({
      motivo: 'punta',
      etiqueta: '1º contra 2º',
    });
  });

  /* Un mitad de tabla contra un colista no es un partido grande, y decir que lo es es mentir. */
  it('no realza un partido cualquiera', () => {
    const p = partido('p', '2026-09-12T20:00:00.000Z');
    expect(realceDe(p, { p: { local: 11, visita: 14 } })).toBeNull();
    expect(realceDe(p, sinTabla)).toBeNull();
  });

  /* Un clásico es un clásico aunque los dos anden últimos: manda sobre la tabla. */
  it('el clásico manda sobre el puesto', () => {
    const p = partido('p', '2026-09-12T20:00:00.000Z', {
      homeTeam: equipo('boca-juniors'),
      awayTeam: equipo('river-plate'),
    });
    expect(realceDe(p, { p: { local: 1, visita: 2 } })?.motivo).toBe('clasico');
  });
});
