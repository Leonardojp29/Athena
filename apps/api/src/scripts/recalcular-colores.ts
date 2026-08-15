import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SharedModule } from '../shared/shared.module.js';
import { RecalcularColoresUseCase } from '../modules/sync/recalcular-colores.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class ColoresModule {}

/**
 * Recalcula el color de los clubes a partir de las camisetas de local ya muestreadas.
 *
 * Lo mismo que corre en el refresco diario, a mano: no pide nada al proveedor, solo lee las
 * alineaciones que ya están guardadas. Sirve después de sembrar muestras nuevas, para no esperar a
 * las cinco de la mañana.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ColoresModule, { logger: ['warn', 'error'] });
  const { equipos, cambiados } = await app.get(RecalcularColoresUseCase).execute();
  console.log(`${equipos} equipos con muestras suficientes · ${cambiados} cambiaron de color`);
  await app.close();
}

void main();
