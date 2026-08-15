import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../shared/prisma.service.js';
import { logJson, reportError } from '../../shared/observability.js';
import { REDIS } from '../../shared/redis.provider.js';
import { GenerateMatchInsightUseCase } from '../insights/generate-match-insight.usecase.js';
import { SyncEmbeddingsUseCase } from '../search/sync-embeddings.usecase.js';
import { CONFIGURED_COMPETITIONS } from '../sync/competitions.config.js';
import { RecalcularColoresUseCase } from '../sync/recalcular-colores.usecase.js';
import { OutboxService } from '../sync/outbox.service.js';
import { SyncCompetitionUseCase } from '../sync/sync-competition.usecase.js';
import { SyncFixturesUseCase } from '../sync/sync-fixtures.usecase.js';
import { SyncMatchDetailUseCase } from '../sync/sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from '../sync/sync-match-events.usecase.js';
import { SyncMatchPlayersUseCase } from '../sync/sync-match-players.usecase.js';
import { SyncSquadUseCase } from '../sync/sync-squad.usecase.js';
import { SyncStandingsUseCase } from '../sync/sync-standings.usecase.js';
import { SyncTeamsUseCase } from '../sync/sync-teams.usecase.js';
import { SyncScheduleService } from './sync-schedule.service.js';

const QUEUE = 'sync';

/* El análisis espera a que aterricen los eventos y las estadísticas que lo respaldan. */
const INSIGHT_DELAY_MS = 3 * 60_000;
/* Lo que tarda el proveedor en recalcular su tabla después del pitazo final, con margen. */
const TABLA_REINTENTO_MS = 12 * 60_000;

/*
 * Hasta cuándo un partido terminado merece que le pidamos su detalle. Lo del archivo llega marcado
 * como terminado igual que lo de anoche, y a tres pedidos por partido eso serían más de cien mil
 * requests de una cuota compartida.
 */
const DETALLE_MAX_ANTIGUEDAD_MS = 7 * 24 * 3600_000;

/* El proveedor publica la alineación unos 40 minutos antes del pitazo. */
const LINEUP_LEAD_MS = 45 * 60_000;

/*
 * Cada cuánto se vuelven a pedir las notas de un partido en juego, y cuántos partidos por vuelta.
 *
 * Las notas y las estadísticas por jugador solo se pedían al terminar, así que durante el partido
 * la cancha mostraba a los once sin un número: justo cuando la gente está mirando. Cinco minutos es
 * el ritmo al que el proveedor las mueve, y el tope de quince partidos por vuelta acota el sábado
 * más cargado a un costo conocido: un request por partido cada cinco minutos.
 */
const LIVE_PLAYERS_STALE_MS = 5 * 60_000;
const LIVE_PLAYERS_MAX = 15;
const LIVE_PLAYERS_ON = process.env.SYNC_LIVE_PLAYER_STATS !== 'false';

type SyncJob =
  | { name: 'competition'; data: { competitionRef: string } }
  | { name: 'teams'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'fixtures'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'standings'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'match-events'; data: { matchRef: string } }
  | { name: 'match-detail'; data: { matchRef: string } }
  | { name: 'match-players'; data: { matchRef: string } }
  | { name: 'squad'; data: { teamRef: string } }
  | { name: 'match-insight'; data: { matchId: string } }
  | { name: 'match-preview'; data: { matchId: string } }
  | { name: 'embeddings'; data: { entityType: 'team' | 'player' } }
  | { name: 'live-tick'; data: Record<string, never> }
  | { name: 'process-outbox'; data: Record<string, never> }
  | { name: 'daily-refresh'; data: Record<string, never> };

