import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapEvents,
  mapFixture,
  mapFixtureDetail,
  mapLeague,
  mapLineup,
  mapStandings,
  mapStatistics,
  mapTeam,
  mapTransfers,
  mapTrophies,
  claseDeFichaje,
} from './mappers.js';
import { mapMatchStatus } from './status-map.js';
import type { ApiFootballTransfers, ApiFootballTrophy } from './api-football.types.js';

const fixture = <T>(name: string): T[] =>
  JSON.parse(readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8')).response;

describe('mapLeague', () => {
  it('maps a real /leagues payload to the domain shape', () => {
    const [league] = fixture<Parameters<typeof mapLeague>[0]>('leagues.json');
    const result = mapLeague(league!);

    expect(result.providerRef).toBe('281');
    expect(result.data.name).toBe('Primera División');
    expect(result.data.country).toBe('Peru');
    expect(result.data.format).toBe('league');
    expect(result.data.seasons.length).toBeGreaterThan(0);
    expect(result.data.seasons.at(-1)).toMatchObject({ year: 2026, isCurrent: true });
  });

  it('normalizes country "World" to null for international cups', () => {
    const [league] = fixture<Parameters<typeof mapLeague>[0]>('leagues.json');
    const international = { ...league!, country: { ...league!.country, name: 'World' } };
    expect(mapLeague(international).data.country).toBeNull();
  });
});

describe('mapTeam', () => {
  it('maps a real /teams payload', () => {
    const teams = fixture<Parameters<typeof mapTeam>[0]>('teams.json');
    const result = mapTeam(teams[0]!);

    expect(result.providerRef).toMatch(/^\d+$/);
    expect(result.data.name).toBeTruthy();
    expect(result.data.isNationalTeam).toBe(false);
    expect(result.data.logoUrl).toContain('media.api-sports.io');
  });
});

describe('mapFixture', () => {
  it('maps a real finished fixture', () => {
    const [raw] = fixture<Parameters<typeof mapFixture>[0]>('fixtures.json');
    const result = mapFixture(raw!);

    expect(result.data.competitionRef).toBe('281');
    expect(result.data.seasonYear).toBe(2026);
    expect(result.data.status).toBe('finished');
    expect(result.data.homeScore).not.toBeNull();
    expect(new Date(result.data.kickoffUtc).getTime()).not.toBeNaN();
    expect(result.data.homeTeamRef).toMatch(/^\d+$/);
  });
});

describe('mapEvents', () => {
  it('maps real events preserving actors and minutes', () => {
    const raws = fixture<never>('events.json');
    const events = mapEvents('1505729', raws);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.matchRef).toBe('1505729');
      expect(event.minute).toBeGreaterThanOrEqual(0);
      expect([
        'goal',
        'own_goal',
        'penalty_goal',
        'missed_penalty',
        'yellow_card',
        'red_card',
        'substitution',
        'var',
      ]).toContain(event.kind);
    }
  });
});

describe('mapLineup', () => {
  /*
   * Verificado contra el fixture 1515157: en los partidos sin alineación publicada el proveedor
   * devuelve equipo, técnico y formación, y las claves de los jugadores no existen. Con `.map()`
   * a secas el backfill perdía el partido entero por un TypeError.
   */
  it('sobrevive a una alineación sin jugadores', () => {
    const lineup = mapLineup({
      team: { id: 1234 },
      formation: null,
      coach: { id: 9, name: 'Sin datos' },
    });

    expect(lineup.startXi).toEqual([]);
    expect(lineup.substitutes).toEqual([]);
    expect(lineup.coachName).toBe('Sin datos');
  });
});

describe('mapStatistics', () => {
  it('sobrevive a un partido sin bloque de estadísticas', () => {
    const stats = mapStatistics({ team: { id: 1234 } });

    expect(stats.teamRef).toBe('1234');
    expect(stats.possessionPercent).toBeNull();
  });
});

describe('mapStandings', () => {
  it('etiqueta los grupos cuando la liga tiene varias tablas (Apertura/Clausura)', () => {
    const [raw] = fixture<Parameters<typeof mapStandings>[0]>('standings-groups.json');
    const rows = mapStandings(raw!);

    const labels = [...new Set(rows.map((r) => r.groupLabel))];
    expect(labels).toEqual(['Apertura', 'Clausura']);
    expect(rows.every((r) => r.position > 0 && r.played >= 0)).toBe(true);
  });

  it('deja el grupo vacío cuando hay una sola tabla', () => {
    const [raw] = fixture<Parameters<typeof mapStandings>[0]>('standings-single.json');
    const rows = mapStandings(raw!);

    expect(rows.every((r) => r.groupLabel === '')).toBe(true);
    expect(rows[0]?.teamRef).toMatch(/^\d+$/);
  });
});

