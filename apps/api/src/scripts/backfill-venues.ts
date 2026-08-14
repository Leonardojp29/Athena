import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncTeamsUseCase } from '../modules/sync/sync-teams.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class EstadiosModule {}

/**
 * Rellena la foto, la superficie y la dirección de los estadios que ya están en la base.
 *
 * Los tres campos llegan en `/teams` —y en ningún otro endpoint— desde siempre; el mapper los
 * descartaba, así que el sync los escribe desde ahora en adelante.
 *
 * **Para lo viejo casi nunca hace falta correr esto**: el refresco diario de las 5 ya encola un job
 * `teams` por cada temporada vigente de cada competencia activa, o sea que el catálogo entero se
 * rellena solo y sin un request extra. Este script existe para adelantar unas pocas competencias
 * —`BACKFILL_LIMIT`— cuando hay que ver el resultado hoy, y para las temporadas archivadas, que el
 * refresco diario no toca. El presupuesto es compartido con otros sistemas de la empresa, así que
 * además se corta solo si la cuota baja del piso.
 */
const PISO_DE_CUOTA = 200;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(EstadiosModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const budget = app.get(ApiBudgetService);
  const equipos = app.get(SyncTeamsUseCase);

  /* La temporada vigente de cada competencia activa: el estadio de hoy es el que importa. */
  const temporadas = await prisma.season.findMany({
    where: { isCurrent: true, competition: { isActive: true } },
    select: { year: true, competition: { select: { id: true, slug: true, name: true } } },
    orderBy: { competition: { slug: 'asc' } },
  });

  const refs = new Map(
    (
      await prisma.externalReference.findMany({
        where: {
          provider: 'api-football',
          entityType: 'competition',
          entityId: { in: temporadas.map((t) => t.competition.id) },
        },
        select: { entityId: true, providerRef: true },
      })
    ).map((r) => [r.entityId, r.providerRef]),
  );

  /* Sin tope, todas; con tope, las primeras: alcanza para ver el resultado sin gastar el catálogo. */
  const tope = Number(process.env.BACKFILL_LIMIT ?? temporadas.length);
  const elegidas = temporadas.slice(0, tope);
  console.log(`${elegidas.length} de ${temporadas.length} competencias por recorrer`);
  let fallos = 0;

  for (const [i, temporada] of elegidas.entries()) {
    const ref = refs.get(temporada.competition.id);
    if (!ref) continue;

    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < PISO_DE_CUOTA) {
      console.log(`Cuota en ${dayRemaining}: se corta acá y se sigue mañana`);
      break;
    }

    try {
      await equipos.execute(ref, temporada.year);
    } catch (error) {
      fallos++;
      console.error(`  ✗ ${temporada.competition.slug}: ${String(error).slice(0, 120)}`);
    }

    if ((i + 1) % 10 === 0) {
      const conFoto = await prisma.venue.count({ where: { imageUrl: { not: null } } });
      console.log(
        `  ${i + 1}/${elegidas.length} · ${conFoto} estadios con foto (fallos ${fallos}) · cuota ${dayRemaining ?? '?'}`,
      );
    }
  }

  const [total, conFoto, conSuperficie] = await Promise.all([
    prisma.venue.count(),
    prisma.venue.count({ where: { imageUrl: { not: null } } }),
    prisma.venue.count({ where: { surface: { not: null } } }),
  ]);
  console.log(
    `Terminado: ${conFoto}/${total} estadios con foto, ${conSuperficie} con superficie, ${fallos} fallos`,
  );
  await app.close();
}

void main();
