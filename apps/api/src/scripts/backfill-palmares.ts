import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncModule } from '../modules/sync/sync.module.js';
import { SyncTrophiesUseCase } from '../modules/sync/sync-trophies.usecase.js';

@Module({ imports: [SharedModule, SyncModule] })
class PalmaresModule {}

/**
 * Trae el palmarés de los futbolistas que Athena muestra.
 *
 * Cuesta un pedido por jugador, así que **no se encola**: con 46.350 futbolistas en la base, un
 * sembrado automático metería otras cuarenta mil tareas en una cola que ya está atrasada. Esto es
 * la manija para traerlo por tandas, empezando por quienes de verdad aparecen en una pantalla.
 *
 * El orden es por minutos jugados en la temporada: si la tanda se corta, se cortó en los que menos
 * se miran.
 *
 *   LIMITE=500       cuántos futbolistas por corrida
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 *   REHACER=1        vuelve a pedir los que ya tienen palmarés
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(PalmaresModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const sync = app.get(SyncTrophiesUseCase);
  const budget = app.get(ApiBudgetService);

  const limite = Number(process.env.LIMITE ?? 500);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5_000);
  const rehacer = process.env.REHACER === '1';
  /*
   * Cuántos futbolistas a la vez.
   *
   * En serie eran tres segundos cada uno —casi todo viajes a Supabase, que está fuera de región— y
   * veintisiete mil fichas daban veintitrés horas. El plan Mega admite novecientos pedidos por
   * minuto; con ocho en paralelo no se pasa ni de la mitad.
   */
  const enParalelo = Math.min(Math.max(Number(process.env.PARALELO ?? 8), 1), 16);

  const candidatos = await prisma.$queryRaw<Array<{ ref: string; id: string }>>`
    SELECT r.provider_ref AS ref, p.id
    FROM players p
    JOIN external_references r
      ON r.entity_type = 'player' AND r.entity_id = p.id AND r.provider = 'api-football'
    JOIN player_season_statistics s ON s.player_id = p.id
    GROUP BY r.provider_ref, p.id
    HAVING ${rehacer} OR NOT EXISTS (SELECT 1 FROM player_trophies t WHERE t.player_id = p.id)
    ORDER BY sum(coalesce(s.minutes_played, 0)) DESC
    LIMIT ${limite}
  `;

  console.log(`${candidatos.length} futbolistas por revisar, de a ${enParalelo}`);
  const arranque = Date.now();
  let hechos = 0;
  let conPalmares = 0;
  let titulos = 0;
  let cortado = false;

  /* La cuota se consulta cada tanda y no por futbolista: es otro viaje a la base y no cambia tanto. */
  for (let desde = 0; desde < candidatos.length; desde += enParalelo) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      cortado = true;
      break;
    }

    const tanda = candidatos.slice(desde, desde + enParalelo);
    const resultados = await Promise.all(
      tanda.map((jugador) =>
        sync.execute(jugador.ref, jugador.id).catch(() => 0),
      ),
    );

    hechos += tanda.length;
    for (const cuantos of resultados) {
      if (cuantos > 0) {
        conPalmares += 1;
        titulos += cuantos;
      }
    }

    if (hechos % (enParalelo * 25) < enParalelo) {
      const porSegundo = hechos / ((Date.now() - arranque) / 1000);
      const faltan = Math.round((candidatos.length - hechos) / porSegundo / 60);
      console.log(
        `${hechos}/${candidatos.length} · ${conPalmares} con palmarés · ${titulos} títulos · ` +
          `${porSegundo.toFixed(1)}/s · faltan ~${faltan} min`,
      );
    }
  }

  console.log(
    `Listo: ${hechos} revisados, ${conPalmares} con palmarés, ${titulos} títulos` +
      `${cortado ? ' (cortado por cuota)' : ''}`,
  );
  await app.close();
}

void main();
