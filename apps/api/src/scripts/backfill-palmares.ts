import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncModule } from '../modules/sync/sync.module.js';
import { SyncTrophiesUseCase } from '../modules/sync/sync-trophies.usecase.js';

@Module({ imports: [SharedModule, SyncModule] })
class PalmaresModule {}

/**
 * Trae el palmarés de los futbolistas que Athena muestra.
 *
 * Cuesta un pedido por jugador, así que **no se encola**: con 46.350 futbolistas en la base, un
 * sembrado automático metería otras cuarenta mil tareas en una cola que ya está atrasada. Esto es
 * la manija para traerlo por tandas, empezando por quienes de verdad aparecen en una pantalla.
 *
 * El orden es por minutos jugados en la temporada: si la tanda se corta, se cortó en los que menos
 * se miran.
 *
 *   LIMITE=500       cuántos futbolistas por corrida
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 *   REHACER=1        vuelve a pedir los que ya tienen palmarés
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(PalmaresModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const sync = app.get(SyncTrophiesUseCase);
  const budget = app.get(ApiBudgetService);

  const limite = Number(process.env.LIMITE ?? 500);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5_000);
  const rehacer = process.env.REHACER === '1';

  const candidatos = await prisma.$queryRaw<Array<{ ref: string; nombre: string }>>`
    SELECT r.provider_ref AS ref, p.name AS nombre
    FROM players p
    JOIN external_references r
      ON r.entity_type = 'player' AND r.entity_id = p.id AND r.provider = 'api-football'
    JOIN player_season_statistics s ON s.player_id = p.id
    GROUP BY r.provider_ref, p.name, p.id
    HAVING ${rehacer} OR NOT EXISTS (SELECT 1 FROM player_trophies t WHERE t.player_id = p.id)
    ORDER BY sum(coalesce(s.minutes_played, 0)) DESC
    LIMIT ${limite}
  `;

  console.log(`${candidatos.length} futbolistas por revisar`);
  let conPalmares = 0;
  let titulos = 0;

  for (const [indice, jugador] of candidatos.entries()) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      break;
    }

    const cuantos = await sync.execute(jugador.ref);
    if (cuantos > 0) {
      conPalmares += 1;
      titulos += cuantos;
    }
    if ((indice + 1) % 25 === 0) {
      console.log(`${indice + 1}/${candidatos.length} · ${conPalmares} con palmarés · ${titulos} títulos`);
    }
  }

  console.log(`Listo: ${conPalmares} futbolistas con palmarés, ${titulos} títulos guardados`);
  await app.close();
}

void main();
