import { Injectable } from '@nestjs/common';
import { Prisma } from '@athena/database';
import { PrismaService } from '../../shared/prisma.service.js';
import {
  ANTIGUEDAD_MAXIMA_MS,
  ESPERA_TRAS_EL_PITAZO_MS,
  type Cobertura,
  type EstadoDeCierre,
  type Faceta,
  type Veredicto,
} from './cierre-politica.js';

export interface PartidoPorCerrar {
  matchId: string;
  providerRef: string;
  kickoffUtc: Date;
  status: string;
  estado: EstadoDeCierre;
}

export interface ResumenDelCierre {
  pendientes: number;
  abandonados: number;
  cerradosHoy: number;
  completosDelDia: number;
  terminadosDelDia: number;
}

interface FilaDeCandidato {
  match_id: string;
  provider_ref: string;
  kickoff_utc: Date;
  status: string;
  eventos_completo: boolean | null;
  alineaciones_completo: boolean | null;
  estadisticas_completo: boolean | null;
  jugadores_completo: boolean | null;
  intentos: number | null;
  cobertura: Cobertura | null;
}

@Injectable()
export class MatchSyncService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los partidos terminados a los que todavía les falta algo y ya toca volver a preguntar. */
  candidatosDeCierre(limite: number): Promise<PartidoPorCerrar[]> {
    return this.candidatos(
      Prisma.sql`
        m.status = 'finished'
        AND m.kickoff_utc > now() - ${intervalo(ANTIGUEDAD_MAXIMA_MS)}::interval
      `,
      limite,
    );
  }

  /**
   * Los partidos que están por empezar o en juego.
   *
   * La alineación se publica unos cuarenta minutos antes del pitazo y las estadísticas se mueven
   * durante el partido: es la diferencia entre abrir una cancha dibujada y abrir una lista de nombres.
   */
  candidatosEnCurso(limite: number): Promise<PartidoPorCerrar[]> {
    return this.candidatos(
      Prisma.sql`
        m.status IN ('scheduled', 'in_play', 'paused')
        AND m.kickoff_utc BETWEEN now() - interval '4 hours' AND now() + interval '60 minutes'
      `,
      limite,
    );
  }

  /** Un partido puntual, sin mirar si ya estaba cerrado: es lo que pide la resincronización manual. */
  async buscar(matchId: string): Promise<PartidoPorCerrar | null> {
    const [partido] = await this.candidatos(
      Prisma.sql`m.id = ${matchId}::uuid`,
      1,
      Prisma.sql`TRUE`,
    );
    return partido ?? null;
  }

  private async candidatos(
    condicion: Prisma.Sql,
    limite: number,
    vencimiento: Prisma.Sql = Prisma.sql`(s.match_id IS NULL OR (s.cerrado_en IS NULL AND s.proximo_intento <= now()))`,
  ): Promise<PartidoPorCerrar[]> {
    const filas = await this.prisma.$queryRaw<FilaDeCandidato[]>`
      SELECT m.id AS match_id, r.provider_ref, m.kickoff_utc, m.status,
             s.eventos_completo, s.alineaciones_completo, s.estadisticas_completo,
             s.jugadores_completo, s.intentos, s.cobertura
      FROM matches m
      JOIN external_references r
        ON r.provider = 'api-football' AND r.entity_type = 'match' AND r.entity_id = m.id
      LEFT JOIN match_sync s ON s.match_id = m.id
      WHERE ${condicion} AND ${vencimiento}
      ORDER BY m.kickoff_utc DESC
      LIMIT ${limite}`;

    return filas.map((fila) => ({
      matchId: fila.match_id,
      providerRef: fila.provider_ref,
      kickoffUtc: fila.kickoff_utc,
      status: fila.status,
      estado: {
        eventosCompleto: fila.eventos_completo ?? false,
        alineacionesCompleto: fila.alineaciones_completo ?? false,
        estadisticasCompleto: fila.estadisticas_completo ?? false,
        jugadoresCompleto: fila.jugadores_completo ?? false,
        intentos: fila.intentos ?? 0,
        cobertura: fila.cobertura,
      },
    }));
  }

  /** Marca el partido para que el próximo barrido lo tome, con la cobertura de su competencia. */
  async agendar(matchId: string, desde: Date = new Date()): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO match_sync (match_id, proximo_intento, cobertura)
      SELECT m.id, ${desde}, se.cobertura
      FROM matches m JOIN seasons se ON se.id = m.season_id
      WHERE m.id = ${matchId}::uuid
      ON CONFLICT (match_id) DO UPDATE
        SET proximo_intento = EXCLUDED.proximo_intento,
            cobertura = COALESCE(EXCLUDED.cobertura, match_sync.cobertura),
            actualizado_en = now()`;
  }

  async agendarCierre(matchId: string): Promise<void> {
    await this.agendar(matchId, new Date(Date.now() + ESPERA_TRAS_EL_PITAZO_MS));
  }

  /** Vuelve a abrir un partido ya cerrado: es lo que usa la resincronización manual. */
  async reabrir(matchId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE match_sync
      SET cerrado_en = NULL, intentos = 0, proximo_intento = now(), ultimo_error = NULL,
          actualizado_en = now()
      WHERE match_id = ${matchId}::uuid`;
    await this.agendar(matchId);
  }

  async registrarIntento(
    matchId: string,
    veredicto: Veredicto,
    ultimoError: string | null,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO match_sync (match_id, eventos_completo, alineaciones_completo,
                              estadisticas_completo, jugadores_completo, intentos,
                              proximo_intento, ultimo_intento, ultimo_error, cerrado_en)
      VALUES (${matchId}::uuid, ${veredicto.completo.eventos}, ${veredicto.completo.alineaciones},
              ${veredicto.completo.estadisticas}, ${veredicto.completo.jugadores},
              ${veredicto.intentos}, ${veredicto.proximoIntento}, now(), ${ultimoError},
              ${veredicto.cerradoEn})
      ON CONFLICT (match_id) DO UPDATE
        SET eventos_completo = EXCLUDED.eventos_completo,
            alineaciones_completo = EXCLUDED.alineaciones_completo,
            estadisticas_completo = EXCLUDED.estadisticas_completo,
            jugadores_completo = EXCLUDED.jugadores_completo,
            intentos = EXCLUDED.intentos,
            proximo_intento = EXCLUDED.proximo_intento,
            ultimo_intento = EXCLUDED.ultimo_intento,
            ultimo_error = EXCLUDED.ultimo_error,
            cerrado_en = EXCLUDED.cerrado_en,
            actualizado_en = now()`;
  }

  async marcarAnalisis(matchId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE match_sync SET analisis_completo = true, actualizado_en = now()
      WHERE match_id = ${matchId}::uuid`;
  }

  async resumen(): Promise<ResumenDelCierre> {
    const [fila] = await this.prisma.$queryRaw<
      Array<Record<keyof ResumenDelCierre, bigint>>
    >`
      SELECT
        count(*) FILTER (
          WHERE m.status = 'finished' AND m.kickoff_utc > now() - interval '48 hours'
            AND (s.match_id IS NULL OR s.cerrado_en IS NULL)
        ) AS pendientes,
        count(*) FILTER (WHERE s.ultimo_error = 'abandonado') AS abandonados,
        count(*) FILTER (WHERE s.cerrado_en > now() - interval '24 hours') AS "cerradosHoy",
        count(*) FILTER (
          WHERE m.status = 'finished' AND m.kickoff_utc > now() - interval '24 hours'
            AND s.alineaciones_completo AND s.estadisticas_completo
        ) AS "completosDelDia",
        count(*) FILTER (
          WHERE m.status = 'finished' AND m.kickoff_utc > now() - interval '24 hours'
        ) AS "terminadosDelDia"
      FROM matches m
      LEFT JOIN match_sync s ON s.match_id = m.id
      WHERE m.kickoff_utc > now() - interval '30 days'`;

    return {
      pendientes: Number(fila?.pendientes ?? 0),
      abandonados: Number(fila?.abandonados ?? 0),
      cerradosHoy: Number(fila?.cerradosHoy ?? 0),
      completosDelDia: Number(fila?.completosDelDia ?? 0),
      terminadosDelDia: Number(fila?.terminadosDelDia ?? 0),
    };
  }

  /** Una fila cerrada hace meses no le sirve a nadie y la tabla tiene que seguir siendo chica. */
  async podar(): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM match_sync WHERE cerrado_en < now() - interval '90 days'`;
  }

  async facetasDe(matchId: string): Promise<Record<Faceta, boolean> | null> {
    const fila = await this.prisma.matchSync.findUnique({ where: { matchId } });
    if (!fila) return null;
    return {
      eventos: fila.eventosCompleto,
      alineaciones: fila.alineacionesCompleto,
      estadisticas: fila.estadisticasCompleto,
      jugadores: fila.jugadoresCompleto,
    };
  }
}

function intervalo(ms: number): string {
  return `${Math.round(ms / 1000)} seconds`;
}
