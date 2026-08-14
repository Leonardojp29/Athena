import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { CONFIGURED_COMPETITIONS } from '../modules/sync/competitions.config.js';
import { SyncFixturesUseCase } from '../modules/sync/sync-fixtures.usecase.js';
import { SyncStandingsUseCase } from '../modules/sync/sync-standings.usecase.js';
import { SyncTeamsUseCase } from '../modules/sync/sync-teams.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class ArchivoModule {}

/**
 * El archivo: las temporadas pasadas de cada competencia, no solo la vigente.
 *
 * Quien entra a la Libertadores quiere ver también las anteriores —quién ganó, cómo fue ese cuadro— y
 * el historial entre dos equipos con una sola temporada en la base es una tabla de un partido. Las
 * filas de temporada ya existían, vacías. Son tres pedidos por temporada (equipos, partidos, tabla) y
 * solo se hacen las que están vacías, así que la corrida se puede repetir sin gastar cuota de nuevo.
 *
 * Los equipos van primero porque un partido de 2022 puede tener un club que hoy no juega nada: sin
 * ellos el sync descarta el partido por referencias sin resolver.
 *
 * `ARCHIVE_SCOPE=copas` limita a los torneos internacionales; por omisión entra todo el catálogo.
 * Traer el archivo **no** dispara el detalle de cada partido: el worker solo lo pide para lo de la
 * última semana, así que esto cuesta tres pedidos por temporada y no tres por partido.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ArchivoModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const budget = app.get(ApiBudgetService);
  const syncTeams = app.get(SyncTeamsUseCase);
  const syncFixtures = app.get(SyncFixturesUseCase);
  const syncStandings = app.get(SyncStandingsUseCase);

  const anios = Number(process.env.ARCHIVE_YEARS ?? 5);
  const soloCopas = process.env.ARCHIVE_SCOPE === 'copas';
  const copas = soloCopas
    ? CONFIGURED_COMPETITIONS.filter((c) => c.countryCode === null)
    : CONFIGURED_COMPETITIONS;

  console.log(`${copas.length} competencias · hasta ${anios} temporadas vacías cada una`);

  let temporadas = 0;
  let partidos = 0;
  let fallos = 0;

  for (const copa of copas) {
    const referencia = await prisma.externalReference.findFirst({
      where: { provider: 'api-football', entityType: 'competition', providerRef: copa.providerRef },
      select: { entityId: true },
    });
    if (!referencia) {
      console.log(`· ${copa.label}: sin sincronizar todavía, se salta`);
      continue;
    }

    /* Las más recientes primero: si la cuota se agota, lo que queda es lo más viejo. */
    const pendientes = await prisma.$queryRaw<Array<{ year: number }>>`
      SELECT s.year
      FROM seasons s
      WHERE s.competition_id = ${referencia.entityId}::uuid
        AND s.is_current = false
        AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.season_id = s.id)
      ORDER BY s.year DESC
      LIMIT ${anios}`;

    if (pendientes.length === 0) {
      console.log(`· ${copa.label}: al día`);
      continue;
    }

    console.log(`▶ ${copa.label}: ${pendientes.map((p) => p.year).join(', ')}`);
    for (const { year } of pendientes) {
      try {
        await syncTeams.execute(copa.providerRef, year);
        const nuevos = await syncFixtures.execute(copa.providerRef, year);
        await syncStandings.execute(copa.providerRef, year);
        temporadas++;
        partidos += nuevos;
        console.log(`  ${year}: ${nuevos} partidos`);
      } catch (error) {
        fallos++;
        console.error(`  ✗ ${year}: ${String(error).slice(0, 160)}`);
      }
    }

    const { dayRemaining } = await budget.snapshot();
    console.log(`  cuota restante: ${dayRemaining ?? '?'}`);
  }

  console.log(
    `\nArchivo listo: ${temporadas} temporadas, ${partidos} partidos, ${fallos} fallos`,
  );

  /*
   * Segunda pasada: las temporadas que tienen partidos pero se quedaron sin tabla. Pasa cuando el
   * proveedor devuelve filas repetidas y el `createMany` rebota; los partidos ya estaban escritos, así
   * que la primera pasada las da por hechas y nunca volvería a mirarlas.
   */
  const sinTabla = await prisma.$queryRaw<Array<{ provider_ref: string; year: number; slug: string }>>`
    SELECT r.provider_ref, se.year, c.slug
    FROM seasons se
    JOIN competitions c ON c.id = se.competition_id
    JOIN external_references r
      ON r.entity_type = 'competition' AND r.entity_id = c.id AND r.provider = 'api-football'
    WHERE EXISTS (SELECT 1 FROM matches m WHERE m.season_id = se.id)
      AND NOT EXISTS (SELECT 1 FROM standings s WHERE s.season_id = se.id)
    ORDER BY se.year DESC`;

  if (sinTabla.length > 0) {
    console.log(`\n${sinTabla.length} temporadas con partidos y sin tabla: reintentando`);
    let recuperadas = 0;
    for (const fila of sinTabla) {
      try {
        const filas = await syncStandings.execute(fila.provider_ref, fila.year);
        if (filas > 0) recuperadas++;
      } catch (error) {
        console.error(`  ✗ ${fila.slug} ${fila.year}: ${String(error).slice(0, 120)}`);
      }
    }
    console.log(`Tablas recuperadas: ${recuperadas}/${sinTabla.length}`);
  }

  await app.close();
}

void main();
