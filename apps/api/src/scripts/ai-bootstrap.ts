import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AiBudgetService } from '../shared/ai-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { FeatureFlagService, FLAGS } from '../modules/feature-flags/feature-flag.service.js';
import { FeatureFlagsModule } from '../modules/feature-flags/feature-flags.module.js';
import { GenerateMatchInsightUseCase } from '../modules/insights/generate-match-insight.usecase.js';
import { InsightsModule } from '../modules/insights/insights.module.js';
import {
  MATCH_PREVIEW_KIND,
  MATCH_PREVIEW_PROMPT_VERSION,
  MATCH_RECAP_KIND,
  MATCH_RECAP_PROMPT_VERSION,
} from '../modules/insights/prompts.js';
import { SearchModule } from '../modules/search/search.module.js';
import { SyncEmbeddingsUseCase } from '../modules/search/sync-embeddings.usecase.js';
import { SyncMatchDetailUseCase } from '../modules/sync/sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from '../modules/sync/sync-match-events.usecase.js';
import { SyncSquadUseCase } from '../modules/sync/sync-squad.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, FeatureFlagsModule, SyncModule, InsightsModule, SearchModule] })
class AiBootstrapModule {}

/**
 * Bootstrap de la capa de inteligencia. Pasos seleccionables por argumento:
 *   pnpm ai:bootstrap flags squads embeddings insights
 */
