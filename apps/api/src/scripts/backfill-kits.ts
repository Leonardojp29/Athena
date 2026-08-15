import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncMatchDetailUseCase } from '../modules/sync/sync-match-detail.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class KitsModule {}

/**
 * Siembra el color de camiseta de las alineaciones que ya están guardadas.
 *
 * El color del club sale de la moda de sus partidos **de local**, y esa moda necesita muestras. Desde
 * ahora cada alineación que se sincroniza deja la suya, pero un club junta dos por mes: recién a fin
 * de temporada habría siete u ocho. Esto adelanta lo que ya está jugado —Alianza tiene doce partidos
 * de local esta temporada, Universitario quince, Cristal dieciocho— a un request por partido.
 *
 * Por eso va acotado y no sobre los 4 350 partidos con alineación: el presupuesto es compartido con
 * otros sistemas de la empresa. `BACKFILL_EQUIPOS` toma slugs separados por coma; sin él, recorre los
 * equipos que ya tienen partidos de local con alineación, del más reciente al más viejo.
 */
const PISO_DE_CUOTA = 200;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(KitsModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);
  const budget = app.get(ApiBudgetService);
  const detalle = app.get(SyncMatchDetailUseCase);

  const slugs = (process.env.BACKFILL_EQUIPOS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const limite = Number(process.env.BACKFILL_LIMIT ?? 60);

  /*
   * Los partidos donde el equipo jugó de local y su alineación todavía no tiene color. Un request
   * trae los dos equipos, así que un partido puede sembrar dos muestras: la del local, que es la que
   * importa, y la del visitante, que servirá cuando le toque a él.
   */
  const partidos = await prisma.$queryRaw<Array<{ match_id: string; slug: string }>>`
    SELECT DISTINCT l.match_id, t.slug
    FROM match_lineups l
    JOIN matches m ON m.id = l.match_id AND m.home_team_id = l.team_id
    JOIN teams t ON t.id = l.team_id
    JOIN seasons s ON s.id = m.season_id AND s.is_current
    WHERE l.kit_color IS NULL
      AND (${slugs.length === 0} OR t.slug = ANY(${slugs}::text[]))
    ORDER BY l.match_id DESC
    LIMIT ${limite}`;

  const refs = new Map(
    (
      await prisma.externalReference.findMany({
        where: {
          provider: 'api-football',
          entityType: 'match',
          entityId: { in: partidos.map((p) => p.match_id) },
        },
        select: { entityId: true, providerRef: true },
      })
    ).map((r) => [r.entityId, r.providerRef]),
  );

  console.log(`${partidos.length} partidos de local por muestrear`);
  let muestras = 0;
  let fallos = 0;

  for (const [i, partido] of partidos.entries()) {
    const ref = refs.get(partido.match_id);
    if (!ref) continue;

    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < PISO_DE_CUOTA) {
      console.log(`Cuota en ${dayRemaining}: se corta acá y se sigue mañana`);
      break;
    }

    try {
      muestras += await detalle.muestrearKits(ref);
    } catch (error) {
      fallos++;
      console.error(`  ✗ ${ref}: ${String(error).slice(0, 120)}`);
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${partidos.length} · ${muestras} muestras (fallos ${fallos})`);
    }
  }

  console.log(`Terminado: ${muestras} muestras nuevas, ${fallos} fallos`);
  await app.close();
}

void main();
