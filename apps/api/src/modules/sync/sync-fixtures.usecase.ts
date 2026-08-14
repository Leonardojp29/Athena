import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatch, ProviderRef } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { DomainEventPublisher } from './domain-event.publisher.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { MatchEventWriter } from './match-event.writer.js';
import { VenueService } from './venue.service.js';

/*
 * Un partido con alargue y penales dura menos de dos horas y media; a las tres horas de haber
 * empezado, seguir "en juego" es un síntoma y no un estado. El margen evita reaccionar a un
 * hueco pasajero del feed en medio del partido.
 */
const STALE_AFTER_MS = 3 * 3600_000;

/*
 * Hasta dónde se mira atrás por partidos que nadie cerró. Cubre una semana larga de worker caído
 * —el caso real: la máquina apagada de un viernes al otro— sin volver a preguntar para siempre por
 * un aplazado de 2020 o por una llave de copa que el proveedor dejó en TBD.
 */
const VENTANA_OLVIDADOS_MS = 14 * 24 * 3600_000;

/* Techo por corrida: un request por cada veinte, así el peor caso son diez llamadas. */
const MAX_OLVIDADOS = 200;

@Injectable()
export class SyncFixturesUseCase {
  private readonly logger = new Logger(SyncFixturesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly events: DomainEventPublisher,
    private readonly eventWriter: MatchEventWriter,
    private readonly venues: VenueService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const fixtures = await this.provider.getMatches(competitionRef, seasonYear);
    return this.upsertMany(fixtures);
  }

  async syncLive(): Promise<number> {
    const live = await this.provider.getLiveMatches();
    // live=all trae todas las ligas del mundo: las no cubiertas se descartan sin warning
    const count = await this.upsertMany(
      live.map((l) => l.match),
      { quiet: true },
    );

    const withEvents = live.filter((l) => l.events.length > 0);
    if (withEvents.length > 0) {
      const ids = await this.refs.resolveMany(
        this.provider.name,
        'match',
        withEvents.map((l) => l.match.providerRef),
      );
      for (const item of withEvents) {
        const id = ids.get(item.match.providerRef);
        if (id) await this.eventWriter.replace(this.provider.name, id, item.events);
      }
    }
    return count;
  }

  /**
   * Cierra los partidos que ya se jugaron y quedaron con un estado viejo.
   *
   * Son dos agujeros del feed en vivo, que contiene SOLO lo que está en juego:
   *
   * 1. **El que se quedó en juego.** Cuando un partido termina desaparece del feed y nadie vuelve a
   *    tocar su fila, así que quedaba clavado en 2H 90' con el marcador de la última vez que
   *    apareció, y nunca disparaba MATCH_FINISHED.
   * 2. **El que nunca entró en vivo.** Si el worker estaba caído a la hora del partido, nadie lo vio
   *    empezar ni terminar: se queda `scheduled` con la hora ya pasada, invisible en la web —fuera
   *    de los próximos porque ya fue, fuera de los últimos resultados porque no está terminado—.
   *    Es lo que pasó con la fecha 4 del Clausura peruano tras una semana con la máquina apagada.
   *
   * Se pregunta el estado real en lugar de adivinarlo: dar por terminado un partido con el marcador
   * viejo es peor que dejarlo como está.
   */
  async reconcileStale(): Promise<number> {
    const ahora = Date.now();
    const limite = new Date(ahora - STALE_AFTER_MS);
    const colgados = await this.prisma.match.findMany({
      where: {
        OR: [
          { status: { in: ['in_play', 'paused'] }, kickoffUtc: { lt: limite } },
          {
            status: { in: ['scheduled', 'postponed'] },
            kickoffUtc: { lt: limite, gt: new Date(ahora - VENTANA_OLVIDADOS_MS) },
          },
        ],
      },
      orderBy: { kickoffUtc: 'desc' },
      take: MAX_OLVIDADOS,
      select: { id: true },
    });
    if (colgados.length === 0) return 0;

    const refs = await this.prisma.externalReference.findMany({
      where: {
        provider: this.provider.name,
        entityType: 'match',
        entityId: { in: colgados.map((m) => m.id) },
      },
      select: { providerRef: true },
    });
    if (refs.length === 0) return 0;

    const reales = await this.provider.getMatchesByRefs(refs.map((r) => r.providerRef));
    const escritos = await this.upsertMany(reales, { quiet: true });
    this.logger.log(`Reconciliados ${escritos}/${colgados.length} partidos con estado viejo`);
    return escritos;
  }

