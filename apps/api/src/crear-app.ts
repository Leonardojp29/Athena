import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './shared/all-exceptions.filter.js';
import { DuracionInterceptor } from './shared/duracion.interceptor.js';

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
  /*
   * Los orígenes permitidos, en lista. Era un string único y en desarrollo eso alcanza para romper
   * todo: quien entra por `127.0.0.1:4321` no es el mismo origen que `localhost:4321`, y los fetch
   * que el navegador le hace al API quedaban bloqueados.
   *
   * Los de local van siempre, además de lo que diga `WEB_ORIGIN`: apuntarlo a un despliegue viejo
   * dejaba el desarrollo sin CORS y el síntoma —una pastilla que no aparece— no señalaba la causa.
   */
  const LOCALES = ['http://localhost:4321', 'http://127.0.0.1:4321'];
  const origenes = [
    ...new Set([
      ...LOCALES,
      ...(process.env.WEB_ORIGIN ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ]),
  ];
  app.enableCors({ origin: origenes });
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
