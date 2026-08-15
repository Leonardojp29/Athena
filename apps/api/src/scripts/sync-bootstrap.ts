import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { CONFIGURED_COMPETITIONS } from '../modules/sync/competitions.config.js';
import { SyncCompetitionUseCase } from '../modules/sync/sync-competition.usecase.js';
import { SyncFixturesUseCase } from '../modules/sync/sync-fixtures.usecase.js';
import { SyncStandingsUseCase } from '../modules/sync/sync-standings.usecase.js';
import { SyncTeamsUseCase } from '../modules/sync/sync-teams.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class BootstrapModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BootstrapModule, {
    logger: ['log', 'warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const syncCompetition = app.get(SyncCompetitionUseCase);
  const syncTeams = app.get(SyncTeamsUseCase);
  const syncFixtures = app.get(SyncFixturesUseCase);
  const syncStandings = app.get(SyncStandingsUseCase);
  const budget = app.get(ApiBudgetService);

  /*
   * `AMBITO=national` limita la corrida a los torneos de selecciones, que es como se incorporan sin
   * volver a pedir el catálogo entero de clubes: son cuatro pedidos por competencia.
   */
  const ambito = process.env.AMBITO;
  const catalogo = CONFIGURED_COMPETITIONS.filter(
    (c) => !ambito || (c.scope ?? 'clubs') === ambito,
  );
  console.log(`${catalogo.length} competencias por sincronizar${ambito ? ` (ámbito ${ambito})` : ''}`);

  for (const { providerRef, label } of catalogo) {
    console.log(`\n▶ ${label}`);
    const competitionId = await syncCompetition.execute(providerRef);
    const currentSeasons = await prisma.season.findMany({
      where: { competitionId, isCurrent: true },
      select: { year: true },
    });
    for (const { year } of currentSeasons) {
      await syncTeams.execute(providerRef, year);
      await syncFixtures.execute(providerRef, year);
      await syncStandings.execute(providerRef, year);
    }
  }

  const { dayRemaining } = await budget.snapshot();
  console.log(
    `\nBootstrap listo. Cuota API-Football restante hoy: ${dayRemaining ?? 'desconocida'}`,
  );
  await app.close();
}

void main();
