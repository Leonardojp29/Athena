import { Injectable, Logger } from '@nestjs/common';
import { ApiBudgetExhaustedError } from '../../shared/api-budget.service.js';
import { KvService } from '../../shared/kv.service.js';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import {
  CalentarVistasUseCase,
  type VistaCalentable,
} from '../views/calentar-vistas.usecase.js';
import { PrismaService } from '../../shared/prisma.service.js';
import { logJson, reportError } from '../../shared/observability.js';
import { GenerateMatchInsightUseCase } from '../insights/generate-match-insight.usecase.js';
import { SyncEmbeddingsUseCase } from '../search/sync-embeddings.usecase.js';
import { CONFIGURED_COMPETITIONS } from '../sync/competitions.config.js';
import { RecalcularColoresUseCase } from '../sync/recalcular-colores.usecase.js';
import { OutboxService } from '../sync/outbox.service.js';
import { CerrarPartidosUseCase } from '../sync/cerrar-partidos.usecase.js';
import { ANTIGUEDAD_MAXIMA_MS } from '../sync/cierre-politica.js';
import { MatchSyncService } from '../sync/match-sync.service.js';
import { SyncCompetitionUseCase } from '../sync/sync-competition.usecase.js';
import { SyncFixturesUseCase } from '../sync/sync-fixtures.usecase.js';
import { SyncMatchDetailUseCase } from '../sync/sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from '../sync/sync-match-events.usecase.js';
import { SyncMatchPlayersUseCase } from '../sync/sync-match-players.usecase.js';
import { SyncSquadUseCase } from '../sync/sync-squad.usecase.js';
import { SyncStandingsUseCase } from '../sync/sync-standings.usecase.js';
import { SyncTeamsUseCase } from '../sync/sync-teams.usecase.js';
import { ColaDeTareas, ErrorNoReintentable, type Tarea } from './cola-de-tareas.service.js';
import { SyncScheduleService } from './sync-schedule.service.js';

/* El análisis espera a que aterricen los eventos y las estadísticas que lo respaldan. */
const INSIGHT_DELAY_MS = 3 * 60_000;
/* Lo que tarda el proveedor en recalcular su tabla después del pitazo final, con margen. */
const TABLA_REINTENTO_MS = 12 * 60_000;

/* Cuántos lotes de cierre entran en un tic: cada lote es un pedido y veinte partidos de escrituras. */
const LOTES_DE_CIERRE_POR_TIC = 3;
/* Con la cuota agotada no se insiste: el minuto se recupera solo, el día no. */
const PAUSA_POR_CUOTA_S = { minute: 60, day: 3600 } as const;

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
  | { name: 'calentar-vistas'; data: { vistas: VistaCalentable[] } }
  | { name: 'colores'; data: Record<string, never> };

@Injectable()
export class SyncQueueService {
  private readonly logger = new Logger(SyncQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: KvService,
    private readonly cache: ViewCacheService,
    private readonly calentarVistas: CalentarVistasUseCase,
    private readonly cola: ColaDeTareas,
    private readonly outbox: OutboxService,
    private readonly syncCompetition: SyncCompetitionUseCase,
    private readonly syncTeams: SyncTeamsUseCase,
    private readonly syncFixtures: SyncFixturesUseCase,
    private readonly syncStandings: SyncStandingsUseCase,
    private readonly syncMatchEvents: SyncMatchEventsUseCase,
    private readonly syncMatchDetail: SyncMatchDetailUseCase,
    private readonly cerrarPartidos: CerrarPartidosUseCase,
    private readonly matchSync: MatchSyncService,
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
    await this.kv.fijar('tick:ultimo', Date.now(), 24 * 3600);
    if (await this.pausada()) return { vivos: 0, tareas: 0 };

    const arranque = Date.now();
    await this.schedules.markRun('live-tick');
    const vivos = await this.liveTick();
    await this.cerrarLoPendiente(arranque, presupuestoMs);
    await this.schedules.markRun('process-outbox');
    await this.processOutbox();

    const hechas = await this.drenar(arranque, presupuestoMs);
    return { vivos, tareas: hechas };
  }

  private async drenar(arranque: number, presupuestoMs: number): Promise<number> {
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
          if (error instanceof ApiBudgetExhaustedError) {
            await this.pausar(error);
            await this.cola.posponer(tarea, PAUSA_POR_CUOTA_S[error.scope] * 1000, error.message);
            return hechas;
          }
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
    return hechas;
  }

  private async pausada(): Promise<boolean> {
    const marcas = await this.kv.leer(['cola:pausa']);
    return marcas.has('cola:pausa');
  }

  private async pausar(error: ApiBudgetExhaustedError): Promise<void> {
    const segundos = PAUSA_POR_CUOTA_S[error.scope];
    await this.kv.fijar('cola:pausa', 1, segundos);
    logJson('warn', 'cola_pausada', { motivo: error.scope, segundos });
  }

