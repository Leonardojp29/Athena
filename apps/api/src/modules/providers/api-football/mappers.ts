import type {
  ProviderCoach,
  MatchEventKind,
  PlayerPosition,
  ProviderCompetition,
  ProviderMatchPlayerStats,
  ProviderSeasonPlayer,
  ProviderVenue,
  ProviderLineup,
  ProviderLineupPlayer,
  ProviderMatch,
  ProviderMatchDetail,
  ProviderMatchEvent,
  ProviderTransfer,
  ProviderTrophy,
  ProviderMatchStatistics,
  ProviderPlayer,
  ProviderRef,
  ProviderStanding,
  ProviderTeam,
} from '@athena/domain';
import { paisEnEspanol } from '@athena/domain';
import type {
  ApiFootballCoach,
  ApiFootballPlayerProfile,
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
  ApiFootballTransfers,
  ApiFootballTrophy,
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
        cobertura: s.coverage?.fixtures
          ? {
              eventos: s.coverage.fixtures.events ?? false,
              alineaciones: s.coverage.fixtures.lineups ?? false,
              estadisticas: s.coverage.fixtures.statistics_fixtures ?? false,
              jugadores: s.coverage.fixtures.statistics_players ?? false,
            }
          : null,
      })),
    },
  };
}

/** El estadio viaja dentro de /teams y /fixtures: no cuesta un request propio. */
/*
 * Fotos del proveedor que retratan otro estadio.
 *
 * La 1242 dice "Estadio Monumental" —el nombre, la ciudad y los 80 093 asientos son los correctos—
 * pero la imagen es una toma aérea del Estadio Nacional de Lima, que está a quince kilómetros. Antes
 * que mostrar una foto equivocada en la página del club más grande del Perú, se muestra la banda sin
 * foto: no saber es honesto, decir cualquier cosa no.
 *
 * Es una lista, no un mecanismo: cuando aparezca la tercera se verá si merece uno.
 */
const FOTOS_ERRADAS = new Set(['1242']);

export function mapVenue(raw: ApiFootballVenue | undefined): ProviderRef<ProviderVenue> | null {
  if (!raw?.id || !raw.name) return null;
  return {
    providerRef: String(raw.id),
    data: {
      name: raw.name,
      city: raw.city ?? null,
      country: raw.country ?? null,
      capacity: raw.capacity ?? null,
      imageUrl: FOTOS_ERRADAS.has(String(raw.id)) ? null : (raw.image ?? null),
      surface: raw.surface ?? null,
      address: raw.address ?? null,
    },
  };
}

export function mapTeam(raw: ApiFootballTeam): ProviderRef<ProviderTeam> {
  return {
    providerRef: String(raw.team.id),
    data: {
      /*
       * A la selección se la nombra como al país, y el proveedor la manda en inglés: "Spain",
       * "South Africa". Se traduce acá y no en la vista porque de este nombre sale el slug —
       * `/equipos/espana`— y porque si no, cada pantalla tendría que acordarse de traducir.
       */
      name: raw.team.national ? (paisEnEspanol(raw.team.name) ?? raw.team.name) : raw.team.name,
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

export function mapPlayerProfile(raw: ApiFootballPlayerProfile): ProviderRef<ProviderPlayer> {
  const fullName = [raw.player.firstname, raw.player.lastname].filter(Boolean).join(' ');
  return {
    providerRef: String(raw.player.id),
    data: {
      name: raw.player.name,
      fullName: fullName || null,
      birthDate: raw.player.birth?.date ?? null,
      nationality: raw.player.nationality,
      heightCm: intOrNull(raw.player.height?.replace(' cm', '')),
      /* La ficha no dice en qué puesto jugaba; eso vive en las estadísticas de cada temporada. */
      position: null,
      photoUrl: raw.player.photo,
    },
  };
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

export function mapFixtureDetail(raw: ApiFootballFixture): ProviderMatchDetail {
  const matchRef = String(raw.fixture.id);
  return {
    match: mapFixture(raw),
    events: raw.events ? mapEvents(matchRef, raw.events) : null,
    lineups: raw.lineups ? raw.lineups.map(mapLineup) : null,
    statistics: raw.statistics ? raw.statistics.map(mapStatistics) : null,
    playerStatistics: raw.players ? mapFixturePlayers(raw.players) : null,
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
    /*
     * El id del entrenador es lo único que permite reconciliar los nombres sueltos: "F. Navarro"
     * aparece con cinco equipos y sin id no hay forma de saber si es una persona que cambió de club
     * o cinco Navarros distintos.
     */
    coachRef: raw.coach?.id === null || raw.coach?.id === undefined ? null : String(raw.coach.id),
    coachPhotoUrl: raw.coach?.photo ?? null,
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
        },
      },
    ];
  });
}

