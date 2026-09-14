import type { CompetitionFormat, MatchEventKind, MatchStatus, PlayerPosition } from './entities.js';

// Puerto hexagonal para proveedores de datos. Los DTOs no llevan UUIDs de Athena:
// la capa de sync los resuelve vía external_references. Referencias entre
// entidades viajan como providerRef.

export interface ProviderRef<T> {
  providerRef: string;
  data: T;
}

export interface ProviderSeason {
  year: number;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  cobertura: ProviderCoverage | null;
}

/** Qué publica el proveedor de una temporada; sin esto se piden datos que esa liga nunca tuvo. */
export interface ProviderCoverage {
  eventos: boolean;
  alineaciones: boolean;
  estadisticas: boolean;
  jugadores: boolean;
}

export interface ProviderCompetition {
  name: string;
  country: string | null;
  /** ISO del país: PE, GB-ENG. Null en los torneos internacionales. */
  countryCode: string | null;
  /** URL de la bandera tal como la publica el proveedor: no se construye a mano. */
  flagUrl: string | null;
  format: CompetitionFormat;
  logoUrl: string | null;
  seasons: ProviderSeason[];
}

export interface ProviderVenue {
  name: string;
  city: string | null;
  country: string | null;
  capacity: number | null;
  /** La foto del estadio; solo llega en el endpoint de equipos, nunca en el de partidos. */
  imageUrl: string | null;
  /** El tipo de campo tal como lo manda el proveedor: "grass", "artificial turf". */
  surface: string | null;
  address: string | null;
}

export interface ProviderTeam {
  name: string;
  shortName: string | null;
  country: string | null;
  founded: number | null;
  isNationalTeam: boolean;
  logoUrl: string | null;
  venue: ProviderRef<ProviderVenue> | null;
}

export interface ProviderPlayer {
  name: string;
  fullName: string | null;
  birthDate: string | null;
  nationality: string | null;
  heightCm: number | null;
  position: PlayerPosition | null;
  photoUrl: string | null;
}

export interface ProviderMatch {
  competitionRef: string;
  seasonYear: number;
  round: string | null;
  homeTeamRef: string;
  awayTeamRef: string;
  kickoffUtc: string;
  status: MatchStatus;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: ProviderRef<ProviderVenue> | null;
}

export interface ProviderMatchEvent {
  matchRef: string;
  kind: MatchEventKind;
  minute: number;
  extraMinute: number | null;
  teamRef: string;
  playerRef: string | null;
  relatedPlayerRef: string | null;
  detail: Record<string, unknown> | null;
}

export interface ProviderStanding {
  teamRef: string;
  groupLabel: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
}

export interface ProviderMatchStatistics {
  teamRef: string;
  possessionPercent: number | null;
  shotsTotal: number | null;
  shotsOnGoal: number | null;
  shotsOffGoal: number | null;
  shotsBlocked: number | null;
  corners: number | null;
  offsides: number | null;
  fouls: number | null;
  yellowCards: number | null;
  redCards: number | null;
  goalkeeperSaves: number | null;
  passesTotal: number | null;
  passesAccurate: number | null;
  passesPercent: number | null;
  expectedGoals: number | null;
}

export interface ProviderLineupPlayer {
  playerRef: string | null;
  name: string;
  number: number | null;
  position: string | null;
  /** Fila:columna desde el arco propio, tal como lo publica el proveedor. */
  grid: string | null;
}

export interface ProviderLineup {
  teamRef: string;
  formation: string | null;
  coachName: string | null;
  /** Los colores de la camiseta, en hex sin almohadilla. El proveedor los manda acá y en ningún otro endpoint. */
  colors: { primary: string | null; secondary: string | null };
  startXi: ProviderLineupPlayer[];
  substitutes: ProviderLineupPlayer[];
}

/**
 * Rendimiento de un jugador en un partido. `passesAccurate` es un conteo y no un
 * porcentaje: el proveedor lo publica bajo la clave "accuracy" en este endpoint y bajo
 * la misma clave, pero como porcentaje, en los acumulados de temporada.
 */
export interface ProviderMatchPlayerStats {
  teamRef: string;
  playerRef: string;
  name: string;
  photoUrl: string | null;
  shirtNumber: number | null;
  position: string | null;
  isStarter: boolean;
  minutesPlayed: number | null;
  rating: number | null;
  captain: boolean;
  goals: number | null;
  goalsConceded: number | null;
  assists: number | null;
  saves: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAccurate: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  dribblesTotal: number | null;
  dribblesSuccess: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
  yellowCards: number | null;
  redCards: number | null;
  penaltyScored: number | null;
  penaltyMissed: number | null;
  penaltySaved: number | null;
}

export interface ProviderSeasonTotals {
  appearances: number | null;
  lineups: number | null;
  minutesPlayed: number | null;
  rating: number | null;
  goals: number | null;
  assists: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAccuracyPercent: number | null;
  duelsWon: number | null;
  dribblesSuccess: number | null;
  yellowCards: number | null;
  redCards: number | null;
  penaltyScored: number | null;
}

