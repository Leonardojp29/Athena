import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './shared/all-exceptions.filter.js';
import { initObservability, logJson } from './shared/observability.js';

initObservability('api');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4321' });
  app.useGlobalFilters(new AllExceptionsFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('Athena API')
    .setDescription('Football Intelligence Platform')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  logJson('info', 'api_started', { port, docs: `http://localhost:${port}/docs` });
}

void bootstrap();