/*
 * El palmarés.
 *
 * `place` solo trae dos valores sobre los datos reales —`Winner` y `2nd Place`—, y cualquier otra
 * cosa se descarta en lugar de inventarle un significado: un palmarés con una fila que no se sabe
 * qué es vale menos que uno con una fila menos.
 */
export function mapTrophies(playerRef: string, rows: ApiFootballTrophy[]): ProviderTrophy[] {
  return sinResumenes(mapTrophiesCrudos(playerRef, rows));
}

/**
 * Quita las filas sin año que repiten un título que ya está fechado.
 *
 * El proveedor manda las dos cosas: "La Liga 2009/2010" y otra vez "La Liga" sin temporada. Sobre
 * Messi eso duplicaba veinte títulos en un bloque al pie que parecía un palmarés paralelo. Si el
 * mismo torneo y el mismo puesto ya existen con año, la fila muda no agrega nada; si es lo único
 * que hay de ese torneo, se queda, porque entonces sí es el único registro del título.
 */
function sinResumenes(palmares: ProviderTrophy[]): ProviderTrophy[] {
  const fechados = new Set(
    palmares.filter((t) => t.temporada).map((t) => `${t.competencia}|${t.puesto}`),
  );
  return palmares.filter((t) => t.temporada || !fechados.has(`${t.competencia}|${t.puesto}`));
}

function mapTrophiesCrudos(playerRef: string, rows: ApiFootballTrophy[]): ProviderTrophy[] {
  const vistos = new Set<string>();
  return rows.flatMap((row) => {
    const competencia = row.league?.trim();
    if (!competencia) return [];

    const puesto = puestoDeTrofeo(row.place);
    if (!puesto) return [];

    const temporada = row.season?.trim() || null;
    /*
     * El proveedor repite filas: la misma Supercopa aparece dos veces en la misma temporada. Se
     * deduplica acá y no con una restricción en la base, porque casi la mitad de las filas viene
     * sin temporada y en Postgres dos nulos no chocan entre sí.
     */
    const clave = `${competencia}|${temporada ?? ''}|${puesto}`;
    if (vistos.has(clave)) return [];
    vistos.add(clave);

    return [{ playerRef, competencia, pais: row.country?.trim() || null, temporada, puesto }];
  });
}

function puestoDeTrofeo(place: string | null): ProviderTrophy['puesto'] | null {
  const limpio = place?.trim().toLowerCase();
  if (limpio === 'winner') return 'campeon';
  if (limpio === '2nd place') return 'subcampeon';
  return null;
}

/*
 * Qué clase de movimiento fue, y cuánto costó si el proveedor lo dijo.
 *
 * `type` mezcla tres cosas en un mismo campo de texto libre: la clase del pase, un monto con su
 * moneda, y varias formas de decir "no sé" —`N/A`, `-`, la cadena vacía y null—. Se separan acá,
 * una sola vez, en lugar de repetir el desarme en cada pantalla que lo muestre.
 */
export function claseDeFichaje(tipo: string | null): {
  clase: ProviderTransfer['clase'];
  monto: string | null;
} {
  const limpio = tipo?.trim() ?? '';
  if (limpio === '' || limpio === '-' || /^n\/?a$/i.test(limpio)) {
    return { clase: 'desconocido', monto: null };
  }
  /* Un monto es un traspaso con su cifra: "€ 1.5M", "$ 800K". */
  if (/[\d]/.test(limpio) && /[€$£]|\bm\b|\bk\b/i.test(limpio)) {
    return { clase: 'traspaso', monto: limpio };
  }
  if (/back\s*from\s*loan|return\s*from\s*loan/i.test(limpio)) {
    return { clase: 'vuelve-de-prestamo', monto: null };
  }
  if (/loan/i.test(limpio)) return { clase: 'prestamo', monto: null };
  if (/free/i.test(limpio)) return { clase: 'libre', monto: null };
  if (/transfer/i.test(limpio)) return { clase: 'traspaso', monto: null };
  return { clase: 'desconocido', monto: null };
}

/*
 * Cuántos días de distancia siguen siendo el mismo pase.
 *
 * El proveedor publica el mismo movimiento dos veces con fechas contiguas —el día que se anunció y
 * el día que se hizo efectivo—: medido, 3.026 pases repetidos sobre veintidós mil, todos con uno o
 * dos días de diferencia. Una semana de margen los junta sin llegar a tapar un préstamo de ida y
 * vuelta, que nunca ocurre en la misma semana.
 */
const DIAS_DEL_MISMO_PASE = 7;

