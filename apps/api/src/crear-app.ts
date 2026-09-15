import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './shared/all-exceptions.filter.js';
import { DuracionInterceptor } from './shared/duracion.interceptor.js';
import { origenesPermitidos } from './shared/entorno.js';

/**
 * El API armado y configurado, sin escuchar todavía.
 *
 * Existe porque el mismo API vive de dos formas: un proceso que escucha un puerto en desarrollo, y
 * una función serverless en Vercel donde no hay `listen` —la plataforma entrega cada request al
 * handler—. Todo lo que define al API (prefijo, CORS, filtros, docs) va acá para que las dos formas
 * sean literalmente la misma aplicación.
 */
export async function crearApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: origenesPermitidos() });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new DuracionInterceptor());

  const openApiConfig = new DocumentBuilder()
    .setTitle('Athena API')
    .setDescription('Football Intelligence Platform')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

  return app;
}
