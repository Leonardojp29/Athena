import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SharedModule } from '../shared/shared.module.js';
import { CONFIGURED_COMPETITIONS } from '../modules/sync/competitions.config.js';
import { SyncCompetitionUseCase } from '../modules/sync/sync-competition.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class CoberturaModule {}

/**
 * Refresca qué publica el proveedor de cada competencia: eventos, alineaciones, estadísticas, notas.
 *
 * Sin esa foto el cierre le pide alineaciones a torneos que nunca las tuvieron —las rondas tempranas
 * de la FA Cup entregaron 2 de 74— y las reintenta durante días. Un pedido por competencia, y los
 * flags recién se vuelven ciertos cuando el torneo arranca, así que conviene repetirlo por temporada.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CoberturaModule, {
    logger: ['warn', 'error'],
  });
  const sincronizar = app.get(SyncCompetitionUseCase);

  let hechas = 0;
  for (const { providerRef, label } of CONFIGURED_COMPETITIONS) {
    try {
      await sincronizar.execute(providerRef);
      hechas++;
    } catch (error) {
      console.error(`${label}: ${String(error).slice(0, 120)}`);
    }
  }

  console.log(`${hechas} de ${CONFIGURED_COMPETITIONS.length} competencias actualizadas`);
  await app.close();
}

void main();