/** Se queda el primero: el día en que el movimiento se conoció, y así el criterio no depende del orden. */
function sinRepetidos(movimientos: ProviderTransfer[]): ProviderTransfer[] {
  const porCruce = new Map<string, ProviderTransfer[]>();
  for (const mov of [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const clave = `${mov.playerRef}|${mov.entraANombre}|${mov.saleDeNombre}`;
    const previos = porCruce.get(clave) ?? [];
    const ultimo = previos[previos.length - 1];
    if (ultimo && diasEntre(ultimo.fecha, mov.fecha) <= DIAS_DEL_MISMO_PASE) continue;
    porCruce.set(clave, [...previos, mov]);
  }
  return [...porCruce.values()].flat();
}

const sinAcentos = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const iguales = (a: string, b: string): boolean => sinAcentos(a) === sinAcentos(b);

/*
 * Si el "club" es el nombre del futbolista con las palabras en otro orden.
 *
 * El proveedor escribe el apellido primero: "Mohamed Salah → Salah Mohamed". La regla es que
 * **todas** las palabras largas del futbolista estén en el club, no que compartan algunas: con
 * "G. Viscarra" contra "Viscarra Guillermo" la inicial no cuenta y el apellido solo alcanza, pero
 * un tal "Diego Racing" fichado por el "Racing Club" no cuela, porque "diego" no está ahí.
 */
function esElMismoNombre(club: string, jugador: string): boolean {
  if (!jugador) return false;
  if (iguales(club, jugador)) return true;

  const palabras = (texto: string) =>
    new Set(sinAcentos(texto).split(/[\s.]+/).filter((w) => w.length > 2));
  const delClub = palabras(club);
  const delJugador = palabras(jugador);
  if (delClub.size === 0 || delJugador.size === 0) return false;

  return [...delJugador].every((w) => delClub.has(w));
}

const diasEntre = (a: string, b: string): number =>
  Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;

export function mapTransfers(rows: ApiFootballTransfers[]): ProviderTransfer[] {
  return sinRepetidos(mapTransfersCrudos(rows));
}

function mapTransfersCrudos(rows: ApiFootballTransfers[]): ProviderTransfer[] {
  return rows.flatMap((fila) => {
    const playerRef = fila.player?.id === null || fila.player?.id === undefined
      ? null
      : String(fila.player.id);
    if (!playerRef) return [];

    return fila.transfers.flatMap((mov) => {
      /* Sin fecha no hay movimiento que ordenar ni con qué desempatar una repetición. */
      const fecha = mov.date?.trim();
      const crudoEntra = mov.teams?.in?.name?.trim() || null;
      const crudoSale = mov.teams?.out?.name?.trim() || null;
      if (!fecha || !crudoEntra || !crudoSale) return [];

      /*
       * Un club que se llama igual que el futbolista no es un club: es que quedó libre.
       * El proveedor escribe "Mohamed Salah → Salah Mohamed", con el apellido primero.
       */
      const nombre = fila.player?.name ?? '';
      const entraANombre = esElMismoNombre(crudoEntra, nombre) ? null : crudoEntra;
      const saleDeNombre = esElMismoNombre(crudoSale, nombre) ? null : crudoSale;

      /*
       * Del club a sí mismo tampoco es un pase: son renovaciones y ascensos de filial, que el
       * proveedor manda con tipo `Raise` o `-`. Salían en las dos columnas de la misma tarjeta.
       */
      if (entraANombre && saleDeNombre && iguales(entraANombre, saleDeNombre)) return [];

      const { clase, monto } = claseDeFichaje(mov.type);
      return [
        {
          playerRef,
          fecha,
          clase,
          monto,
          entraARef: entraANombre === null || mov.teams.in.id === null ? null : String(mov.teams.in.id),
          entraANombre,
          saleDeRef: saleDeNombre === null || mov.teams.out.id === null ? null : String(mov.teams.out.id),
          saleDeNombre,
        },
      ];
    });
  });
}

/**
 * La ficha del entrenador y su carrera.
 *
 * El nombre completo se arma con `firstname` y `lastname` porque `name` llega abreviado —"L.
 * Echteld"— y es lo que el buscador necesita para encontrar a alguien escribiendo su nombre de pila.
 * Una etapa sin fecha de inicio no sirve para nada y se descarta.
 */
export function mapCoaches(rows: ApiFootballCoach[]): ProviderCoach[] {
  return rows.flatMap((fila) => {
    if (fila.id === null || fila.id === undefined || !fila.name) return [];
    const completo = [fila.firstname, fila.lastname].filter(Boolean).join(' ').trim();

    return [
      {
        providerRef: String(fila.id),
        name: fila.name,
        fullName: completo === '' || completo === fila.name ? null : completo,
        birthDate: fila.birth?.date ?? null,
        birthPlace: fila.birth?.place ?? null,
        nationality: fila.nationality ?? null,
        photoUrl: fila.photo ?? null,
        etapas: (fila.career ?? []).flatMap((etapa) =>
          etapa.start
            ? [
                {
                  teamRef:
                    etapa.team?.id === null || etapa.team?.id === undefined
                      ? null
                      : String(etapa.team.id),
                  teamNombre: etapa.team?.name ?? null,
                  desde: etapa.start,
                  hasta: etapa.end ?? null,
                },
              ]
            : [],
        ),
      },
    ];
  });
}
