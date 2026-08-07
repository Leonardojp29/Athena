import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { FootballDataProvider } from '@athena/domain';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { FOOTBALL_DATA_PROVIDER } from '../modules/providers/provider.tokens.js';
import { ApiFootballModule } from '../modules/providers/api-football/api-football.module.js';
import { ExternalReferenceService } from '../modules/sync/external-reference.service.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule, ApiFootballModule] })
class ColoresModule {}

/**
 * Rellena los colores de camiseta de los equipos que ya están en la base.
 *
 * El proveedor los manda en `/fixtures/lineups` y en ningún otro endpoint, así que el sync los
 * escribe desde hoy en adelante; esto cubre lo viejo. Cada partido trae los dos equipos, así que se
 * eligen partidos que aporten al menos uno nuevo: 1 512 equipos se cubren con la mitad de pedidos.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ColoresModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const refs = app.get(ExternalReferenceService);
  const budget = app.get(ApiBudgetService);
  const provider = app.get<FootballDataProvider>(FOOTBALL_DATA_PROVIDER);

  const limite = Number(process.env.BACKFILL_LIMIT ?? 1200);

  /* Los partidos más recientes primero: la camiseta de este año es la que importa. */
  const filas = await prisma.$queryRaw<Array<{ match_id: string; team_ids: string[] }>>`
    SELECT l.match_id, array_agg(l.team_id::text) AS team_ids
    FROM match_lineups l
    JOIN matches m ON m.id = l.match_id
    WHERE EXISTS (
      SELECT 1 FROM teams t WHERE t.id = l.team_id AND t.primary_color IS NULL
    )
    GROUP BY l.match_id, m.kickoff_utc
    ORDER BY m.kickoff_utc DESC`;

  /* Greedy: un partido se pide solo si todavía aporta un equipo sin color. */
  const cubiertos = new Set<string>();
  const elegidos: string[] = [];
  for (const fila of filas) {
    if (elegidos.length >= limite) break;
    if (fila.team_ids.some((id) => !cubiertos.has(id))) {
      elegidos.push(fila.match_id);
      for (const id of fila.team_ids) cubiertos.add(id);
    }
  }

  const porId = new Map(
    (
      await prisma.externalReference.findMany({
        where: { provider: 'api-football', entityType: 'match', entityId: { in: elegidos } },
        select: { entityId: true, providerRef: true },
      })
    ).map((r) => [r.entityId, r.providerRef]),
  );

  console.log(`${elegidos.length} partidos para cubrir ${cubiertos.size} equipos`);
  let escritos = 0;
  let fallos = 0;

  for (const [i, matchId] of elegidos.entries()) {
    const ref = porId.get(matchId);
    if (!ref) continue;
    try {
      const lineups = await provider.getMatchLineups(ref);
      const teamIds = await refs.resolveMany(
        'api-football',
        'team',
        lineups.map((l) => l.teamRef),
      );
      for (const lineup of lineups) {
        const teamId = teamIds.get(lineup.teamRef);
        if (!teamId) continue;
        if (lineup.colors.primary === null && lineup.colors.secondary === null) continue;
        await prisma.team.update({
          where: { id: teamId },
          data: {
            ...(lineup.colors.primary !== null ? { primaryColor: lineup.colors.primary } : {}),
            ...(lineup.colors.secondary !== null
              ? { secondaryColor: lineup.colors.secondary }
              : {}),
          },
        });
        escritos++;
      }
    } catch (error) {
      fallos++;
      console.error(`  ✗ ${ref}: ${String(error).slice(0, 120)}`);
    }

    if ((i + 1) % 50 === 0) {
      const { dayRemaining } = await budget.snapshot();
      console.log(
        `  ${i + 1}/${elegidos.length} · ${escritos} equipos con color (fallos ${fallos}) · cuota ${dayRemaining ?? '?'}`,
      );
    }
  }

  console.log(`Terminado: ${escritos} equipos con color, ${fallos} fallos`);
  await app.close();
}

void main();
