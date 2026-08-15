import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { paisEnEspanol, slugify } from '@athena/domain';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({ imports: [SharedModule] })
class RenombrarModule {}

/**
 * Las selecciones, en español y con su slug.
 *
 * El proveedor nombra a la selección como al país y en inglés —"Spain", "South Africa"—, y las que
 * ya estaban en la base nacieron así. De ahora en más el mapper las traduce al crearlas; esto
 * arregla las anteriores, nombre y slug, y se puede volver a correr sin efecto.
 *
 * No cuesta un solo pedido al proveedor: la traducción es nuestra.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(RenombrarModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);

  const selecciones = await prisma.team.findMany({
    where: { isNationalTeam: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  const ocupados = new Set(
    (await prisma.team.findMany({ select: { slug: true } })).map((t) => t.slug),
  );

  let cambiados = 0;
  for (const equipo of selecciones) {
    const nombre = paisEnEspanol(equipo.name) ?? equipo.name;
    if (nombre === equipo.name) continue;

    /* El slug sigue al nombre, salvo que ya lo tenga un club: ahí se deja el que estaba. */
    const base = slugify(nombre);
    const slug = base === equipo.slug || !ocupados.has(base) ? base : equipo.slug;
    ocupados.delete(equipo.slug);
    ocupados.add(slug);

    /* El slug viejo queda apuntando acá: los enlaces a /equipos/spain no pueden morir. */
    await prisma.$transaction([
      ...(slug === equipo.slug
        ? []
        : [
            prisma.slugAlias.upsert({
              where: { entityType_slug: { entityType: 'team', slug: equipo.slug } },
              update: { entityId: equipo.id },
              create: { entityType: 'team', slug: equipo.slug, entityId: equipo.id },
            }),
          ]),
      prisma.team.update({ where: { id: equipo.id }, data: { name: nombre, slug } }),
    ]);
    cambiados++;
    console.log(`  ${equipo.name} → ${nombre} (/${slug})`);
  }

  console.log(`${cambiados} de ${selecciones.length} selecciones renombradas`);
  await app.close();
}

void main();
