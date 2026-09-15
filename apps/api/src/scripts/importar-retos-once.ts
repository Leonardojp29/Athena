import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import { ImportarRetosService } from '../modules/juegos/importar-retos.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class ImportacionModule {}

/**
 * Trae los retos de Adivina el XI a la base, con su once y sus casillas.
 *
 * Idempotente por clave: agregar un reto al catálogo y volver a correrlo solo trae ese. Los
 * futbolistas que falten se crean, porque sin ellos el buscador no los encontraría.
 *
 *   SOLO=int-facil-1,per-normal-3   importa solo esos
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ImportacionModule, {
    logger: ['warn', 'error'],
  });

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const { guardados, omitidos, futbolistasCreados } = await app
    .get(ImportarRetosService)
    .importar(claves);

  console.log(`${guardados} retos guardados · ${futbolistasCreados} futbolistas creados`);
  if (omitidos.length > 0) console.log('omitidos:', omitidos.join(', '));

  await app.close();
}

void main();
