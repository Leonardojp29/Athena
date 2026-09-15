import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatch, ProviderRef } from '@athena/domain';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { bulkUpdate } from './bulk-upsert.js';
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
 * Cuánto silencio delata a un partido que ya terminó.
 *
 * El feed en vivo trae solo lo que está en cancha y el tick lo recorre cada minuto, así que mientras
 * un partido se juega su fila se toca todo el tiempo. Cuando termina desaparece del feed y deja de
 * tocarse: diez minutos sin novedad de un partido "en juego" es que ya no lo está. Antes había que
 * esperar las tres horas del margen de arriba, y mientras tanto la web mostraba un 90' clavado en un
 * partido que había terminado hacía rato.
 */
const SILENCIO_EN_VIVO_MS = 10 * 60_000;

/*
 * Hasta dónde se mira atrás por partidos que nadie cerró. Cubre una semana larga de worker caído
 * —el caso real: la máquina apagada de un viernes al otro— sin volver a preguntar para siempre por
 * un aplazado de 2020 o por una llave de copa que el proveedor dejó en TBD.
 */
const VENTANA_OLVIDADOS_MS = 14 * 24 * 3600_000;

/* Techo por corrida: un request por cada veinte, así el peor caso son diez llamadas. */
const MAX_OLVIDADOS = 200;

const TTL_DE_TEMPORADAS_S = 600;