  /**
   * Lo que le falta a los partidos terminados, en lotes de veinte y con un pedido cada uno.
   *
   * Corre en cada tic y no solo cuando hay algo en juego: un partido que terminó mientras el latido
   * estaba caído tiene que poder recuperarse sin que nadie lo note.
   */
  private async cerrarLoPendiente(arranque: number, presupuestoMs: number): Promise<void> {
    for (let lote = 0; lote < LOTES_DE_CIERRE_POR_TIC; lote++) {
      if (Date.now() - arranque > presupuestoMs / 2) return;
      try {
        const { revisados, cerrados } = await this.cerrarPartidos.barrerTerminados();
        for (const matchId of cerrados) {
          await this.enqueue('match-insight', { matchId }, { delay: INSIGHT_DELAY_MS });
        }
        if (revisados === 0) return;
      } catch (error) {
        if (error instanceof ApiBudgetExhaustedError) return this.pausar(error);
        throw error;
      }
    }
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
      case 'calentar-vistas':
        return this.calentarVistas.ejecutar(job.data.vistas);
      case 'colores':
        return this.colores.execute();
      case 'match-insight':
        return this.matchInsight
          .execute(job.data.matchId)
          .then(() => this.matchSync.marcarAnalisis(job.data.matchId));
      case 'match-preview':
        return this.matchInsight.executePreview(job.data.matchId);
      case 'embeddings':
        return job.data.entityType === 'team'
          ? this.embeddings.syncTeams()
          : this.embeddings.syncPlayers();
      default:
        throw new ErrorNoReintentable(`Tarea desconocida: ${tarea.tipo}`);
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
    /* Va antes del corte: su propia consulta decide, y con la ventana más ancha que el feed en vivo. */
    await this.seguirLosEnCurso();
    if (candidates === 0) return 0;

    return this.syncFixtures.syncLive();
  }

  /**
   * Alineaciones y estadísticas de lo que está por empezar o en juego.
   *
   * El feed en vivo trae marcador y eventos, nunca la alineación ni la posesión. Un lote de veinte
   * partidos cuesta un pedido, así que el sábado más cargado son dos pedidos cada cinco minutos.
   */
  private async seguirLosEnCurso(): Promise<void> {
    try {
      await this.cerrarPartidos.barrerEnCurso();
    } catch (error) {
      if (error instanceof ApiBudgetExhaustedError) return this.pausar(error);
      throw error;
    }
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
   * Un partido que acaba de terminar entra en la cola del cierre y refresca su tabla.
   *
   * El detalle ya no se pide acá: lo hace el barrido, que mira el estado y no depende de que este
   * evento se haya disparado. Un partido que nació terminado —o que terminó con el latido caído—
   * se recupera igual.
   */
  private async onMatchFinished(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        kickoffUtc: true,
        homeTeam: { select: { slug: true } },
        awayTeam: { select: { slug: true } },
        season: {
          select: {
            year: true,
            competitionId: true,
            isCurrent: true,
            competition: { select: { slug: true } },
          },
        },
      },
    });
    if (!match) return;

    if (Date.now() - match.kickoffUtc.getTime() <= ANTIGUEDAD_MAXIMA_MS) {
      await this.matchSync.agendarCierre(matchId);
    }
    await this.refrescarTabla(match.season);
    await this.calentarLoQueCambio(matchId, match);
  }

  /**
   * Las páginas que este partido acaba de dejar viejas.
   *
   * Se recalculan en el worker para que el primer visitante encuentre el trabajo hecho: es la única
   * forma de que una instancia recién arrancada nunca componga una vista desde cero.
   */
  private async calentarLoQueCambio(
    matchId: string,
    match: {
      homeTeam: { slug: string };
      awayTeam: { slug: string };
      season: { competition: { slug: string } };
    },
  ): Promise<void> {
    await this.enqueue('calentar-vistas', {
      vistas: [
        { tipo: 'match', id: matchId },
        { tipo: 'team', slug: match.homeTeam.slug },
        { tipo: 'team', slug: match.awayTeam.slug },
        { tipo: 'competition', slug: match.season.competition.slug },
      ],
    });
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

  /*
   * Lo que ordena la búsqueda cuando el nombre no alcanza. Se recalcula entero porque son dos
   * barridos sobre `matches` y una escritura por equipo: segundos, una vez al día.
   */
  private async refrescarRelevancia(): Promise<void> {
    await this.prisma.$executeRaw`
      WITH conteo AS (
        SELECT equipo_id, count(*)::int AS partidos
        FROM (
          SELECT home_team_id AS equipo_id FROM matches
          UNION ALL
          SELECT away_team_id FROM matches
        ) jugados
        GROUP BY equipo_id
      )
      UPDATE teams t
      SET relevancia = conteo.partidos
      FROM conteo
      WHERE t.id = conteo.equipo_id AND t.relevancia IS DISTINCT FROM conteo.partidos
    `;
  }

  private async dailyRefresh(): Promise<void> {
    /* Red de seguridad: si el worker estuvo caído, acá se cierran los que quedaron colgados. */
    await this.syncFixtures.reconcileStale();
    /* Del detalle de los terminados se ocupa el barrido de cada tic: acá solo se limpia lo viejo. */
    await this.matchSync.podar();
    await this.cache.podar();
    await this.refrescarRelevancia();

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

    /*
     * Las vistas de las competencias en curso, calculadas antes de que nadie las pida: componerlas
     * cuesta once consultas y el primer visitante del día las pagaba enteras.
     */
    const enCurso = await this.prisma.competition.findMany({
      where: { isActive: true, seasons: { some: { isCurrent: true } } },
      select: { slug: true },
    });
    for (const { slug } of enCurso) {
      await this.enqueue('calentar-vistas', { vistas: [{ tipo: 'competition', slug }] });
    }

    /* Los colores y los vectores recorren ochocientos equipos y no cambian de un día para otro. */
    if (new Date().getUTCDay() === 1) {
      await this.enqueue('colores', {});
      await this.enqueue('embeddings', { entityType: 'team' });
    }
  }
}