describe('mapMatchStatus', () => {
  it.each([
    ['NS', 'scheduled'],
    ['1H', 'in_play'],
    ['HT', 'paused'],
    ['FT', 'finished'],
    ['AET', 'finished'],
    ['PEN', 'finished'],
    ['PST', 'postponed'],
    ['CANC', 'cancelled'],
    ['WO', 'awarded'],
  ])('%s → %s', (short, expected) => {
    expect(mapMatchStatus(short)).toBe(expected);
  });

  it('defaults unknown statuses to scheduled', () => {
    expect(mapMatchStatus('???')).toBe('scheduled');
  });
});

describe('mapFixtureDetail', () => {
  const detalles = () =>
    fixture<Parameters<typeof mapFixtureDetail>[0]>('fixtures-ids.json').map(mapFixtureDetail);

  it('un partido terminado llega con sus cuatro facetas en un solo pedido', () => {
    const terminado = detalles().find((d) => d.match.providerRef === '1635628');

    expect(terminado?.match.data.status).toBe('finished');
    expect(terminado?.events?.length).toBeGreaterThan(0);
    expect(terminado?.lineups?.length).toBe(2);
    expect(terminado?.statistics?.length).toBe(2);
    expect(terminado?.playerStatistics?.length).toBeGreaterThan(0);
    expect(terminado?.lineups?.[0]?.formation).toBe('4-3-3');
    expect(terminado?.statistics?.[0]?.possessionPercent).toBeGreaterThan(0);
  });

  it('un partido por empezar ya tiene alineación y todavía no tiene eventos', () => {
    const programado = detalles().find((d) => d.match.providerRef === '1552162');

    expect(programado?.match.data.status).toBe('scheduled');
    expect(programado?.events).toEqual([]);
    expect(programado?.lineups?.length).toBe(2);
  });

  /* Una faceta que el proveedor no manda no es una faceta vacía: la primera se reintenta, la segunda no. */
  it('distingue la faceta ausente de la faceta vacía', () => {
    const sinFacetas = mapFixtureDetail({
      ...fixture<Parameters<typeof mapFixtureDetail>[0]>('fixtures-ids.json')[0]!,
      events: undefined,
      lineups: undefined,
      statistics: undefined,
      players: undefined,
    });

    expect(sinFacetas.events).toBeNull();
    expect(sinFacetas.lineups).toBeNull();
    expect(sinFacetas.statistics).toBeNull();
    expect(sinFacetas.playerStatistics).toBeNull();
  });
});

describe('mapTrophies', () => {
  const rows = fixture<ApiFootballTrophy>('trophies.json');

  it('traduce el puesto y conserva el torneo tal como lo nombra el proveedor', () => {
    const palmares = mapTrophies('10401', rows);
    expect(palmares.length).toBeGreaterThan(0);
    expect(new Set(palmares.map((t) => t.puesto))).toEqual(new Set(['campeon', 'subcampeon']));
    expect(palmares.every((t) => t.competencia.length > 0)).toBe(true);
    expect(palmares.every((t) => t.playerRef === '10401')).toBe(true);
  });

  /* Casi la mitad de las filas reales viene sin año: si eso rompiera, el palmarés quedaría a medias. */
  it('acepta un título sin temporada', () => {
    const palmares = mapTrophies('1', [
      { league: 'Copa América', country: 'World', season: null, place: 'Winner' },
    ]);
    expect(palmares).toEqual([
      { playerRef: '1', competencia: 'Copa América', pais: 'World', temporada: null, puesto: 'campeon' },
    ]);
  });

  /* El proveedor repite la misma Supercopa dos veces en la misma temporada. */
  it('no repite el mismo título dos veces', () => {
    const repetido = { league: 'Super Cup', country: 'Saudi Arabia', season: '2023/2024', place: 'Winner' };
    expect(mapTrophies('1', [repetido, { ...repetido }])).toHaveLength(1);
  });

  /* Un renglón que no se sabe qué es vale menos que un renglón menos. */
  it('descarta lo que no se puede interpretar', () => {
    expect(
      mapTrophies('1', [
        { league: null, country: 'X', season: '2020', place: 'Winner' },
        { league: 'Liga', country: 'X', season: '2020', place: 'Semi-finalist' },
        { league: 'Liga', country: 'X', season: '2020', place: null },
      ]),
    ).toEqual([]);
  });
});

describe('claseDeFichaje', () => {
  /* Las doce variantes que el proveedor usa de verdad, medidas sobre un solo club. */
  it.each([
    ['Loan', 'prestamo', null],
    ['Back from Loan', 'vuelve-de-prestamo', null],
    ['Return from loan', 'vuelve-de-prestamo', null],
    ['Free', 'libre', null],
    ['Free agent', 'libre', null],
    ['Free Transfer', 'libre', null],
    ['Transfer', 'traspaso', null],
    ['€ 1.5M', 'traspaso', '€ 1.5M'],
    ['€ 3.5M', 'traspaso', '€ 3.5M'],
    ['N/A', 'desconocido', null],
    ['-', 'desconocido', null],
    [null, 'desconocido', null],
  ])('%s → %s', (entrada, clase, monto) => {
    expect(claseDeFichaje(entrada)).toEqual({ clase, monto });
  });

  /* "Free Transfer" lleva las dos palabras: gana libre, que es lo que describe el movimiento. */
  it('libre le gana a traspaso cuando aparecen juntos', () => {
    expect(claseDeFichaje('Free Transfer').clase).toBe('libre');
  });
});