@Injectable()
export class SyncFixturesUseCase {
  private readonly logger = new Logger(SyncFixturesUseCase.name);
  private readonly temporadaPorTorneo = new Memoria<string | null>(2000);

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
    const { escritos } = await this.upsertMany(fixtures, { observadoEn: new Date() });
    return escritos;
  }

  async syncLive(): Promise<number> {
    const live = await this.provider.getLiveMatches();
    const observadoEn = new Date();
    // live=all trae todas las ligas del mundo: las no cubiertas se descartan sin warning
    const { escritos, idPorRef } = await this.upsertMany(
      live.map((l) => l.match),
      { quiet: true, observadoEn },
    );

    for (const item of live.filter((l) => l.events.length > 0)) {
      const id = idPorRef.get(item.match.providerRef);
      if (id) await this.eventWriter.replace(this.provider.name, id, item.events);
    }
    return escritos;
  }

  /**
   * Cierra los partidos que ya se jugaron y quedaron con un estado viejo.
   *
   * Son dos agujeros del feed en vivo, que contiene SOLO lo que está en juego:
   *
   * 1. **El que se quedó en juego.** Cuando un partido termina desaparece del feed y nadie vuelve a
   *    tocar su fila, así que quedaba clavado en 2H 90' con el marcador de la última vez que
   *    apareció, y nunca disparaba MATCH_FINISHED. Se lo reconoce por el silencio: diez minutos sin
   *    que el tick lo toque, aunque haya empezado hace media hora.
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
          {
            status: { in: ['in_play', 'paused'] },
            OR: [
              { kickoffUtc: { lt: limite } },
              { updatedAt: { lt: new Date(ahora - SILENCIO_EN_VIVO_MS) } },
            ],
          },
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
    const { escritos } = await this.upsertMany(reales, { quiet: true, observadoEn: new Date() });
    this.logger.log(`Reconciliados ${escritos}/${colgados.length} partidos con estado viejo`);
    return escritos;
  }

  private async upsertMany(
    fixtures: ProviderRef<ProviderMatch>[],
    opts: { quiet?: boolean; observadoEn?: Date } = {},
  ): Promise<{ escritos: number; idPorRef: Map<string, string> }> {
    const idPorRef = new Map<string, string>();
    if (fixtures.length === 0) return { escritos: 0, idPorRef };

    const observadoEn = opts.observadoEn ?? new Date();
    const teamRefs = [
      ...new Set(fixtures.flatMap((f) => [f.data.homeTeamRef, f.data.awayTeamRef])),
    ];
    const [teams, conocidos] = await Promise.all([
      this.refs.resolveMany(this.provider.name, 'team', teamRefs),
      this.refs.resolveMany(
        this.provider.name,
        'match',
        fixtures.map((f) => f.providerRef),
      ),
    ]);
    const seasons = await this.temporadasDe(fixtures, teams);

    const resolvable = fixtures.filter((f) => {
      const ok =
        seasons.has(llaveDeTemporada(f)) &&
        teams.has(f.data.homeTeamRef) &&
        teams.has(f.data.awayTeamRef);
      if (!ok && !opts.quiet)
        this.logger.warn(`Skipping fixture ${f.providerRef}: unresolved season/team refs`);
      return ok;
    });
    if (resolvable.length === 0) return { escritos: 0, idPorRef: conocidos };

    // después del filtro: live=all trae el mundo entero y crearíamos sus estadios cada minuto
    const venueIds = await this.venues.resolveMany(resolvable.map((f) => f.data.venue));

    const columnas = (fixture: ProviderRef<ProviderMatch>) => {
      const { data } = fixture;
      return {
        season_id: seasons.get(llaveDeTemporada(fixture)) as string,
        round: data.round,
        home_team_id: teams.get(data.homeTeamRef) as string,
        away_team_id: teams.get(data.awayTeamRef) as string,
        kickoff_utc: new Date(data.kickoffUtc),
        status: data.status,
        status_detail: data.statusDetail,
        elapsed_minutes: data.elapsedMinutes,
        home_score: data.homeScore,
        away_score: data.awayScore,
        venue_id: data.venue ? (venueIds.get(data.venue.providerRef) ?? null) : null,
      };
    };

    for (const [ref, id] of conocidos) idPorRef.set(ref, id);
    const nuevos = resolvable.filter((f) => !conocidos.has(f.providerRef));
    const existentes = resolvable.filter((f) => conocidos.has(f.providerRef));

    for (const [ref, id] of await this.crear(nuevos, columnas)) idPorRef.set(ref, id);
    const actualizados = await this.actualizar(existentes, conocidos, columnas, observadoEn);

    this.logger.log(
      `Fixtures: ${nuevos.length} created, ${actualizados} updated, ${fixtures.length - resolvable.length} skipped`,
    );
    return { escritos: resolvable.length, idPorRef };
  }

  private async crear(
    nuevos: ProviderRef<ProviderMatch>[],
    columnas: (f: ProviderRef<ProviderMatch>) => Record<string, unknown>,
  ): Promise<Map<string, string>> {
    const creados = new Map<string, string>();
    if (nuevos.length === 0) return creados;

    /*
     * Partido y referencia nacen juntos o no nace ninguno: sin transacción, una función degollada
     * entre los dos pasos deja partidos invisibles para el sync y duplicados en el siguiente.
     */
    await this.prisma.$transaction(async (tx) => {
      const filas = await tx.match.createManyAndReturn({
        data: nuevos.map((f) => aPrisma(columnas(f))),
        select: { id: true },
      });
      await tx.externalReference.createMany({
        data: filas.map((match, i) => {
          const providerRef = nuevos[i]?.providerRef as string;
          creados.set(providerRef, match.id);
          return {
            provider: this.provider.name,
            entityType: 'match',
            providerRef,
            entityId: match.id,
          };
        }),
      });
    });
    return creados;
  }

  private async actualizar(
    existentes: ProviderRef<ProviderMatch>[],
    conocidos: Map<string, string>,
    columnas: (f: ProviderRef<ProviderMatch>) => Record<string, unknown>,
    observadoEn: Date,
  ): Promise<number> {
    if (existentes.length === 0) return 0;

    const previos = await this.prisma.match.findMany({
      where: { id: { in: existentes.map((f) => conocidos.get(f.providerRef) as string) } },
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
    const previoPorId = new Map(previos.map((m) => [m.id, m]));

    const cambiados = existentes
      .map((fixture) => ({
        fixture,
        id: conocidos.get(fixture.providerRef) as string,
        campos: columnas(fixture),
      }))
      .filter(({ id, campos }) => difiere(previoPorId.get(id), campos));
    if (cambiados.length === 0) return 0;

    const terminan = cambiados.filter(
      ({ id, campos }) =>
        campos.status === 'finished' && previoPorId.get(id)?.status !== 'finished',
    );
    const siguen = cambiados.filter((c) => !terminan.includes(c));

    if (siguen.length > 0) {
      await bulkUpdate(this.prisma, {
        table: 'matches',
        columns: COLUMNAS_DE_PARTIDO,
        rows: siguen.map(({ id, campos }) => ({ id, ...campos })),
        noPisarLoEscritoDespuesDe: observadoEn,
      });
    }

    for (const { id, fixture, campos } of terminan) {
      await this.prisma.match.update({ where: { id }, data: aPrisma(campos) });
      await this.events.publish('MATCH_FINISHED', 'match', id, {
        homeScore: campos.home_score as number | null,
        awayScore: campos.away_score as number | null,
        providerRef: fixture.providerRef,
      });
    }

    return cambiados.length;
  }

  private async temporadasDe(
    fixtures: ProviderRef<ProviderMatch>[],
    teams: Map<string, string>,
  ): Promise<Map<string, string>> {
    const conEquipos = fixtures.filter(
      (f) => teams.has(f.data.homeTeamRef) && teams.has(f.data.awayTeamRef),
    );
    const llaves = [...new Set(conEquipos.map(llaveDeTemporada))];

    const resueltas = new Map<string, string>();
    const pendientes: string[] = [];
    for (const llave of llaves) {
      const recordada = this.temporadaPorTorneo.get(llave);
      if (recordada === undefined) pendientes.push(llave);
      else if (recordada !== null) resueltas.set(llave, recordada);
    }
    if (pendientes.length === 0) return resueltas;

    const competitions = await this.refs.resolveMany(
      this.provider.name,
      'competition',
      [...new Set(pendientes.map((llave) => llave.split(':')[0] as string))],
    );
    const buscadas = pendientes.flatMap((llave) => {
      const [competitionRef, year] = llave.split(':') as [string, string];
      const competitionId = competitions.get(competitionRef);
      return competitionId ? [{ llave, competitionId, year: Number(year) }] : [];
    });

    const filas =
      buscadas.length === 0
        ? []
        : await this.prisma.season.findMany({
            where: { OR: buscadas.map(({ competitionId, year }) => ({ competitionId, year })) },
            select: { id: true, competitionId: true, year: true },
          });
    const idPorTorneo = new Map(filas.map((s) => [`${s.competitionId}:${s.year}`, s.id]));

    for (const llave of pendientes) {
      const buscada = buscadas.find((b) => b.llave === llave);
      const id = buscada ? idPorTorneo.get(`${buscada.competitionId}:${buscada.year}`) : undefined;
      this.temporadaPorTorneo.set(llave, id ?? null, TTL_DE_TEMPORADAS_S);
      if (id) resueltas.set(llave, id);
    }
    return resueltas;
  }
}

const COLUMNAS_DE_PARTIDO = [
  { name: 'id', cast: '::uuid' },
  { name: 'season_id', cast: '::uuid' },
  { name: 'round', cast: '::text' },
  { name: 'home_team_id', cast: '::uuid' },
  { name: 'away_team_id', cast: '::uuid' },
  { name: 'kickoff_utc', cast: '::timestamptz' },
  { name: 'status', cast: '::text' },
  { name: 'status_detail', cast: '::text' },
  { name: 'elapsed_minutes', cast: '::int' },
  { name: 'home_score', cast: '::int' },
  { name: 'away_score', cast: '::int' },
  { name: 'venue_id', cast: '::uuid' },
];

const llaveDeTemporada = (f: ProviderRef<ProviderMatch>): string =>
  `${f.data.competitionRef}:${f.data.seasonYear}`;

interface PartidoPrevio {
  status: string;
  statusDetail: string | null;
  homeScore: number | null;
  awayScore: number | null;
  elapsedMinutes: number | null;
  kickoffUtc: Date;
}

function difiere(previo: PartidoPrevio | undefined, campos: Record<string, unknown>): boolean {
  if (!previo) return true;
  return (
    previo.status !== campos.status ||
    previo.statusDetail !== campos.status_detail ||
    previo.homeScore !== campos.home_score ||
    previo.awayScore !== campos.away_score ||
    previo.elapsedMinutes !== campos.elapsed_minutes ||
    previo.kickoffUtc.getTime() !== (campos.kickoff_utc as Date).getTime()
  );
}

function aPrisma(campos: Record<string, unknown>) {
  return {
    seasonId: campos.season_id as string,
    round: campos.round as string | null,
    homeTeamId: campos.home_team_id as string,
    awayTeamId: campos.away_team_id as string,
    kickoffUtc: campos.kickoff_utc as Date,
    status: campos.status as string,
    statusDetail: campos.status_detail as string | null,
    elapsedMinutes: campos.elapsed_minutes as number | null,
    homeScore: campos.home_score as number | null,
    awayScore: campos.away_score as number | null,
    venueId: campos.venue_id as string | null,
  };
}