@Injectable()
export class SyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncQueueService.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly syncCompetition: SyncCompetitionUseCase,
    private readonly syncTeams: SyncTeamsUseCase,
    private readonly syncFixtures: SyncFixturesUseCase,
    private readonly syncStandings: SyncStandingsUseCase,
    private readonly syncMatchEvents: SyncMatchEventsUseCase,
    private readonly syncMatchDetail: SyncMatchDetailUseCase,
    private readonly syncMatchPlayers: SyncMatchPlayersUseCase,
    private readonly syncSquad: SyncSquadUseCase,
    private readonly colores: RecalcularColoresUseCase,
    private readonly matchInsight: GenerateMatchInsightUseCase,
    private readonly embeddings: SyncEmbeddingsUseCase,
    private readonly schedules: SyncScheduleService,
  ) {}

  async onModuleInit(): Promise<void> {
    // BullMQ necesita conexiones dedicadas: el Worker bloquea la suya al esperar jobs
    this.queue = new Queue(QUEUE, { connection: this.redis.duplicate() });
    this.worker = new Worker(QUEUE, (job) => this.process(job as Job & SyncJob), {
      connection: this.redis.duplicate(),
      concurrency: 4,
    });
    this.worker.on('failed', (job, err) => {
      logJson('error', 'job_failed', {
        job: job?.name,
        jobId: job?.id,
        attempts: job?.attemptsMade,
        error: err.message,
      });
      reportError(err, { job: job?.name, jobId: job?.id });
    });

    await this.schedules.apply(this.queue);
    this.logger.log('Sync queue lista');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /*
   * La prioridad decide quién pasa primero cuando la cola tiene cientos de trabajos: menor número,
   * antes. Una tabla de posiciones cuesta un pedido y es lo que más se mira; un `fixtures` de
   * temporada escribe cientos de filas y tarda minutos. Sin esto, el refresco diario dejaba las
   * tablas al final de la fila y la del Clausura peruano seguía una jornada atrasada horas después.
   */
  async enqueue<T extends SyncJob>(
    name: T['name'],
    data: T['data'],
    opts?: { attempts?: number; delay?: number; priority?: number },
  ): Promise<void> {
    await this.queue.add(name, data, {
      attempts: opts?.attempts ?? 3,
      ...(opts?.delay ? { delay: opts.delay } : {}),
      ...(opts?.priority ? { priority: opts.priority } : {}),
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
  }

  private async process(job: Job & SyncJob): Promise<unknown> {
    switch (job.name) {
      case 'competition':
        return this.syncCompetition.execute(job.data.competitionRef);
      case 'teams':
        return this.syncTeams.execute(job.data.competitionRef, job.data.seasonYear);
      case 'fixtures':
        return this.syncFixtures.execute(job.data.competitionRef, job.data.seasonYear);
      case 'standings':
        return this.syncStandings.execute(job.data.competitionRef, job.data.seasonYear);
      case 'match-events':
        return this.syncMatchEvents.execute(job.data.matchRef);
      case 'match-detail':
        return this.syncMatchDetail.execute(job.data.matchRef);
      case 'match-players':
        return this.syncMatchPlayers.execute(job.data.matchRef);
      case 'squad':
        return this.syncSquad.execute(job.data.teamRef);
      case 'match-insight':
        return this.matchInsight.execute(job.data.matchId);
      case 'match-preview':
        return this.matchInsight.executePreview(job.data.matchId);
      case 'embeddings':
        return job.data.entityType === 'team'
          ? this.embeddings.syncTeams()
          : this.embeddings.syncPlayers();
      /* Los recurrentes sellan su corrida: sin eso sync_schedules no diagnostica nada. */
      case 'live-tick':
        await this.schedules.markRun('live-tick');
        return this.liveTick();
      case 'process-outbox':
        await this.schedules.markRun('process-outbox');
        return this.processOutbox();
      case 'daily-refresh':
        await this.schedules.markRun('daily-refresh');
        return this.dailyRefresh();
      default:
        throw new Error(`Unknown job: ${(job as Job).name}`);
    }
  }

  // Solo llama al API si la base indica que puede haber fútbol en juego: costo cero fuera de partidos.
  private async liveTick(): Promise<number> {
    /*
     * La reconciliación va primero y sin condición: un partido que nadie cerró no depende de que
     * haya fútbol en cancha ahora mismo. Antes vivía después del corte por candidatos, así que con
     * el worker caído toda una semana los partidos de esos días se quedaban invisibles hasta que
     * volviera a haber algo en juego. Cuesta cero requests cuando no hay ninguno.
     */
    await this.syncFixtures.reconcileStale();

    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 60 * 1000);
    const staleThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const candidates = await this.prisma.match.count({
      where: {
        OR: [
          { status: { in: ['in_play', 'paused'] } },
          { status: 'scheduled', kickoffUtc: { gte: staleThreshold, lte: soon } },
        ],
      },
    });
    if (candidates === 0) return 0;

    const escritos = await this.syncFixtures.syncLive();
    await this.fetchMissingDetail();
    await this.refreshLivePlayers();
    return escritos;
  }

  /**
   * Las notas por jugador de los partidos en juego.
   *
   * Se pide solo lo que está viejo: un partido cuya nota más reciente tiene menos de cinco minutos
   * no se vuelve a pedir. Así el costo no depende del ritmo del tick —que corre cada minuto— sino
   * de cuántos partidos hay en cancha, y un partido de dos horas cuesta veinticuatro requests.
   */
  private async refreshLivePlayers(): Promise<number> {
    if (!LIVE_PLAYERS_ON) return 0;

    const enJuego = await this.prisma.match.findMany({
      where: { status: { in: ['in_play', 'paused'] } },
      select: {
        id: true,
        playerStatistics: { select: { updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
      },
      take: 60,
    });

    const limite = new Date(Date.now() - LIVE_PLAYERS_STALE_MS);
    const pendientes = enJuego
      .filter((m) => {
        const ultima = m.playerStatistics[0]?.updatedAt;
        return ultima === undefined || ultima < limite;
      })
      .slice(0, LIVE_PLAYERS_MAX);
    if (pendientes.length === 0) return 0;

    const refs = await this.prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: pendientes.map((m) => m.id) },
      },
      select: { providerRef: true },
    });

    for (const { providerRef } of refs) {
      await this.enqueue('match-players', { matchRef: providerRef });
    }
    logJson('info', 'live_players_encolados', { partidos: refs.length });
    return refs.length;
  }

  /**
   * Alineaciones y estadísticas de los partidos que están por empezar o en juego.
   *
   * El feed en vivo trae marcador y eventos, nunca la alineación, y el refresco diario solo
   * mira partidos terminados: por eso un partido de hoy se abría sin cancha. El proveedor
   * publica la alineación unos 40 minutos antes del pitazo, así que se pide desde ahí.
   *
   * Se pregunta una sola vez por partido: en cuanto la alineación existe, deja de pedirse.
   */
  private async fetchMissingDetail(): Promise<number> {
    const sinDetalle = await this.prisma.match.findMany({
      where: {
        OR: [
          { status: { in: ['in_play', 'paused'] } },
          {
            status: 'scheduled',
            kickoffUtc: { lte: new Date(Date.now() + LINEUP_LEAD_MS), gte: new Date() },
          },
        ],
        lineups: { none: {} },
      },
      select: { id: true },
      take: 40,
    });
    if (sinDetalle.length === 0) return 0;

    const refs = await this.prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: sinDetalle.map((m) => m.id) },
      },
      select: { providerRef: true },
    });
    for (const { providerRef } of refs) {
      await this.enqueue('match-detail', { matchRef: providerRef });
    }
    if (refs.length > 0) {
      this.logger.log(`${refs.length} partidos en curso o por empezar sin alineación: encolados`);
    }
    return refs.length;
  }

  private async processOutbox(): Promise<number> {
    const events = await this.outbox.pending();
    if (events.length === 0) return 0;

    const handled: string[] = [];
    for (const event of events) {
      if (event.kind === 'MATCH_FINISHED') await this.onMatchFinished(event.subjectId);
      handled.push(event.id);
    }
    await this.outbox.markProcessed(handled);
    return handled.length;
  }

  /**
   * La cadena derivada de un partido terminado: primero los datos, después el relato.
   *
   * Antes esto solo encolaba el análisis, así que un partido recién terminado tenía texto de IA
   * pero ni alineaciones ni estadísticas: la cancha quedaba vacía hasta el refresco de las 05:00.
   * El análisis va con retraso a propósito, porque su fact sheet se arma con los eventos y las
   * estadísticas que encolamos acá arriba.
   *
   * Solo para partidos recientes. Importar el archivo —cinco temporadas de sesenta competencias—
   * marca decenas de miles de partidos como terminados de golpe, y a tres pedidos cada uno serían
   * más de cien mil requests de una cuota que se comparte con otros sistemas. El detalle de lo viejo
   * se rellena a mano con `backfill:matches`, que es donde se decide cuánto gastar.
   */
  private async onMatchFinished(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        kickoffUtc: true,
        season: { select: { year: true, competitionId: true, isCurrent: true } },
      },
    });
    if (!match) return;

    const antiguedad = Date.now() - match.kickoffUtc.getTime();
    if (antiguedad > DETALLE_MAX_ANTIGUEDAD_MS) {
      this.logger.debug?.(`Partido ${matchId} es del archivo: sin detalle ni análisis`);
      return;
    }

    const ref = await this.prisma.externalReference.findUnique({
      where: {
        provider_entityType_entityId: {
          provider: 'api-football',
          entityType: 'match',
          entityId: matchId,
        },
      },
      select: { providerRef: true },
    });

    if (ref) {
      await this.enqueue('match-events', { matchRef: ref.providerRef });
      await this.enqueue('match-detail', { matchRef: ref.providerRef });
      await this.enqueue('match-players', { matchRef: ref.providerRef });
    }
    await this.enqueue('match-insight', { matchId }, { delay: INSIGHT_DELAY_MS });
    await this.refrescarTabla(match.season);
  }

  /**
   * La tabla, cuando termina un partido de la temporada en curso.
   *
   * Antes solo se pedía en el refresco diario de las 05:00, así que la tabla iba una jornada y media
   * atrasada durante todo el fin de semana: el Clausura peruano mostraba tres partidos jugados
   * mientras se jugaba la quinta fecha. Cuesta un pedido por competencia y solo cuando algo terminó.
   */
  private async refrescarTabla(season: {
    year: number;
    competitionId: string;
    isCurrent: boolean;
  }): Promise<void> {
    if (!season.isCurrent) return;
    const ref = await this.prisma.externalReference.findUnique({
      where: {
        provider_entityType_entityId: {
          provider: 'api-football',
          entityType: 'competition',
          entityId: season.competitionId,
        },
      },
      select: { providerRef: true },
    });
    if (!ref) return;
    const tabla = { competitionRef: ref.providerRef, seasonYear: season.year };
    await this.enqueue('standings', tabla, { priority: 1 });
    await this.enqueue('standings', tabla, { priority: 1, delay: TABLA_REINTENTO_MS });
  }

  private async dailyRefresh(): Promise<void> {
    /* Red de seguridad: si el worker estuvo caído, acá se cierran los que quedaron colgados. */
    await this.syncFixtures.reconcileStale();
    await this.colores.execute();

    const recentlyFinishedIds = (
      await this.prisma.match.findMany({
        where: { status: 'finished', kickoffUtc: { gte: new Date(Date.now() - 48 * 3600_000) } },
        select: { id: true },
      })
    ).map((m) => m.id);

    const recentlyFinished = await this.prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: recentlyFinishedIds },
      },
      select: { providerRef: true },
    });
    for (const { providerRef } of recentlyFinished) {
      await this.enqueue('match-events', { matchRef: providerRef });
      await this.enqueue('match-detail', { matchRef: providerRef });
      await this.enqueue('match-players', { matchRef: providerRef });
    }

    for (const { providerRef } of CONFIGURED_COMPETITIONS) {
      await this.enqueue('competition', { competitionRef: providerRef });
    }

    const seasons = await this.prisma.season.findMany({
      where: { isCurrent: true, competition: { isActive: true } },
      select: { year: true, competition: { select: { id: true } } },
    });
    for (const season of seasons) {
      const ref = await this.prisma.externalReference.findUnique({
        where: {
          provider_entityType_entityId: {
            provider: 'api-football',
            entityType: 'competition',
            entityId: season.competition.id,
          },
        },
        select: { providerRef: true },
      });
      if (!ref) continue;
      /*
       * Las tablas primero y con prioridad: son un pedido cada una y es lo que la gente abre. Los
       * equipos y los partidos de la temporada pueden esperar su turno detrás.
       */
      await this.enqueue(
        'standings',
        { competitionRef: ref.providerRef, seasonYear: season.year },
        { priority: 1 },
      );
      await this.enqueue('teams', { competitionRef: ref.providerRef, seasonYear: season.year });
      await this.enqueue('fixtures', { competitionRef: ref.providerRef, seasonYear: season.year });
    }

    // previas de los partidos que se juegan en las próximas 24 horas
    const upcoming = await this.prisma.match.findMany({
      where: {
        status: 'scheduled',
        kickoffUtc: { gte: new Date(), lte: new Date(Date.now() + 24 * 3600_000) },
        season: { competition: { isActive: true } },
      },
      select: { id: true },
    });
    for (const match of upcoming) {
      await this.enqueue('match-preview', { matchId: match.id });
    }

    await this.enqueue('embeddings', { entityType: 'team' });
  }
}
