import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncSquadUseCase } from '../modules/sync/sync-squad.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class PlantillasModule {}

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 4);

/**
 * Las plantillas, un pedido por equipo.
 *
 * Las selecciones entraron al catálogo sin ninguna: la ficha de Perú tenía sus partidos y sus tablas
 * y ni un futbolista, que es la mitad de por qué alguien entra. El worker pide la plantilla de un
 * club cuando la necesita, pero nadie la pidió nunca para las 214 selecciones.
 *
 *   SELECCIONES=si          las 214 selecciones (214 pedidos)
 *   ANIO=2026               la campaña con la que se guarda la plantilla
 *   LIGAS=primera-division  los equipos de una competencia
 *   LIMITE=50               tope de esta tanda
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(PlantillasModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const syncSquad = app.get(SyncSquadUseCase);
  const budget = app.get(ApiBudgetService);

  const ligas = (process.env.LIGAS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const soloSelecciones = process.env.SELECCIONES === 'si';
  const limite = Number(process.env.LIMITE ?? 300);
  /*
   * El año importa: sin él el caso de uso guarda a los jugadores y su vínculo con el club, pero no
   * la membresía de plantilla, que es de lo que sale la sección "Plantilla" de la ficha. El
   * proveedor devuelve la plantilla de hoy, así que la campaña es la corriente.
   */
  const anio = Number(process.env.ANIO ?? new Date().getFullYear());

  const equipos = await prisma.team.findMany({
    where: {
      ...(soloSelecciones ? { isNationalTeam: true } : {}),
      ...(ligas.length > 0
        ? {
            OR: [
              { homeMatches: { some: { season: { competition: { slug: { in: ligas } } } } } },
              { awayMatches: { some: { season: { competition: { slug: { in: ligas } } } } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: limite,
  });

  const refs = await prisma.externalReference.findMany({
    where: {
      provider: 'api-football',
      entityType: 'team',
      entityId: { in: equipos.map((e) => e.id) },
    },
    select: { entityId: true, providerRef: true },
  });
  const refPorId = new Map(refs.map((r) => [r.entityId, r.providerRef]));

  console.log(`${equipos.length} equipos (concurrencia ${CONCURRENCY})`);
  let hechos = 0;
  let jugadores = 0;
  let fallos = 0;

  const cola = [...equipos];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const equipo = cola.shift();
      if (!equipo) return;
      const ref = refPorId.get(equipo.id);
      if (!ref) continue;
      try {
        jugadores += await syncSquad.execute(ref, anio);
      } catch {
        /*
         * Dos selecciones que comparten un futbolista pueden escribirlo a la vez y una pierde contra
         * el índice único. Es una carrera, no un dato malo: se reintenta una vez y recién ahí cuenta.
         */
        try {
          jugadores += await syncSquad.execute(ref, anio);
        } catch (segundo) {
          fallos++;
          console.error(`  ✗ ${equipo.name}: ${String(segundo).slice(0, 100)}`);
        }
      }
      hechos++;
      if (hechos % 25 === 0) console.log(`  ${hechos}/${equipos.length} · ${jugadores} jugadores`);
    }
  });
  await Promise.all(workers);

  const { dayRemaining } = await budget.snapshot();
  console.log(
    `${hechos} plantillas, ${jugadores} jugadores, ${fallos} fallos. Cuota restante: ${dayRemaining ?? '?'}`,
  );
  await app.close();
}

void main();