/**
 * Un jugador con su bio y sus acumulados de una temporada. Vienen juntos del mismo
 * endpoint: pedir las bios aparte costaría un request por futbolista.
 */
export interface ProviderSeasonPlayer {
  player: ProviderRef<ProviderPlayer>;
  teamRef: string;
  seasonYear: number;
  shirtNumber: number | null;
  totals: ProviderSeasonTotals;
}

export interface ProviderLiveMatch {
  match: ProviderRef<ProviderMatch>;
  events: ProviderMatchEvent[];
}

/**
 * Un partido con todo lo que se puede saber de él en un solo pedido.
 *
 * `null` distingue "el proveedor no mandó esta faceta" de "la mandó vacía": lo primero se
 * reintenta por otro camino, lo segundo significa que todavía no existe.
 */
export interface ProviderMatchDetail {
  match: ProviderRef<ProviderMatch>;
  events: ProviderMatchEvent[] | null;
  lineups: ProviderLineup[] | null;
  statistics: ProviderMatchStatistics[] | null;
  playerStatistics: ProviderMatchPlayerStats[] | null;
}

/**
 * Un título del palmarés de un futbolista.
 *
 * El proveedor manda el nombre del torneo y no su id, así que esto no se puede atar a la tabla de
 * competencias: "CONMEBOL Sudamericana" llega como texto. Y casi la mitad de las filas viene sin
 * temporada —medido: 14 de 31 en Paolo Guerrero—, lo que obliga a que el año sea opcional en todo
 * el camino, desde acá hasta la pantalla.
 */
export interface ProviderTrophy {
  playerRef: string;
  competencia: string;
  pais: string | null;
  /** "2023" o "2023/2024" tal como lo escribe el proveedor; null cuando no lo sabe. */
  temporada: string | null;
  puesto: 'campeon' | 'subcampeon';
}

/**
 * Qué clase de movimiento fue un fichaje.
 *
 * El proveedor usa doce cadenas distintas para cinco cosas —medido sobre un solo club: `Free`,
 * `Free agent`, `Free Transfer`, `Loan`, `Back from Loan`, `Return from loan`, `Transfer`, `N/A`,
 * `-`, null y montos como `€ 1.5M`—. Normalizar acá es lo que evita que esa mugre llegue a la
 * pantalla, y `desconocido` es un valor legítimo: la mitad de las filas no dice nada.
 */
export type ClaseDeFichaje = 'traspaso' | 'prestamo' | 'vuelve-de-prestamo' | 'libre' | 'desconocido';

export interface ProviderTransfer {
  playerRef: string;
  /** Solo la fecha: el proveedor nunca manda hora y un fichaje no la tiene. */
  fecha: string;
  clase: ClaseDeFichaje;
  /** El monto cuando el proveedor lo escribió dentro del tipo; se guarda tal cual lo mandó. */
  monto: string | null;
  entraARef: string | null;
  entraANombre: string;
  saleDeRef: string | null;
  saleDeNombre: string;
}

export interface FootballDataProvider {
  readonly name: string;

  getCompetition(competitionRef: string): Promise<ProviderRef<ProviderCompetition> | null>;
  getTeams(competitionRef: string, seasonYear: number): Promise<ProviderRef<ProviderTeam>[]>;
  getSquad(teamRef: string): Promise<ProviderRef<ProviderPlayer>[]>;
  getMatches(competitionRef: string, seasonYear: number): Promise<ProviderRef<ProviderMatch>[]>;
  /**
   * Estado real de partidos puntuales. Hace falta porque el feed en vivo solo contiene lo que
   * está en juego: un partido que termina desaparece de ahí y nadie lo saca de "en juego".
   */
  getMatchesByRefs(matchRefs: string[]): Promise<ProviderRef<ProviderMatch>[]>;
  /** Los mismos partidos con eventos, alineaciones y estadísticas: un pedido por cada veinte. */
  getMatchDetails(matchRefs: string[]): Promise<ProviderMatchDetail[]>;
  getStandings(competitionRef: string, seasonYear: number): Promise<ProviderStanding[]>;
  getLiveMatches(): Promise<ProviderLiveMatch[]>;
  getMatchEvents(matchRef: string): Promise<ProviderMatchEvent[]>;
  getMatchStatistics(matchRef: string): Promise<ProviderMatchStatistics[]>;
  getMatchLineups(matchRef: string): Promise<ProviderLineup[]>;
  getMatchPlayerStatistics(matchRef: string): Promise<ProviderMatchPlayerStats[]>;
  getSeasonPlayers(competitionRef: string, seasonYear: number): Promise<ProviderSeasonPlayer[]>;
  /** El palmarés de un futbolista: un pedido por jugador, y cambia una vez al año. */
  getTrophies(playerRef: string): Promise<ProviderTrophy[]>;
  /**
   * Los movimientos de un club. Un solo pedido devuelve el historial entero de cada futbolista que
   * alguna vez pasó por ahí —284 en Alianza Lima—, así que se pide por equipo y se filtra acá.
   */
  getTransfers(teamRef: string): Promise<ProviderTransfer[]>;
}
