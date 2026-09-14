import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncModule } from '../modules/sync/sync.module.js';
import { SyncTransfersUseCase } from '../modules/sync/sync-transfers.usecase.js';

@Module({ imports: [SharedModule, SyncModule] })
class FichajesModule {}

/**
 * Trae los movimientos de mercado de los clubes que Athena muestra.
 *
 * Un pedido por club y un club trae el historial entero de cada futbolista que pasó por ahí, así
 * que esto es barato de verdad: los ~1.000 equipos con tabla de posiciones cuestan mil llamadas de
 * las ciento cincuenta mil del día.
 *
 * Se empieza por los clubes que alguien mira: los que tienen tabla, ordenados por relevancia, que
 * es la columna que ya cuenta cuántos partidos suyos seguimos.
 *
 *   LIMITE=300       cuántos clubes por corrida
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(FichajesModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const sync = app.get(SyncTransfersUseCase);
  const budget = app.get(ApiBudgetService);

  const limite = Number(process.env.LIMITE ?? 300);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5_000);

  const clubes = await prisma.$queryRaw<Array<{ ref: string; nombre: string }>>`
    SELECT r.provider_ref AS ref, t.name AS nombre
    FROM teams t
    JOIN external_references r
      ON r.entity_type = 'team' AND r.entity_id = t.id AND r.provider = 'api-football'
    WHERE EXISTS (SELECT 1 FROM standings s WHERE s.team_id = t.id)
    ORDER BY t.relevancia DESC
    LIMIT ${limite}
  `;

  console.log(`${clubes.length} clubes por revisar`);
  let movimientos = 0;

  for (const [indice, club] of clubes.entries()) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      break;
    }

    movimientos += await sync.execute(club.ref);
    if ((indice + 1) % 10 === 0) {
      console.log(`${indice + 1}/${clubes.length} clubes · ${movimientos} movimientos nuevos`);
    }
  }

  console.log(`Listo: ${movimientos} movimientos guardados`);
  await app.close();
}

void main();
