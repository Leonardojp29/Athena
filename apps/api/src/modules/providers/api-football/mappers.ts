import type {
  MatchEventKind,
  PlayerPosition,
  ProviderCompetition,
  ProviderLineup,
  ProviderLineupPlayer,
  ProviderMatch,
  ProviderMatchEvent,
  ProviderMatchStatistics,
  ProviderPlayer,
  ProviderRef,
  ProviderStanding,
  ProviderTeam,
} from '@athena/domain';
import type {
  ApiFootballEvent,
  ApiFootballFixture,
  ApiFootballLeague,
  ApiFootballLineup,
  ApiFootballSquad,
  ApiFootballStandings,
  ApiFootballStatistics,
  ApiFootballTeam,
} from './api-football.types.js';
import { mapMatchStatus } from './status-map.js';

export function mapLeague(raw: ApiFootballLeague): ProviderRef<ProviderCompetition> {
  return {
    providerRef: String(raw.league.id),
    data: {
      name: raw.league.name,
      country: raw.country.name === 'World' ? null : raw.country.name,
      format: raw.league.type === 'Cup' ? 'cup' : 'league',
      logoUrl: raw.league.logo,
      seasons: raw.seasons.map((s) => ({
        year: s.year,
        startDate: s.start ?? null,
        endDate: s.end ?? null,
        isCurrent: s.current,
      })),
    },
  };
}

export function mapTeam(raw: ApiFootballTeam): ProviderRef<ProviderTeam> {
  return {
    providerRef: String(raw.team.id),
    data: {
      name: raw.team.name,
      shortName: raw.team.code,
      country: raw.team.country,
      founded: raw.team.founded,
      isNationalTeam: raw.team.national,
      logoUrl: raw.team.logo,
    },
  };
}

const POSITION_MAP: Record<string, PlayerPosition> = {
  Goalkeeper: 'goalkeeper',
  Defender: 'defender',
  Midfielder: 'midfielder',
  Attacker: 'attacker',
};

export function mapSquad(raw: ApiFootballSquad): ProviderRef<ProviderPlayer>[] {
  return raw.players.map((p) => ({
    providerRef: String(p.id),
    data: {
      name: p.name,
      fullName: null,
      birthDate: null,
      nationality: null,
      heightCm: null,
      position: p.position ? (POSITION_MAP[p.position] ?? null) : null,
      photoUrl: p.photo,
    },
  }));
}

export function mapFixture(raw: ApiFootballFixture): ProviderRef<ProviderMatch> {
  return {
    providerRef: String(raw.fixture.id),
    data: {
      competitionRef: String(raw.league.id),
      seasonYear: raw.league.season,
      round: raw.league.round,
      homeTeamRef: String(raw.teams.home.id),
      awayTeamRef: String(raw.teams.away.id),
      kickoffUtc: new Date(raw.fixture.date).toISOString(),
      status: mapMatchStatus(raw.fixture.status.short),
      statusDetail: raw.fixture.status.short,
      elapsedMinutes: raw.fixture.status.elapsed,
      homeScore: raw.goals.home,
      awayScore: raw.goals.away,
    },
  };
}

export function mapStandings(raw: ApiFootballStandings): ProviderStanding[] {
  return raw.league.standings.flat().map((row) => ({
    teamRef: String(row.team.id),
    groupLabel: raw.league.standings.length > 1 ? (row.group ?? '') : '',
    position: row.rank,
    points: row.points,
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    form: row.form,
  }));
}

/** "45%" → 45, 12 → 12, null/"" → null. El proveedor mezcla números y strings con unidad. */
function statNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace('%', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapStatistics(raw: ApiFootballStatistics): ProviderMatchStatistics {
  const byType = new Map(raw.statistics.map((item) => [item.type, item.value]));
  const get = (type: string): number | null => statNumber(byType.get(type));

  return {
    teamRef: String(raw.team.id),
    possessionPercent: get('Ball Possession'),
    shotsTotal: get('Total Shots'),
    shotsOnGoal: get('Shots on Goal'),
    shotsOffGoal: get('Shots off Goal'),
    shotsBlocked: get('Blocked Shots'),
    corners: get('Corner Kicks'),
    offsides: get('Offsides'),
    fouls: get('Fouls'),
    yellowCards: get('Yellow Cards'),
    redCards: get('Red Cards'),
    goalkeeperSaves: get('Goalkeeper Saves'),
    passesTotal: get('Total passes'),
    passesAccurate: get('Passes accurate'),
    passesPercent: get('Passes %'),
    expectedGoals: get('expected_goals'),
    raw: Object.fromEntries(byType),
  };
}

const LINEUP_POSITION: Record<string, string> = {
  G: 'arquero',
  D: 'defensor',
  M: 'mediocampista',
  F: 'delantero',
};

export function mapLineup(raw: ApiFootballLineup): ProviderLineup {
  const mapPlayer = (entry: ApiFootballLineup['startXI'][number]): ProviderLineupPlayer => ({
    playerRef: entry.player.id === null ? null : String(entry.player.id),
    name: entry.player.name,
    number: entry.player.number,
    position: entry.player.pos ? (LINEUP_POSITION[entry.player.pos] ?? entry.player.pos) : null,
    grid: entry.player.grid,
  });

  return {
    teamRef: String(raw.team.id),
    formation: raw.formation,
    coachName: raw.coach?.name ?? null,
    startXi: raw.startXI.map(mapPlayer),
    substitutes: raw.substitutes.map(mapPlayer),
  };
}

function mapEventKind(raw: ApiFootballEvent): MatchEventKind | null {
  switch (raw.type) {
    case 'Goal':
      if (raw.detail === 'Own Goal') return 'own_goal';
      if (raw.detail === 'Penalty') return 'penalty_goal';
      if (raw.detail === 'Missed Penalty') return 'missed_penalty';
      return 'goal';
    case 'Card':
      if (raw.detail === 'Yellow Card') return 'yellow_card';
      return 'red_card';
    case 'subst':
      return 'substitution';
    case 'Var':
      return 'var';
    default:
      return null;
  }
}

export function mapEvents(matchRef: string, raws: ApiFootballEvent[]): ProviderMatchEvent[] {
  return raws.flatMap((raw) => {
    const kind = mapEventKind(raw);
    if (!kind) return [];
    return [
      {
        matchRef,
        kind,
        minute: raw.time.elapsed,
        extraMinute: raw.time.extra,
        teamRef: String(raw.team.id),
        playerRef: raw.player.id === null ? null : String(raw.player.id),
        relatedPlayerRef: raw.assist.id === null ? null : String(raw.assist.id),
        // los nombres viajan en detail porque los jugadores aún no se sincronizan como entidades
        detail: {
          label: raw.detail,
          comments: raw.comments,
          playerName: raw.player.name,
          relatedPlayerName: raw.assist.name,
        },
      },
    ];
  });
}
