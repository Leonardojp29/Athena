import type { Prisma } from '@athena/database';
import type { MatchStatus } from '@athena/domain';

export interface MarcadorObservado {
  matchId: string;
  providerRef: string;
  status: MatchStatus;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

export type Marcador = Omit<MarcadorObservado, 'matchId' | 'providerRef'>;

type Ejecutor = Pick<Prisma.TransactionClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

const COLUMNAS = ['status', 'status_detail', 'elapsed_minutes', 'home_score', 'away_score'];

export function marcadorCambio(previo: Marcador, nuevo: Marcador): boolean {
  return (
    previo.status !== nuevo.status ||
    previo.statusDetail !== nuevo.statusDetail ||
    previo.elapsedMinutes !== nuevo.elapsedMinutes ||
    previo.homeScore !== nuevo.homeScore ||
    previo.awayScore !== nuevo.awayScore
  );
}

export async function escribirSiEsMasNuevo(
  db: Ejecutor,
  filas: MarcadorObservado[],
  observadoEn: Date,
): Promise<number> {
  const enJuego = filas.filter((f) => f.status !== 'finished');
  if (enJuego.length === 0) return 0;

  const params: unknown[] = [observadoEn];
  const valores = enJuego.map((f) => {
    params.push(f.matchId, f.status, f.statusDetail, f.elapsedMinutes, f.homeScore, f.awayScore);
    const i = params.length - 6;
    return `($${i + 1}::uuid, $${i + 2}::text, $${i + 3}::text, $${i + 4}::int, $${i + 5}::int, $${i + 6}::int)`;
  });

  return db.$executeRawUnsafe(
    `UPDATE matches AS t
        SET ${COLUMNAS.map((c) => `${c} = v.${c}`).join(', ')}, updated_at = now()
       FROM (VALUES ${valores.join(', ')}) AS v(id, ${COLUMNAS.join(', ')})
      WHERE t.id = v.id AND t.status <> 'finished' AND t.updated_at <= $1`,
    ...params,
  );
}

export async function cerrarPartidosYPublicar(
  db: Ejecutor,
  filas: MarcadorObservado[],
): Promise<string[]> {
  const terminados = filas.filter((f) => f.status === 'finished');
  if (terminados.length === 0) return [];

  const params: unknown[] = [];
  const valores = terminados.map((f) => {
    params.push(
      f.matchId,
      f.statusDetail,
      f.elapsedMinutes,
      f.homeScore,
      f.awayScore,
      f.providerRef,
    );
    const i = params.length - 6;
    return `($${i + 1}::uuid, $${i + 2}::text, $${i + 3}::int, $${i + 4}::int, $${i + 5}::int, $${i + 6}::text)`;
  });

  const cerrados = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `WITH cerrados AS (
       UPDATE matches AS t
          SET status = 'finished', status_detail = v.status_detail,
              elapsed_minutes = v.elapsed_minutes, home_score = v.home_score,
              away_score = v.away_score, updated_at = now()
         FROM (VALUES ${valores.join(', ')})
              AS v(id, status_detail, elapsed_minutes, home_score, away_score, provider_ref)
        WHERE t.id = v.id AND t.status <> 'finished'
        RETURNING t.id, v.home_score, v.away_score, v.provider_ref
     ),
     publicados AS (
       INSERT INTO domain_events (id, kind, subject_type, subject_id, occurred_at, payload, created_at)
       SELECT gen_random_uuid(), 'MATCH_FINISHED', 'match', id, now(),
              jsonb_build_object('homeScore', home_score, 'awayScore', away_score,
                                 'providerRef', provider_ref),
              now()
         FROM cerrados
     )
     SELECT id FROM cerrados`,
    ...params,
  );
  return cerrados.map((c) => c.id);
}

export async function sellarVistosEnVivo(db: Ejecutor, matchIds: string[]): Promise<number> {
  if (matchIds.length === 0) return 0;
  return db.$executeRawUnsafe(
    `UPDATE matches SET updated_at = now() WHERE id = ANY($1::uuid[]) AND status <> 'finished'`,
    matchIds,
  );
}
