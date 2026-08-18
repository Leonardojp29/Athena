import { Injectable, Logger } from '@nestjs/common';
import { KvService } from '../../shared/kv.service.js';
import { PrismaService } from '../../shared/prisma.service.js';
import { logJson, reportError } from '../../shared/observability.js';
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
import { ColaDeTareas, type Tarea } from './cola-de-tareas.service.js';
import { SyncScheduleService } from './sync-schedule.service.js';

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
/* Cuánto atrás mira el tic para recuperar un partido que terminó sin su detalle. */
const RECUPERACION_MS = 6 * 3600_000;

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
  | { name: 'colores'; data: Record<string, never> };

@Injectable()
export class SyncQueueService {
  private readonly logger = new Logger(SyncQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: KvService,
    private readonly cola: ColaDeTareas,
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

  /**
   * Un tic del vivo: la única entrada del sync minuto a minuto.
   *
   * La llaman dos mundos con el mismo efecto: en local, el worker cada sesenta segundos; en
   * producción, pg_cron de Supabase contra el endpoint interno del API. Hace lo urgente en línea
   * —marcadores, eventos, la salida de partidos terminados— y después drena la cola de tareas
   * hasta agotar su presupuesto de tiempo, que en serverless es el límite de la función.
   */
  async tick(presupuestoMs = 50_000): Promise<{ vivos: number; tareas: number }> {
    /*
     * Un solo tic a la vez. En serverless pg_cron dispara cada minuto sin saber si el anterior
     * sigue vivo: sin candado, dos tics solapados procesan el mismo outbox y piden el mismo vivo
     * dos veces. El que llega tarde se va sin trabajar; el candado expira solo antes del minuto.
     */
    if (!(await this.kv.marcar('tick:candado', 55))) return { vivos: 0, tareas: 0 };

    const arranque = Date.now();
    await this.schedules.markRun('live-tick');
    const vivos = await this.liveTick();
    await this.schedules.markRun('process-outbox');
    await this.processOutbox();

    let hechas = 0;
    while (Date.now() - arranque < presupuestoMs) {
      const tareas = await this.cola.tomar(3);
      if (tareas.length === 0) break;
      for (const tarea of tareas) {
        try {
          await this.process(tarea);
          await this.cola.completar(tarea.id);
          hechas++;
        } catch (error) {
          await this.cola.fallar(tarea, error);
          logJson('error', 'tarea_fallida', {
            tipo: tarea.tipo,
            id: String(tarea.id),
            intentos: tarea.intentos,
            error: String(error).slice(0, 200),
          });
          reportError(error, { tarea: tarea.tipo });
        }
      }
    }
    return { vivos, tareas: hechas };
  }

  /**
   * El refresco diario. Encola casi todo: las tandas largas las va drenando el tic siguiente, así
   * esta llamada cabe en una función serverless aunque el catálogo tenga sesenta competencias.
   */
  async daily(): Promise<void> {
    await this.schedules.markRun('daily-refresh');
    await this.dailyRefresh();
  }

  /*
   * La prioridad decide quién pasa primero cuando la cola tiene cientos de trabajos: menor número,
   * antes. Una tabla de posiciones cuesta un pedido y es lo que más se mira; un `fixtures` de
   * temporada escribe cientos de filas y tarda minutos.
   */
  async enqueue<T extends SyncJob>(
    name: T['name'],
    data: T['data'],
    opts?: { delay?: number; priority?: number },
  ): Promise<void> {
    await this.cola.encolar(name, data, { delayMs: opts?.delay, prioridad: opts?.priority });
  }

  private async process(tarea: Tarea): Promise<unknown> {
    const job = { name: tarea.tipo, data: tarea.datos } as SyncJob;
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
      case 'colores':
        return this.colores.execute();
      case 'match-insight':
        return this.matchInsight.execute(job.data.matchId);
      case 'match-preview':
        return this.matchInsight.executePreview(job.data.matchId);
      case 'embeddings':
        return job.data.entityType === 'team'
          ? this.embeddings.syncTeams()
          : this.embeddings.syncPlayers();
      default:
        throw new Error(`Tarea desconocida: ${tarea.tipo}`);
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
          /*
           * Y los que ya terminaron y se quedaron sin alineación: un trabajo que se pierde —la cola
           * borrada, el worker caído a mitad— dejaba el partido sin cancha hasta el refresco de las
           * 05:00. Acá se recupera en el tic siguiente, y la ventana de seis horas evita que esto
           * se convierta en un rastrillaje del archivo entero.
           */
          {
            status: 'finished',
            kickoffUtc: { gte: new Date(Date.now() - RECUPERACION_MS) },
          },
        ],
        /*
         * Sin alineación, o con una a medias: en una caída parcial el proveedor publicó los once
         * sin `formation` ni posiciones —una cancha que no se puede dibujar— y las completó horas
         * después. Una alineación sin formación se sigue pidiendo hasta que llegue entera.
         */
        AND: {
          OR: [{ lineups: { none: {} } }, { lineups: { some: { formation: null } } }],
        },
      },
      select: {
        id: true,
        status: true,
        lineups: { select: { id: true }, take: 1 },
      },
      take: 40,
    });
    if (sinDetalle.length === 0) return 0;

    const refs = await this.prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: sinDetalle.map((m) => m.id) },
      },
      select: { entityId: true, providerRef: true },
    });
    const refPorId = new Map(refs.map((r) => [r.entityId, r.providerRef]));

    let encolados = 0;
    for (const match of sinDetalle) {
      const providerRef = refPorId.get(match.id);
      if (!providerRef) continue;
      /*
       * A un terminado —o a uno cuya alineación existe pero vino a medias— se le pregunta cada
       * quince minutos, no cada tic. Cuando el proveedor tiene una caída parcial —pasó: eventos
       * sí, alineaciones no, durante horas— reinsistir cada minuto con cada partido reciente eran
       * hasta ochenta pedidos por minuto de una cuota que se comparte. Un dato que llega horas
       * tarde no se pierde por esperarlo quince minutos. Los que están en juego o por empezar sin
       * alineación alguna sí van en cada tic: ahí la alineación vale ahora o no vale.
       */
      if (match.status === 'finished' || match.lineups.length > 0) {
        const primeraVez = await this.kv.marcar(`detalle:espera:${match.id}`, 900);
        if (!primeraVez) continue;
      }
      await this.enqueue('match-detail', { matchRef: providerRef });
      encolados++;
    }
    if (encolados > 0) {
      this.logger.log(`${encolados} partidos sin alineación: encolados`);
    }
    return encolados;
  }

  private async processOutbox(): Promise<number> {
    const events = await this.outbox.pending();
    if (events.length === 0) return 0;

    /*
     * Se marca evento por evento, apenas manejado. Marcar el lote al final abría una ventana de
     * minutos: un tic degollado a mitad del lote dejaba los primeros eventos manejados pero sin
     * marcar, y el siguiente tic los encolaba de nuevo — doble derivación y doble gasto de IA.
     * Marcar cada uno acota la repetición al evento en curso, y repetir uno es barato: todo lo
     * que se encola termina en upserts idempotentes.
     */
    let handled = 0;
    for (const event of events) {
      if (event.kind === 'MATCH_FINISHED') await this.onMatchFinished(event.subjectId);
      await this.outbox.markProcessed([event.id]);
      handled++;
    }
    return handled;
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
    /* En tarea y no en línea: recorre ochocientos equipos y no cabe en una función serverless. */
    await this.enqueue('colores', {});

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
