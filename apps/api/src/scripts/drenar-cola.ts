import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SyncQueueService } from '../modules/worker/sync-queue.service.js';
import { WorkerModule } from '../modules/worker/worker.module.js';

/**
 * Vacía la cola de tareas de una vez.
 *
 * El tic del worker ya drena, pero con lo que le sobra: el latido en vivo se lleva unos cien
 * segundos de cada ciclo —los partidos en curso cuestan varios endpoints cada uno— y a la cola le
 * quedan veinticinco. Con semanas de atraso eso son horas; acá no compite con nadie.
 *
 *   MINUTOS=30       hasta cuándo insistir
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['warn', 'error'],
  });
  const cola = app.get(SyncQueueService);
  const budget = app.get(ApiBudgetService);
  const prisma = app.get(PrismaService);

  const minutos = Number(process.env.MINUTOS ?? 30);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5_000);
  const hastaCuando = Date.now() + minutos * 60_000;

  const pendientes = async (): Promise<number> =>
    (await prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM tareas`)[0]?.n ?? 0;

  const arranque = Date.now();
  const alEmpezar = await pendientes();
  console.log(`${alEmpezar} tareas en la cola`);

  let hechas = 0;
  while (Date.now() < hastaCuando) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      break;
    }

    /* Tandas cortas para poder mirar la cuota entre una y otra sin frenar el drenado. */
    const enLaTanda = await cola.drenar(Math.min(Date.now() + 30_000, hastaCuando));
    if (enLaTanda === 0) {
      console.log('Cola vacía');
      break;
    }

    hechas += enLaTanda;
    const porSegundo = hechas / ((Date.now() - arranque) / 1000);
    const quedan = await pendientes();
    console.log(
      `${hechas} hechas · quedan ${quedan} · ${porSegundo.toFixed(1)}/s · ` +
        `faltan ~${Math.round(quedan / porSegundo / 60)} min`,
    );
  }

  console.log(`Listo: ${hechas} tareas, ${await pendientes()} en la cola`);
  await app.close();
}

void main();
