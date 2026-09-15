import { Inject, Injectable } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatch, ProviderRef } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { MatchEventWriter } from './match-event.writer.js';
import {
  cerrarPartidosYPublicar,
  escribirSiEsMasNuevo,
  marcadorCambio,
  sellarVistosEnVivo,
  type MarcadorObservado,
} from './marcador-writer.js';

export interface ResultadoDelLatido {
  pedidos: number;
  vistos: number;
  cambiados: number;
  cerrados: number;
}

const SIN_TRABAJO: ResultadoDelLatido = { pedidos: 0, vistos: 0, cambiados: 0, cerrados: 0 };
const MAXIMO_A_CONFIRMAR = 20;

interface Candidato extends MarcadorObservado {
  enJuego: boolean;
}

@Injectable()
export class SyncMarcadorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ViewCacheService,
    private readonly eventWriter: MatchEventWriter,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async latir(): Promise<ResultadoDelLatido> {
    const candidatos = await this.candidatos();
    if (candidatos.length === 0) return SIN_TRABAJO;

    const feed = await this.provider.getLiveMatches();
    const observadoEn = new Date();

    const porRef = new Map(candidatos.map((c) => [c.providerRef, c]));
    const enElFeed = feed.filter((l) => porRef.has(l.match.providerRef));
    const observados = enElFeed.map((l) =>
      aMarcador(l.match, porRef.get(l.match.providerRef)?.matchId as string),
    );

    const cambiados = observados.filter((o) =>
      marcadorCambio(porRef.get(o.providerRef) as MarcadorObservado, o),
    );

    await escribirSiEsMasNuevo(this.prisma, cambiados, observadoEn);
    const cerrados = await cerrarPartidosYPublicar(this.prisma, cambiados);

    const yaEscritos = new Set(cambiados.map((c) => c.matchId));
    await sellarVistosEnVivo(
      this.prisma,
      observados.filter((o) => !yaEscritos.has(o.matchId)).map((o) => o.matchId),
    );

    const cambiaronDeVerdad = new Set(cambiados.map((c) => c.providerRef));
    for (const item of enElFeed) {
      if (item.events.length > 0 && cambiaronDeVerdad.has(item.match.providerRef)) {
        const id = porRef.get(item.match.providerRef)?.matchId;
        if (id) await this.eventWriter.replace(this.provider.name, id, item.events);
      }
    }

    const desaparecidos = await this.cerrarLosQueYaNoEstan(candidatos, porRef, feed);
    const todosLosCerrados = [...cerrados, ...desaparecidos];

    await this.invalidar(cambiados.map((c) => c.matchId), todosLosCerrados.length > 0);

    return {
      pedidos: desaparecidos.length > 0 ? 2 : 1,
      vistos: observados.length,
      cambiados: cambiados.length,
      cerrados: todosLosCerrados.length,
    };
  }

  /** El feed en vivo solo trae lo que está en cancha: un partido que termina desaparece de ahí. */
  private async cerrarLosQueYaNoEstan(
    candidatos: Candidato[],
    porRef: Map<string, Candidato>,
    feed: Array<{ match: ProviderRef<ProviderMatch> }>,
  ): Promise<string[]> {
    const vistos = new Set(feed.map((l) => l.match.providerRef));
    const ausentes = candidatos
      .filter((c) => c.enJuego && !vistos.has(c.providerRef))
      .slice(0, MAXIMO_A_CONFIRMAR);
    if (ausentes.length === 0) return [];

    const reales = await this.provider.getMatchesByRefs(ausentes.map((a) => a.providerRef));
    const terminados = reales
      .filter((r) => r.data.status === 'finished')
      .map((r) => aMarcador(r, porRef.get(r.providerRef)?.matchId as string));

    return cerrarPartidosYPublicar(this.prisma, terminados);
  }

  private async candidatos(): Promise<Candidato[]> {
    const filas = await this.prisma.$queryRaw<
      Array<{
        id: string;
        provider_ref: string;
        status: string;
        status_detail: string | null;
        elapsed_minutes: number | null;
        home_score: number | null;
        away_score: number | null;
      }>
    >`
      SELECT m.id, r.provider_ref, m.status, m.status_detail,
             m.elapsed_minutes, m.home_score, m.away_score
      FROM matches m
      JOIN external_references r
        ON r.entity_type = 'match' AND r.entity_id = m.id AND r.provider = ${this.provider.name}
      WHERE m.status IN ('in_play', 'paused')
         OR (m.status = 'scheduled'
             AND m.kickoff_utc BETWEEN now() - interval '4 hours' AND now() + interval '30 minutes')`;

    return filas.map((f) => ({
      matchId: f.id,
      providerRef: f.provider_ref,
      status: f.status as Candidato['status'],
      statusDetail: f.status_detail,
      elapsedMinutes: f.elapsed_minutes,
      homeScore: f.home_score,
      awayScore: f.away_score,
      enJuego: f.status === 'in_play' || f.status === 'paused',
    }));
  }

  private async invalidar(matchIds: string[], cambioElConteo: boolean): Promise<void> {
    const claves = matchIds.map((id) => `match:${id}`);
    if (cambioElConteo) claves.push('en-vivo');
    await this.cache.borrarVarias(claves);
  }
}

function aMarcador(fixture: ProviderRef<ProviderMatch>, matchId: string): MarcadorObservado {
  return {
    matchId,
    providerRef: fixture.providerRef,
    status: fixture.data.status,
    statusDetail: fixture.data.statusDetail,
    elapsedMinutes: fixture.data.elapsedMinutes,
    homeScore: fixture.data.homeScore,
    awayScore: fixture.data.awayScore,
  };
}
