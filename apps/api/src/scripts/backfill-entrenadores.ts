import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncModule } from '../modules/sync/sync.module.js';
import { SyncCoachesUseCase } from '../modules/sync/sync-coaches.usecase.js';

@Module({ imports: [SharedModule, SyncModule] })
class EntrenadoresModule {}

/**
 * Le pone nombre propio al entrenador de las alineaciones que ya están guardadas.
 *
 * Athena tiene el dato desde siempre y nunca lo convirtió en nada: cada alineación guarda un texto
 * suelto y 12.441 de ellos vienen abreviados, así que "F. Navarro" figura con cinco equipos y no hay
 * forma de saber si es una persona o son cinco. Un pedido por club trae a sus DT con la carrera
 * entera, y de ahí sale la identidad.
 *
 * Se empieza por los clubes que alguien mira, que es por donde ordena `relevancia`.
 *
 *   LIMITE=400       cuántos clubes por corrida
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(EntrenadoresModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const sync = app.get(SyncCoachesUseCase);
  const budget = app.get(ApiBudgetService);

  const limite = Number(process.env.LIMITE ?? 400);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5_000);
  /* Cinco clubes a la vez: casi todo es espera, y el proveedor admite setecientos pedidos al minuto. */
  const enParalelo = Number(process.env.EN_PARALELO ?? 5);
  /* Volver a preguntar por clubes ya hechos, para rehacer fichas con la ficha del proveedor. */
  const forzar = process.env.FORZAR === '1';

  /*
   * Se saltan los clubes que ya tienen a su entrenador actual, que es lo que deja esta corrida.
   * Una etapa cerrada no alcanza como señal: al club le pueden haber quedado etapas viejas porque
   * la carrera de otro entrenador pasó por ahí, y a ese club nunca se le preguntó.
   */
  const clubes = await prisma.$queryRaw<Array<{ ref: string; nombre: string }>>`
    SELECT r.provider_ref AS ref, t.name AS nombre
    FROM teams t
    JOIN external_references r
      ON r.entity_type = 'team' AND r.entity_id = t.id AND r.provider = 'api-football'
    WHERE EXISTS (SELECT 1 FROM match_lineups l WHERE l.team_id = t.id)
      AND (
        ${forzar}
        OR NOT EXISTS (SELECT 1 FROM coach_spells e WHERE e.team_id = t.id AND e.hasta IS NULL)
      )
    ORDER BY t.relevancia DESC
    LIMIT ${limite}
  `;

  console.log(`${clubes.length} clubes por revisar`);
  const total = { entrenadores: 0, etapas: 0, alineaciones: 0 };

  for (let i = 0; i < clubes.length; i += enParalelo) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      break;
    }

    const lote = clubes.slice(i, i + enParalelo);
    const hechos = await Promise.all(
      lote.map((club) =>
        sync.execute(club.ref).catch((error: unknown) => {
          console.error(`${club.nombre}: ${(error as Error).message}`);
          return { entrenadores: 0, etapas: 0, alineaciones: 0 };
        }),
      ),
    );
    for (const hecho of hechos) {
      total.entrenadores += hecho.entrenadores;
      total.etapas += hecho.etapas;
      total.alineaciones += hecho.alineaciones;
    }

    if (Math.floor(i / enParalelo) % 10 === 0) {
      console.log(
        `${i + lote.length}/${clubes.length} clubes · ${total.etapas} etapas · ${total.alineaciones} alineaciones atadas`,
      );
    }
  }

  /*
   * La pasada final: las etapas que llegaron tarde para un club ya están todas, y con eso se atan
   * las alineaciones que en su momento no tenían con qué.
   */
  total.alineaciones += await sync.atarPendientes();
  console.log(`${await sync.mejorarNombres()} entrenadores con mejor nombre`);

  console.log(
    `Listo: ${total.entrenadores} entrenadores vistos, ${total.etapas} etapas, ${total.alineaciones} alineaciones atadas`,
  );
  await app.close();
}

void main();
