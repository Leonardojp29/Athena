import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class SyncStandingsUseCase {
  private readonly logger = new Logger(SyncStandingsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const rows = await this.provider.getStandings(competitionRef, seasonYear);
    if (rows.length === 0) {
      this.logger.log(`No standings for ${competitionRef}/${seasonYear}`);
      return 0;
    }

    const competitionId = await this.refs.resolve(
      this.provider.name,
      'competition',
      competitionRef,
    );
    if (!competitionId) throw new Error(`Competition not synced: ${competitionRef}`);
    const season = await this.prisma.season.findUnique({
      where: { competitionId_year: { competitionId, year: seasonYear } },
      select: { id: true },
    });
    if (!season) throw new Error(`Season not synced: ${competitionRef}/${seasonYear}`);

    const teams = await this.refs.resolveMany(
      this.provider.name,
      'team',
      rows.map((r) => r.teamRef),
    );
    const resolvable = rows.filter((r) => teams.has(r.teamRef));

    /*
     * Un equipo no puede aparecer dos veces en la misma tabla, y en temporadas viejas el proveedor lo
     * hace: devuelve dos etapas con la misma etiqueta de grupo y los mismos equipos. `createMany`
     * rebota contra el índice único y se perdía la tabla entera de esa temporada, así que se conserva
     * la primera aparición —el proveedor lista las tablas en su orden— y se avisa cuántas se cayeron.
     */
    const vistos = new Set<string>();
    const unicos = resolvable.filter((r) => {
      const clave = `${r.groupLabel}|${teams.get(r.teamRef) as string}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
    if (unicos.length !== resolvable.length) {
      this.logger.warn(
        `Standings ${competitionRef}/${seasonYear}: ${resolvable.length - unicos.length} filas repetidas descartadas`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.standing.deleteMany({ where: { seasonId: season.id } }),
      this.prisma.standing.createMany({
        data: unicos.map((r) => ({
          seasonId: season.id,
          teamId: teams.get(r.teamRef) as string,
          groupLabel: r.groupLabel,
          position: r.position,
          points: r.points,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          form: r.form,
        })),
      }),
    ]);

    this.logger.log(`Standings ${competitionRef}/${seasonYear}: ${unicos.length} rows`);
    return unicos.length;
  }
}
