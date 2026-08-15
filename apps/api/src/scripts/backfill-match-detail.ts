import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Prisma } from '@athena/database';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncMatchDetailUseCase } from '../modules/sync/sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from '../modules/sync/sync-match-events.usecase.js';
import { SyncMatchPlayersUseCase } from '../modules/sync/sync-match-players.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class BackfillModule {}

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 5);

/**
 * El detalle de los partidos que solo tienen marcador: jugadas, alineaciones, estadísticas y notas.
 *
 * El archivo se trajo con `backfill-archive`, que cuesta tres pedidos por *temporada* y por eso no
 * baja nada de cada partido: de 2011 a 2024 hay casi cincuenta mil partidos terminados con las cuatro
 * pestañas vacías. Esto los llena, pero cuesta **cuatro pedidos por partido** —los cuatro endpoints
 * son distintos— sobre una cuota que se comparte con los otros sistemas de la casa. De ahí que se
 * corra por tandas acotadas y no de una:
 *
 *   PAISES=PE,AR,BR,CO,CL,UY,EC,ES,GB-ENG  los países que importan
 *   COPAS=si                               suma Libertadores, Champions y compañía
 *   LIGAS=mundial,copa-america             alternativa fina por slug, gana sobre lo anterior
 *   DESDE=2021  HASTA=2024                 rango de temporadas (los dos extremos incluidos)
 *   LIMITE=2000                            partidos de esta tanda
 *   SIN_NOTAS=si                           ahorra el cuarto pedido (deja sin rendimiento individual)
 *   PISO_CUOTA=20000                       corta si la cuota real del día baja de esto
 *
 * Los más recientes primero, que es lo que más se mira. Una tanda interrumpida se retoma sola: lo que
 * falta se deduce de la base, no de un archivo de progreso.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BackfillModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const syncEvents = app.get(SyncMatchEventsUseCase);
  const syncDetail = app.get(SyncMatchDetailUseCase);
  const syncPlayers = app.get(SyncMatchPlayersUseCase);
  const budget = app.get(ApiBudgetService);

  const lista = (valor: string | undefined) =>
    valor
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean) ?? [];

  const paises = lista(process.env.PAISES);
  const ligas = lista(process.env.LIGAS);
  const conCopas = process.env.COPAS === 'si';
  const desde = Number(process.env.DESDE ?? 0);
  const hasta = Number(process.env.HASTA ?? 0);
  const limite = Number(process.env.LIMITE ?? process.env.BACKFILL_LIMIT ?? 2000);
  const conNotas = process.env.SIN_NOTAS !== 'si';
  const pisoCuota = Number(process.env.PISO_CUOTA ?? 0);
  const pedidosPorPartido = conNotas ? 4 : 3;

  /*
   * Las copas internacionales de clubes no tienen país, así que se piden aparte: sin ellas, un equipo
   * queda con detalle en su liga y sin nada en la Libertadores, que es donde más se lo mira.
   */
  const alcance =
    ligas.length > 0
      ? { competition: { slug: { in: ligas } } }
      : {
          competition: {
            OR: [
              ...(paises.length > 0 ? [{ countryCode: { in: paises } }] : []),
              ...(conCopas
                ? [{ countryCode: null, continent: { in: ['sudamerica', 'europa', 'mundial'] } }]
                : []),
            ],
          },
        };
  const hayAlcance = ligas.length > 0 || paises.length > 0 || conCopas;

  const donde: Prisma.MatchWhereInput = {
    status: 'finished',
    OR: [{ statistics: { none: {} } }, { events: { none: {} } }],
    season: {
      ...(desde > 0 || hasta > 0
        ? { year: { ...(desde > 0 ? { gte: desde } : {}), ...(hasta > 0 ? { lte: hasta } : {}) } }
        : {}),
      ...(hayAlcance ? alcance : {}),
    },
  };

  const [faltan, pendientes] = await Promise.all([
    prisma.match.count({ where: donde }),
    prisma.match.findMany({
      where: donde,
      orderBy: { kickoffUtc: 'desc' },
      take: limite,
      select: { id: true },
    }),
  ]);

  const refs = await prisma.externalReference.findMany({
    where: {
      provider: 'api-football',
      entityType: 'match',
      entityId: { in: pendientes.map((m) => m.id) },
    },
    select: { providerRef: true },
  });

  console.log(
    `${faltan} partidos sin detalle en este alcance; esta tanda toma ${refs.length}` +
      ` (${refs.length * pedidosPorPartido} pedidos, concurrencia ${CONCURRENCY}` +
      `${conNotas ? '' : ', sin notas'})`,
  );

  let hechos = 0;
  let fallos = 0;
  let cortado = false;

  const cola = [...refs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      if (cortado) return;
      const next = cola.shift();
      if (!next) return;
      try {
        await syncEvents.execute(next.providerRef);
        await syncDetail.execute(next.providerRef);
        if (conNotas) await syncPlayers.execute(next.providerRef);
      } catch (error) {
        fallos++;
        console.error(`  ✗ ${next.providerRef}: ${String(error).slice(0, 120)}`);
      }
      hechos++;
      if (hechos % 50 === 0) {
        const { dayRemaining } = await budget.snapshot();
        console.log(`  ${hechos}/${refs.length} (fallos ${fallos}) · cuota ${dayRemaining ?? '?'}`);
        /* La cuota es de la casa, no nuestra: por debajo del piso la tanda se detiene sola. */
        if (pisoCuota > 0 && dayRemaining !== null && dayRemaining < pisoCuota) {
          cortado = true;
          console.warn(`  ⚠ cuota bajo el piso (${dayRemaining} < ${pisoCuota}), cortando la tanda`);
        }
      }
    }
  });
  await Promise.all(workers);

  const { dayRemaining } = await budget.snapshot();
  console.log(
    `Tanda terminada: ${hechos} partidos, ${fallos} fallos. Quedan ~${Math.max(0, faltan - hechos + fallos)} en este alcance. Cuota restante: ${dayRemaining ?? '?'}`,
  );
  await app.close();
}

void main();