describe('mapTransfers', () => {
  const rows = fixture<ApiFootballTransfers>('transfers.json');

  it('aplana el historial de cada jugador en movimientos sueltos', () => {
    const movimientos = mapTransfers(rows);
    expect(movimientos.length).toBeGreaterThan(rows.length);
    expect(movimientos.every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.fecha))).toBe(true);
    expect(movimientos.every((m) => m.entraANombre && m.saleDeNombre)).toBe(true);
  });

  /* Un movimiento sin fecha no se puede ordenar ni desempatar: no entra. */
  it('descarta un movimiento incompleto', () => {
    expect(
      mapTransfers([
        {
          player: { id: 1, name: 'X' },
          transfers: [
            { date: null, type: 'Loan', teams: { in: { id: 2, name: 'A' }, out: { id: 3, name: 'B' } } },
            { date: '2026-01-01', type: 'Loan', teams: { in: { id: 2, name: null }, out: { id: 3, name: 'B' } } },
          ],
        },
      ]),
    ).toEqual([]);
  });

  /* El club de afuera casi nunca está en Athena: el nombre siempre, el id cuando se puede. */
  it('conserva el nombre del club aunque el proveedor no mande su id', () => {
    const [uno] = mapTransfers([
      {
        player: { id: 7, name: 'X' },
        transfers: [
          { date: '2026-03-01', type: 'Free', teams: { in: { id: null, name: 'Sport Boys' }, out: { id: 9, name: 'Alianza' } } },
        ],
      },
    ]);
    expect(uno).toMatchObject({ entraARef: null, entraANombre: 'Sport Boys', saleDeRef: '9', clase: 'libre' });
  });
});

describe('mapTransfers · el mismo pase dos veces', () => {
  const dosVeces = (unaFecha: string, otraFecha: string): ApiFootballTransfers[] => [
    {
      player: { id: 10, name: 'Y. Diomande' },
      transfers: [
        { date: unaFecha, type: 'Transfer', teams: { in: { id: 1, name: 'Real Madrid' }, out: { id: 2, name: 'RB Leipzig' } } },
        { date: otraFecha, type: 'Transfer', teams: { in: { id: 1, name: 'Real Madrid' }, out: { id: 2, name: 'RB Leipzig' } } },
      ],
    },
  ];

  /*
   * El proveedor publica el anuncio y la fecha efectiva como dos movimientos: 3.026 pases
   * repetidos sobre veintidós mil, todos a uno o dos días.
   */
  it('junta dos fechas contiguas en un solo movimiento', () => {
    const movimientos = mapTransfers(dosVeces('2026-08-04', '2026-08-05'));
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0]!.fecha).toBe('2026-08-04');
  });

  it('el criterio no depende del orden en que lleguen', () => {
    expect(mapTransfers(dosVeces('2026-08-05', '2026-08-04'))[0]!.fecha).toBe('2026-08-04');
  });

  /* Un préstamo de ida y vuelta al mismo club es otro pase, y nunca ocurre en la misma semana. */
  it('no junta dos pases entre los mismos clubes en fechas lejanas', () => {
    expect(mapTransfers(dosVeces('2024-01-10', '2026-08-05'))).toHaveLength(2);
  });
});

describe('mapTrophies · la fila sin año que repite', () => {
  /*
   * El proveedor manda "La Liga 2009/2010" y otra vez "La Liga" sin temporada. En Messi eso
   * duplicaba veinte títulos en un bloque al pie que parecía un palmarés paralelo.
   */
  it('descarta el título sin año cuando el mismo ya está fechado', () => {
    const palmares = mapTrophies('1', [
      { league: 'La Liga', country: 'Spain', season: '2009/2010', place: 'Winner' },
      { league: 'La Liga', country: 'Spain', season: null, place: 'Winner' },
    ]);
    expect(palmares).toHaveLength(1);
    expect(palmares[0]!.temporada).toBe('2009/2010');
  });

  /* Si es el único registro de ese torneo, se queda: sin él el título desaparecería. */
  it('conserva el título sin año cuando es el único de ese torneo', () => {
    const palmares = mapTrophies('1', [
      { league: 'Copa Catalunya', country: 'Spain', season: null, place: 'Winner' },
    ]);
    expect(palmares).toHaveLength(1);
  });

  /* Ganar y perder el mismo torneo son dos cosas: el resumen de una no tapa a la otra. */
  it('el puesto distingue: un subcampeonato sin año sobrevive a un título fechado', () => {
    const palmares = mapTrophies('1', [
      { league: 'La Liga', country: 'Spain', season: '2010', place: 'Winner' },
      { league: 'La Liga', country: 'Spain', season: null, place: '2nd Place' },
    ]);
    expect(palmares).toHaveLength(2);
  });
});
