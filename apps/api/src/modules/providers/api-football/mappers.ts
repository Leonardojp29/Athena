import type {
  MatchEventKind,
  PlayerPosition,
  ProviderCompetition,
  ProviderMatchPlayerStats,
  ProviderSeasonPlayer,
  ProviderVenue,
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
  ApiFootballFixturePlayers,
  ApiFootballLeague,
  ApiFootballLineup,
  ApiFootballSeasonPlayer,
  ApiFootballSquad,
  ApiFootballStandings,
  ApiFootballStatistics,
  ApiFootballTeam,
  ApiFootballVenue,
} from './api-football.types.js';
import { mapMatchStatus } from './status-map.js';

export function mapLeague(raw: ApiFootballLeague): ProviderRef<ProviderCompetition> {
  return {
    providerRef: String(raw.league.id),
    data: {
      name: raw.league.name,
      country: raw.country.name === 'World' ? null : raw.country.name,
      countryCode: raw.country.name === 'World' ? null : (raw.country.code ?? null),
      flagUrl: raw.country.name === 'World' ? null : (raw.country.flag ?? null),
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

/** El estadio viaja dentro de /teams y /fixtures: no cuesta un request propio. */
export function mapVenue(raw: ApiFootballVenue | undefined): ProviderRef<ProviderVenue> | null {
  if (!raw?.id || !raw.name) return null;
  return {
    providerRef: String(raw.id),
    data: {
      name: raw.name,
      city: raw.city ?? null,
      country: raw.country ?? null,
      capacity: raw.capacity ?? null,
      imageUrl: raw.image ?? null,
      surface: raw.surface ?? null,
      address: raw.address ?? null,
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
      venue: mapVenue(raw.venue),
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
      venue: mapVenue(raw.fixture.venue),
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
  const byType = new Map((raw.statistics ?? []).map((item) => [item.type, item.value]));
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

/** "ff0000" sí, "" o "None" no: el proveedor manda las dos cosas. */
function hex(valor: string | null | undefined): string | null {
  return typeof valor === 'string' && /^[0-9a-fA-F]{6}$/.test(valor) ? valor.toLowerCase() : null;
}

const LINEUP_POSITION: Record<string, string> = {
  G: 'arquero',
  D: 'defensor',
  M: 'mediocampista',
  F: 'delantero',
};

export function mapLineup(raw: ApiFootballLineup): ProviderLineup {
  type Entrada = NonNullable<ApiFootballLineup['startXI']>[number];
  const mapPlayer = (entry: Entrada): ProviderLineupPlayer => ({
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
    colors: {
      primary: hex(raw.team.colors?.player?.primary),
      secondary: hex(raw.team.colors?.player?.number),
    },
    startXi: (raw.startXI ?? []).map(mapPlayer),
    substitutes: (raw.substitutes ?? []).map(mapPlayer),
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

function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace('%', '').trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function floatOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapFixturePlayers(raws: ApiFootballFixturePlayers[]): ProviderMatchPlayerStats[] {
  return raws.flatMap((entry) =>
    entry.players.flatMap((row) => {
      // sin id del proveedor no hay forma de vincularlo a un jugador de Athena
      if (row.player.id === null) return [];
      const s = row.statistics[0];
      if (!s) return [];

      return [
        {
          teamRef: String(entry.team.id),
          playerRef: String(row.player.id),
          name: row.player.name,
          photoUrl: row.player.photo,
          shirtNumber: s.games?.number ?? null,
          position: s.games?.position ?? null,
          isStarter: s.games?.substitute === false,
          minutesPlayed: s.games?.minutes ?? null,
          rating: floatOrNull(s.games?.rating),
          captain: s.games?.captain === true,
          goals: s.goals?.total ?? null,
          goalsConceded: s.goals?.conceded ?? null,
          assists: s.goals?.assists ?? null,
          saves: s.goals?.saves ?? null,
          shotsTotal: s.shots?.total ?? null,
          shotsOnTarget: s.shots?.on ?? null,
          passesTotal: s.passes?.total ?? null,
          passesKey: s.passes?.key ?? null,
          passesAccurate: intOrNull(s.passes?.accuracy),
          tacklesTotal: s.tackles?.total ?? null,
          interceptions: s.tackles?.interceptions ?? null,
          duelsTotal: s.duels?.total ?? null,
          duelsWon: s.duels?.won ?? null,
          dribblesTotal: s.dribbles?.attempts ?? null,
          dribblesSuccess: s.dribbles?.success ?? null,
          foulsCommitted: s.fouls?.committed ?? null,
          foulsDrawn: s.fouls?.drawn ?? null,
          yellowCards: s.cards?.yellow ?? null,
          redCards: s.cards?.red ?? null,
          penaltyScored: s.penalty?.scored ?? null,
          penaltyMissed: s.penalty?.missed ?? null,
          penaltySaved: s.penalty?.saved ?? null,
          raw: s as unknown as Record<string, unknown>,
        },
      ];
    }),
  );
}

/**
 * Un jugador puede traer varios bloques (préstamos, otras competencias): solo interesa
 * el de la liga y temporada pedidas, que es el que corresponde a esta sincronización.
 */
export function mapSeasonPlayers(
  raws: ApiFootballSeasonPlayer[],
  competitionRef: string,
  seasonYear: number,
): ProviderSeasonPlayer[] {
  return raws.flatMap((raw) => {
    const block = raw.statistics.find(
      (s) => String(s.league?.id) === competitionRef && s.league?.season === seasonYear,
    );
    if (!block?.team?.id) return [];

    const fullName = [raw.player.firstname, raw.player.lastname].filter(Boolean).join(' ');
    const rawPosition = block.games?.position ?? null;

    return [
      {
        player: {
          providerRef: String(raw.player.id),
          data: {
            name: raw.player.name,
            fullName: fullName || null,
            birthDate: raw.player.birth?.date ?? null,
            nationality: raw.player.nationality,
            heightCm: intOrNull(raw.player.height?.replace(' cm', '')),
            position: rawPosition ? (POSITION_MAP[rawPosition] ?? null) : null,
            photoUrl: raw.player.photo,
          },
        },
        teamRef: String(block.team.id),
        seasonYear,
        shirtNumber: block.games?.number ?? null,
        totals: {
          appearances: block.games?.appearences ?? null,
          lineups: block.games?.lineups ?? null,
          minutesPlayed: block.games?.minutes ?? null,
          rating: floatOrNull(block.games?.rating),
          goals: block.goals?.total ?? null,
          assists: block.goals?.assists ?? null,
          shotsTotal: block.shots?.total ?? null,
          shotsOnTarget: block.shots?.on ?? null,
          passesTotal: block.passes?.total ?? null,
          passesKey: block.passes?.key ?? null,
          passesAccuracyPercent: intOrNull(block.passes?.accuracy),
          duelsWon: block.duels?.won ?? null,
          dribblesSuccess: block.dribbles?.success ?? null,
          yellowCards: block.cards?.yellow ?? null,
          redCards: block.cards?.red ?? null,
          penaltyScored: block.penalty?.scored ?? null,
          raw: block as unknown as Record<string, unknown>,
        },
      },
    ];
  });
}
