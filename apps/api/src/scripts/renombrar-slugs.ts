import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { slugify } from '@athena/domain';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({ imports: [SharedModule] })
class SlugsModule {}

/**
 * Los slugs que nacieron abreviados, con su nombre de verdad.
 *
 * Un futbolista que aparece primero en una alineación llega como "J. Vidales" y su slug queda
 * `j-vidales` para siempre, aunque después la sincronización de plantillas traiga "Johnny Vidales".
 * Son 6 089 jugadores; 5 041 ya tienen el nombre completo en la base y se arreglan sin gastar un
 * pedido al proveedor.
 *
 * El slug viejo queda en `slug_aliases` y la página responde con una redirección permanente: un
 * enlace compartido por WhatsApp hace un año no puede terminar en 404 porque nosotros mejoramos un
 * dato.
 *
 * `SECO=si` lo enumera sin escribir nada.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SlugsModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const seco = process.env.SECO === 'si';

  /* Solo los que tienen nombre entero: "J. Vidales" volvería a generar el mismo slug abreviado. */
  const candidatos = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT id, name, slug FROM players
    WHERE slug ~ '^[a-z]-' AND name !~ '^[A-Z]\\.' ORDER BY name`;

  const ocupados = new Set(
    (await prisma.player.findMany({ select: { slug: true } })).map((p) => p.slug),
  );

  let cambiados = 0;
  let chocados = 0;
  for (const jugador of candidatos) {
    const nuevo = slugify(jugador.name);
    if (nuevo === jugador.slug || nuevo === '') continue;
    /* Si ya lo tiene otro futbolista se deja como está: dos personas no pueden compartir URL. */
    if (ocupados.has(nuevo)) {
      chocados++;
      continue;
    }

    if (!seco) {
      await prisma.$transaction([
        prisma.slugAlias.upsert({
          where: { entityType_slug: { entityType: 'player', slug: jugador.slug } },
          update: { entityId: jugador.id },
          create: { entityType: 'player', slug: jugador.slug, entityId: jugador.id },
        }),
        prisma.player.update({ where: { id: jugador.id }, data: { slug: nuevo } }),
      ]);
    }
    ocupados.delete(jugador.slug);
    ocupados.add(nuevo);
    cambiados++;
    if (cambiados % 250 === 0) console.log(`  ${cambiados}… (${jugador.slug} → ${nuevo})`);
  }

  console.log(
    `${cambiados} jugadores renombrados${seco ? ' (en seco)' : ''}, ${chocados} con el slug ya tomado, de ${candidatos.length} candidatos`,
  );
  await app.close();
}

void main();
