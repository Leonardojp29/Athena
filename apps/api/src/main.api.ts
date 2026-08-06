import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  const openApiConfig = new DocumentBuilder()
    .setTitle('Athena API')
    .setDescription('Football Intelligence Platform')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  console.log(`Athena API listening on http://localhost:${port} (docs at /docs)`);
}

void bootstrap();