async function main(): Promise<void> {
  const steps = process.argv.slice(2);
  const run = (step: string): boolean => steps.length === 0 || steps.includes(step);

  const app = await NestFactory.createApplicationContext(AiBootstrapModule, {
    logger: ['log', 'warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const flags = app.get(FeatureFlagService);

  if (run('flags')) {
    console.log('\n▶ Feature flags');
    await flags.set(FLAGS.aiInsights, true, 'Análisis de partidos generados con IA');
    await flags.set(FLAGS.semanticSearch, true, 'Búsqueda semántica con embeddings');
    await flags.set(FLAGS.liveMatchCenter, true, 'Match Center en vivo con polling');
    await flags.set(FLAGS.recommendations, false, 'Recomendaciones personalizadas (pendiente)');
    console.log(await flags.all());
  }

  if (run('squads')) {
    console.log('\n▶ Plantillas de equipos con tabla en temporada actual');
    const syncSquad = app.get(SyncSquadUseCase);
    const teams = await prisma.team.findMany({
      where: { standings: { some: { season: { isCurrent: true } } } },
      select: { id: true, name: true },
    });
    const refs = await prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'team',
        entityId: { in: teams.map((t) => t.id) },
      },
      select: { providerRef: true, entityId: true },
    });
    console.log(`${refs.length} equipos por sincronizar`);
    for (const [index, ref] of refs.entries()) {
      try {
        await syncSquad.execute(ref.providerRef);
      } catch (error) {
        console.error(`  fallo en equipo ${ref.providerRef}: ${String(error)}`);
      }
      if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${refs.length}`);
    }
  }

  if (run('events')) {
    console.log('\n▶ Eventos de partidos finalizados recientes');
    const syncEvents = app.get(SyncMatchEventsUseCase);
    const limit = Number(process.env.AI_BOOTSTRAP_EVENT_LIMIT ?? 20);
    const matches = await prisma.match.findMany({
      where: { status: 'finished', events: { none: {} } },
      orderBy: { kickoffUtc: 'desc' },
      take: limit,
      select: { id: true },
    });
    const refs = await prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: matches.map((m) => m.id) },
      },
      select: { providerRef: true },
    });
    for (const ref of refs) {
      try {
        await syncEvents.execute(ref.providerRef);
      } catch (error) {
        console.error(`  fallo en partido ${ref.providerRef}: ${String(error)}`);
      }
    }
    console.log(`${refs.length} partidos procesados`);
  }

  if (run('detail')) {
    console.log('\n▶ Estadísticas y alineaciones de partidos finalizados');
    const syncDetail = app.get(SyncMatchDetailUseCase);
    const limit = Number(process.env.AI_BOOTSTRAP_DETAIL_LIMIT ?? 12);
    const matches = await prisma.match.findMany({
      where: { status: 'finished', statistics: { none: {} } },
      orderBy: { kickoffUtc: 'desc' },
      take: limit,
      select: { id: true },
    });
    const refs = await prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'match',
        entityId: { in: matches.map((m) => m.id) },
      },
      select: { providerRef: true },
    });
    for (const ref of refs) {
      try {
        await syncDetail.execute(ref.providerRef);
      } catch (error) {
        console.error(`  fallo en partido ${ref.providerRef}: ${String(error)}`);
      }
    }
    console.log(`${refs.length} partidos procesados`);
  }

  if (run('previews')) {
    console.log('\n▶ Previas de partidos próximos');
    const insights = app.get(GenerateMatchInsightUseCase);
    const limit = Number(process.env.AI_BOOTSTRAP_PREVIEW_LIMIT ?? 3);
    const matches = await prisma.match.findMany({
      where: {
        status: 'scheduled',
        kickoffUtc: { gte: new Date(), lte: new Date(Date.now() + 48 * 3600_000) },
        season: { competition: { isActive: true } },
      },
      orderBy: { kickoffUtc: 'asc' },
      take: limit,
      select: {
        id: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    for (const match of matches) {
      const label = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
      try {
        const id = await insights.executePreview(match.id, { force: true });
        console.log(`  ${id ? '✓' : '✗'} ${label}`);
      } catch (error) {
        console.error(`  ✗ ${label}: ${String(error)}`);
      }
    }
  }

  if (run('embeddings')) {
    console.log('\n▶ Embeddings');
    const embeddings = app.get(SyncEmbeddingsUseCase);
    console.log(`equipos: ${await embeddings.syncTeams()}`);
    console.log(`jugadores: ${await embeddings.syncPlayers()}`);
  }

  if (run('insights')) {
    const insights = app.get(GenerateMatchInsightUseCase);

    /*
     * Primero los que quedaron escritos con un prompt viejo. Subir la versión es la forma de
     * decir "esto hay que volver a escribir", y sin este paso la corrección se quedaba en el
     * código mientras el lector seguía viendo el texto anterior.
     */
    const vencidos = await prisma.insight.findMany({
      where: {
        subjectType: 'match',
        kind: MATCH_RECAP_KIND,
        promptVersion: { not: MATCH_RECAP_PROMPT_VERSION },
      },
      select: { subjectId: true },
    });
    if (vencidos.length > 0) {
      console.log(`\n▶ Análisis con prompt vencido (${vencidos.length})`);
      for (const row of vencidos) {
        try {
          const id = await insights.execute(row.subjectId, { force: true });
          console.log(`  ${id ? '✓' : '✗'} ${row.subjectId}`);
        } catch (error) {
          console.error(`  ✗ ${row.subjectId}: ${String(error).slice(0, 140)}`);
        }
      }
    }

    /* Lo mismo con las previas, que solo se pueden rescribir si el partido no arrancó. */
    const previasVencidas = await prisma.insight.findMany({
      where: {
        subjectType: 'match',
        kind: MATCH_PREVIEW_KIND,
        promptVersion: { not: MATCH_PREVIEW_PROMPT_VERSION },
      },
      select: { subjectId: true },
    });
    const regenerables = await prisma.match.findMany({
      where: { id: { in: previasVencidas.map((r) => r.subjectId) }, status: 'scheduled' },
      select: { id: true },
    });
    if (regenerables.length > 0) {
      console.log(`\n▶ Previas con prompt vencido (${regenerables.length})`);
      for (const match of regenerables) {
        try {
          const id = await insights.executePreview(match.id, { force: true });
          console.log(`  ${id ? '✓' : '✗'} ${match.id}`);
        } catch (error) {
          console.error(`  ✗ ${match.id}: ${String(error).slice(0, 140)}`);
        }
      }
    }

    console.log('\n▶ Insights de partidos finalizados recientes');
    const limit = Number(process.env.AI_BOOTSTRAP_INSIGHT_LIMIT ?? 5);
    const matches = await prisma.match.findMany({
      where: { status: 'finished', events: { some: {} } },
      orderBy: { kickoffUtc: 'desc' },
      take: limit,
      select: {
        id: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    for (const match of matches) {
      const label = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
      try {
        const id = await insights.execute(match.id, { force: true });
        console.log(`  ${id ? '✓' : '✗'} ${label}`);
      } catch (error) {
        console.error(`  ✗ ${label}: ${String(error)}`);
      }
    }
  }

  const budget = app.get(AiBudgetService);
  const { spent, cap } = await budget.snapshot();
  console.log(`\nTokens OpenAI usados hoy: ${spent}/${cap}`);
  await app.close();
}

void main();
