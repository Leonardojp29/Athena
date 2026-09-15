import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import { ImportarImpostorService } from '../modules/juegos/importar-impostor.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class ImportacionModule {}

/**
 * Trae los retos de El Impostor a la base, con sus seis cartas.
 *
 * Audita antes de escribir: un reto cuya condición no se cumple, al que le falte un futbolista o que
 * tenga dos cartas con la misma foto queda bloqueado y se reporta, nunca se corrige por su cuenta.
 *
 *   SOLO=IMP-001,IMP-012   importa solo esos
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ImportacionModule, {
    logger: ['warn', 'error'],
  });

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const { guardados, bloqueados, futbolistasCreados } = await app
    .get(ImportarImpostorService)
    .importar(claves);

  console.log(`${guardados} retos guardados · ${futbolistasCreados} futbolistas creados`);
  for (const b of bloqueados) console.log(`  bloqueado ${b.clave}: ${b.motivo}`);

  await app.close();
}

void main();