  private async upsertMany(
    fixtures: ProviderRef<ProviderMatch>[],
    opts: { quiet?: boolean } = {},
  ): Promise<number> {
    if (fixtures.length === 0) return 0;

    const teamRefs = [
      ...new Set(fixtures.flatMap((f) => [f.data.homeTeamRef, f.data.awayTeamRef])),
    ];
    const teams = await this.refs.resolveMany(this.provider.name, 'team', teamRefs);
    const matchIds = await this.refs.resolveMany(
      this.provider.name,
      'match',
      fixtures.map((f) => f.providerRef),
    );
    const seasons = await this.resolveSeasons(fixtures);

    const resolvable = fixtures.filter((f) => {
      const ok =
        seasons.has(`${f.data.competitionRef}:${f.data.seasonYear}`) &&
        teams.has(f.data.homeTeamRef) &&
        teams.has(f.data.awayTeamRef);
      if (!ok && !opts.quiet)
        this.logger.warn(`Skipping fixture ${f.providerRef}: unresolved season/team refs`);
      return ok;
    });

    // después del filtro: live=all trae el mundo entero y crearíamos sus estadios cada minuto
    const venueIds = await this.venues.resolveMany(resolvable.map((f) => f.data.venue));

    const toFields = ({ data }: ProviderRef<ProviderMatch>) => ({
      seasonId: seasons.get(`${data.competitionRef}:${data.seasonYear}`) as string,
      round: data.round,
      homeTeamId: teams.get(data.homeTeamRef) as string,
      awayTeamId: teams.get(data.awayTeamRef) as string,
      kickoffUtc: new Date(data.kickoffUtc),
      status: data.status,
      statusDetail: data.statusDetail,
      elapsedMinutes: data.elapsedMinutes,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      venueId: data.venue ? (venueIds.get(data.venue.providerRef) ?? null) : null,
    });

    const fresh = resolvable.filter((f) => !matchIds.has(f.providerRef));
    if (fresh.length > 0) {
      const created = await this.prisma.match.createManyAndReturn({
        data: fresh.map(toFields),
        select: { id: true },
      });
      await this.prisma.externalReference.createMany({
        data: created.map((match, i) => ({
          provider: this.provider.name,
          entityType: 'match',
          providerRef: fresh[i]?.providerRef as string,
          entityId: match.id,
        })),
      });
    }

    const existing = resolvable.filter((f) => matchIds.has(f.providerRef));
    let updated = 0;
    if (existing.length > 0) {
      const current = await this.prisma.match.findMany({
        where: { id: { in: existing.map((f) => matchIds.get(f.providerRef) as string) } },
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          elapsedMinutes: true,
          statusDetail: true,
          kickoffUtc: true,
        },
      });
      const currentById = new Map(current.map((m) => [m.id, m]));

      for (const fixture of existing) {
        const id = matchIds.get(fixture.providerRef) as string;
        const prev = currentById.get(id);
        const fields = toFields(fixture);
        const changed =
          !prev ||
          prev.status !== fields.status ||
          prev.statusDetail !== fields.statusDetail ||
          prev.homeScore !== fields.homeScore ||
          prev.awayScore !== fields.awayScore ||
          prev.elapsedMinutes !== fields.elapsedMinutes ||
          prev.kickoffUtc.getTime() !== fields.kickoffUtc.getTime();
        if (!changed) continue;

        await this.prisma.match.update({ where: { id }, data: fields });
        updated++;
        if (prev && prev.status !== 'finished' && fields.status === 'finished') {
          await this.events.publish('MATCH_FINISHED', 'match', id, {
            homeScore: fields.homeScore,
            awayScore: fields.awayScore,
            providerRef: fixture.providerRef,
          });
        }
      }
    }

    this.logger.log(
      `Fixtures: ${fresh.length} created, ${updated} updated, ${fixtures.length - resolvable.length} skipped`,
    );
    return resolvable.length;
  }

  private async resolveSeasons(
    fixtures: ProviderRef<ProviderMatch>[],
  ): Promise<Map<string, string>> {
    const pairs = [
      ...new Set(fixtures.map((f) => `${f.data.competitionRef}:${f.data.seasonYear}`)),
    ];
    const result = new Map<string, string>();
    for (const pair of pairs) {
      const [competitionRef, year] = pair.split(':');
      if (!competitionRef || !year) continue;
      const competitionId = await this.refs.resolve(
        this.provider.name,
        'competition',
        competitionRef,
      );
      if (!competitionId) continue;
      const season = await this.prisma.season.findUnique({
        where: { competitionId_year: { competitionId, year: Number(year) } },
        select: { id: true },
      });
      if (season) result.set(pair, season.id);
    }
    return result;
  }
}
