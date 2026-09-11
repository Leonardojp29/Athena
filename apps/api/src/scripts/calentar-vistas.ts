import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { CalentarVistasUseCase } from '../modules/views/calentar-vistas.usecase.js';
import { ViewsModule } from '../modules/views/views.module.js';

@Module({ imports: [SharedModule, ViewsModule] })
class CalentarModule {}

/**
 * Calcula las vistas de las competencias en curso antes de que nadie las abra.
 *
 * Componer una competencia cuesta once consultas, y medido en frío son trece segundos: el primer
 * visitante del día los pagaba enteros. El refresco diario ya lo hace solo; esto es para cuando se
 * despliega algo nuevo y la caché arranca vacía.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CalentarModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const calentar = app.get(CalentarVistasUseCase);

  const competencias = await prisma.competition.findMany({
    where: { isActive: true, seasons: { some: { isCurrent: true } } },
    select: { slug: true },
    orderBy: { slug: 'asc' },
  });

  const arranque = Date.now();
  const calentadas = await calentar.ejecutar(
    competencias.map(({ slug }) => ({ tipo: 'competition' as const, slug })),
  );

  console.log(
    `${calentadas} de ${competencias.length} competencias calentadas en ${Math.round((Date.now() - arranque) / 1000)} s`,
  );
  await app.close();
}

void main();
