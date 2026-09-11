import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import type {
  FootballDataProvider,
  ProviderLineup,
  ProviderLineupPlayer,
  ProviderMatchStatistics,
} from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

export interface LineupPlayerLink {
  playerId: string | null;
  slug: string | null;
  photoUrl: string | null;
}

@Injectable()
export class SyncMatchDetailUseCase {
  private readonly logger = new Logger(SyncMatchDetailUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  /**
   * Solo los colores de camiseta, con un pedido en lugar de dos.
   *
   * Existe para rellenar lo viejo: los colores viajan en las alineaciones y nunca se habían
   * guardado. `execute` pide además las estadísticas, que para esto no hacen falta.
   */
  /**
   * Guarda con qué camiseta jugó cada equipo en un partido que ya está sincronizado.
   *
   * Sirve para sembrar lo viejo: las alineaciones guardadas antes de que existiera la columna no
   * tienen el color y no hay forma de recuperarlo sin volver a pedirlas. Pide **solo** las
   * alineaciones —un request, no los dos de `execute`— y no toca el once ni el banco, que ya están.
   */
  async muestrearKits(matchProviderRef: string): Promise<number> {
    const matchId = await this.refs.resolve(this.provider.name, 'match', matchProviderRef);
    if (!matchId) return 0;

    const lineups = await this.provider.getMatchLineups(matchProviderRef);
    const teams = await this.refs.resolveMany(
      this.provider.name,
      'team',
      lineups.map((l) => l.teamRef),
    );

    let escritos = 0;
    for (const lineup of lineups) {
      const teamId = teams.get(lineup.teamRef);
      if (!teamId || lineup.colors.primary === null) continue;
      const { count } = await this.prisma.matchLineup.updateMany({
        where: { matchId, teamId },
        data: { kitColor: lineup.colors.primary, kitNumberColor: lineup.colors.secondary },
      });
      escritos += count;
    }
    return escritos;
  }

  async execute(matchProviderRef: string): Promise<{ statistics: number; lineups: number }> {
    const matchId = await this.refs.resolve(this.provider.name, 'match', matchProviderRef);
    if (!matchId) throw new Error(`Match not synced: ${matchProviderRef}`);

    const [statistics, lineups] = await Promise.all([
      this.provider.getMatchStatistics(matchProviderRef),
      this.provider.getMatchLineups(matchProviderRef),
    ]);

    const statsWritten = await this.escribirEstadisticas(matchId, statistics);
    const lineupsWritten = await this.escribirAlineaciones(matchId, lineups);

    this.logger.log(
      `Detalle de ${matchProviderRef}: ${statsWritten} equipos con stats, ${lineupsWritten} alineaciones`,
    );
    return { statistics: statsWritten, lineups: lineupsWritten };
  }

  /**
   * Devuelve cuántos equipos quedaron con estadísticas **que se pueden mostrar**.
   *
   * El proveedor manda a veces las dos entradas con todas las métricas en null. Contarlas como
   * llegadas cerraba el partido y la pantalla se quedaba sin barras: un vacío con otra forma.
   */
  async escribirEstadisticas(matchId: string, statistics: ProviderMatchStatistics[]): Promise<number> {
    const conDatos = statistics.filter(tieneAlgunaMetrica);
    const teams = await this.equiposDe(conDatos);

    let escritas = 0;
    for (const stat of conDatos) {
      const teamId = teams.get(stat.teamRef);
      if (!teamId) continue;
      const { teamRef: _teamRef, ...data } = stat;
      await this.prisma.matchStatistics.upsert({
        where: { matchId_teamId: { matchId, teamId } },
        update: data,
        create: { matchId, teamId, ...data },
      });
      escritas++;
    }
    return escritas;
  }

  /** Cuenta solo las alineaciones dibujables: once titulares y una formación que los ordene. */
  async escribirAlineaciones(matchId: string, lineups: ProviderLineup[]): Promise<number> {
    const teams = await this.equiposDe(lineups);

    let escritas = 0;
    for (const lineup of lineups) {
      const teamId = teams.get(lineup.teamRef);
      if (!teamId || lineup.startXi.length === 0) continue;
      const data = {
        formation: lineup.formation,
        coachName: lineup.coachName,
        /* La camiseta de este partido: de la moda de los partidos de local sale el color del club. */
        kitColor: lineup.colors.primary,
        kitNumberColor: lineup.colors.secondary,
        startXi: (await this.withPlayerIds(lineup.startXi)) as unknown as Prisma.InputJsonValue,
        substitutes: (await this.withPlayerIds(
          lineup.substitutes,
        )) as unknown as Prisma.InputJsonValue,
      };
      await this.prisma.matchLineup.upsert({
        where: { matchId_teamId: { matchId, teamId } },
        update: data,
        create: { matchId, teamId, ...data },
      });
      if (lineup.formation !== null && lineup.startXi.length >= 11) escritas++;
    }
    return escritas;
  }

  private equiposDe(items: Array<{ teamRef: string }>): Promise<Map<string, string>> {
    return this.refs.resolveMany(this.provider.name, 'team', [
      ...new Set(items.map((item) => item.teamRef)),
    ]);
  }

  /**
   * Resuelve el jugador de Athena cuando ya existe; si no, queda solo el nombre.
   *
   * El slug y la foto se guardan dentro del JSONB porque la alineación ya es un snapshot
   * que se lee como unidad: sin eso, dibujar la cancha costaría un join extra en una
   * página que se refresca cada veinte segundos.
   */
  private async withPlayerIds(
    players: ProviderLineupPlayer[],
  ): Promise<Array<ProviderLineupPlayer & LineupPlayerLink>> {
    const refs = players.map((p) => p.playerRef).filter((ref): ref is string => ref !== null);
    const ids = await this.refs.resolveMany(this.provider.name, 'player', refs);
    const rows = await this.prisma.player.findMany({
      where: { id: { in: [...ids.values()] } },
      select: { id: true, slug: true, photoUrl: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    return players.map((player) => {
      const id = player.playerRef ? (ids.get(player.playerRef) ?? null) : null;
      const row = id ? byId.get(id) : undefined;
      return {
        ...player,
        playerId: id,
        slug: row?.slug ?? null,
        photoUrl: row?.photoUrl ?? null,
      };
    });
  }
}

function tieneAlgunaMetrica({ teamRef: _teamRef, ...metricas }: ProviderMatchStatistics): boolean {
  return Object.values(metricas).some((valor) => valor !== null);
}
