import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import { Importar60Service } from '../modules/juegos/importar-60.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class ImportacionModule {}

/**
 * Trae las preguntas de 60 Segundos a la base. Idempotente por clave.
 *
 *   SOLO=Q001,Q012   importa solo esas
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ImportacionModule, {
    logger: ['warn', 'error'],
  });

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const { guardadas, creados, bloqueadas } = await app.get(Importar60Service).importar(claves);
  console.log(`${guardadas} preguntas guardadas · ${creados} futbolistas creados`);
  for (const b of bloqueadas) console.log(`  bloqueada ${b.clave}: ${b.motivo}`);

  await app.close();
}

void main();
