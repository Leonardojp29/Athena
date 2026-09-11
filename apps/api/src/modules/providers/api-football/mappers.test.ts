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
} from './mappers.js';
import { mapMatchStatus } from './status-map.js';

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
