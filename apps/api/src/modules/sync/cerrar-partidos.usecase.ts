import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatchDetail } from '@athena/domain';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { logJson } from '../../shared/observability.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { evaluarIntento, faseDe, type LlegadaDeFacetas } from './cierre-politica.js';
import { MatchEventWriter } from './match-event.writer.js';
import { MatchSyncService, type PartidoPorCerrar } from './match-sync.service.js';
import { SyncMatchDetailUseCase } from './sync-match-detail.usecase.js';
import { SyncMatchPlayersUseCase } from './sync-match-players.usecase.js';

export const PARTIDOS_POR_LOTE = Number(process.env.CIERRE_LOTE ?? 20);

export interface ResultadoDelCierre {
  pedidos: number;
  revisados: number;
  cerrados: string[];
}

/**
 * Cerrar un partido es traer todo lo que le falta con un pedido compartido entre veinte.
 *
 * Antes cada faceta era un request por partido y solo se pedían al verlo terminar: si el latido no
 * corría en ese minuto, el partido se quedaba sin alineaciones para siempre. Ahora el estado manda
 * —`match_sync` dice qué falta y cuándo reintentar— y el proveedor lo devuelve todo junto.
 */
@Injectable()
export class CerrarPartidosUseCase {
  private readonly logger = new Logger(CerrarPartidosUseCase.name);

  constructor(
    private readonly sync: MatchSyncService,
    private readonly detalle: SyncMatchDetailUseCase,
    private readonly jugadores: SyncMatchPlayersUseCase,
    private readonly eventos: MatchEventWriter,
    private readonly cache: ViewCacheService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async barrerTerminados(limite = PARTIDOS_POR_LOTE): Promise<ResultadoDelCierre> {
    return this.cerrarLote(await this.sync.candidatosDeCierre(limite));
  }

  async barrerEnCurso(limite = PARTIDOS_POR_LOTE): Promise<ResultadoDelCierre> {
    return this.cerrarLote(await this.sync.candidatosEnCurso(limite));
  }

  /** Un partido puntual, cueste lo que cueste: la salida de emergencia cuando algo quedó mal. */
  async forzarUno(matchId: string): Promise<ResultadoDelCierre> {
    await this.sync.reabrir(matchId);
    const partido = await this.sync.buscar(matchId);
    return partido ? this.cerrarLote([partido]) : { pedidos: 0, revisados: 0, cerrados: [] };
  }

  async cerrarLote(
    partidos: PartidoPorCerrar[],
    antiguedadMaximaMs?: number,
  ): Promise<ResultadoDelCierre> {
    if (partidos.length === 0) return { pedidos: 0, revisados: 0, cerrados: [] };

    const detalles = await this.provider.getMatchDetails(partidos.map((p) => p.providerRef));
    const porRef = new Map(detalles.map((d) => [d.match.providerRef, d]));

    const cerrados: string[] = [];
    for (const partido of partidos) {
      /* Un partido que revienta no puede llevarse el lote entero: queda anotado y sigue el resto. */
      try {
        const cerrado = await this.cerrarUno(
          partido,
          porRef.get(partido.providerRef),
          antiguedadMaximaMs,
        );
        if (cerrado) cerrados.push(partido.matchId);
      } catch (error) {
        this.logger.error(`Partido ${partido.providerRef}: ${String(error).slice(0, 160)}`);
        await this.sync.anotarFallo(partido.matchId, String(error).slice(0, 200));
      }
    }

    const pedidos = Math.ceil(partidos.length / 20);
    logJson('info', 'cierre_de_partidos', {
      partidos: partidos.length,
      pedidos,
      cerrados: cerrados.length,
    });
    return { pedidos, revisados: partidos.length, cerrados };
  }

  private async cerrarUno(
    partido: PartidoPorCerrar,
    detalle: ProviderMatchDetail | undefined,
    antiguedadMaximaMs?: number,
  ): Promise<boolean> {
    const llegada = detalle
      ? await this.escribir(partido, detalle)
      : { eventos: null, alineaciones: null, estadisticas: null, jugadores: null };

    const veredicto = evaluarIntento({
      estado: partido.estado,
      llegada,
      fase: faseDe(partido.status),
      kickoff: partido.kickoffUtc,
      ahora: new Date(),
      antiguedadMaximaMs,
    });

    await this.sync.registrarIntento(
      partido.matchId,
      veredicto,
      detalle ? null : 'el proveedor no devolvió el partido',
    );
    this.cache.borrar(`match:${partido.matchId}`);

    if (veredicto.motivo === 'abandonado') {
      this.logger.warn(`Partido ${partido.providerRef} abandonado sin detalle completo`);
    }
    return veredicto.cerradoEn !== null && veredicto.motivo === 'completo';
  }

  private async escribir(
    partido: PartidoPorCerrar,
    detalle: ProviderMatchDetail,
  ): Promise<LlegadaDeFacetas> {
    const { estado, matchId } = partido;

    /*
     * En serie y no en paralelo: el resolutor de jugadores abre una transacción interactiva, y con
     * las otras tres escrituras compitiendo por el pooler esa transacción caduca antes de cerrarse.
     */
    const eventos =
      detalle.events && !estado.eventosCompleto
        ? await this.eventos.replace(this.provider.name, matchId, detalle.events)
        : null;
    const alineaciones =
      detalle.lineups && !estado.alineacionesCompleto
        ? await this.detalle.escribirAlineaciones(matchId, detalle.lineups)
        : null;
    const estadisticas =
      detalle.statistics && !estado.estadisticasCompleto
        ? await this.detalle.escribirEstadisticas(matchId, detalle.statistics)
        : null;
    const jugadores =
      detalle.playerStatistics && !estado.jugadoresCompleto
        ? await this.jugadores.escribir(matchId, detalle.playerStatistics)
        : null;

    return { eventos, alineaciones, estadisticas, jugadores };
  }
}
