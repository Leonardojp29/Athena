import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { CerrarPartidosUseCase, PARTIDOS_POR_LOTE } from '../modules/sync/cerrar-partidos.usecase.js';
import { MatchSyncService } from '../modules/sync/match-sync.service.js';
import { SyncModule } from '../modules/sync/sync.module.js';
import { ColaDeTareas } from '../modules/worker/cola-de-tareas.service.js';

@Module({ imports: [SharedModule, SyncModule], providers: [ColaDeTareas] })
class CerrarModule {}

/**
 * Cierra de una vez todos los partidos terminados que quedaron sin detalle.
 *
 * El barrido del tic hace esto solo, pero de a un lote por vuelta: cuando hay semanas de atraso
 * —un latido caído, una migración recién desplegada— este script lo resuelve en minutos. Un lote de
 * veinte partidos cuesta un pedido, así que dos semanas de fútbol son unas veinte llamadas.
 *
 *   DIAS=7           hasta qué antigüedad rellenar; 3650 barre el archivo entero
 *   LIMITE=1000      tope de partidos de esta corrida
 *   PISO_CUOTA=5000  corta si la cuota real del día baja de esto
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CerrarModule, {
    logger: ['warn', 'error'],
  });
  const sync = app.get(MatchSyncService);
  const cerrar = app.get(CerrarPartidosUseCase);
  const budget = app.get(ApiBudgetService);
  const cola = app.get(ColaDeTareas);

  const limite = Number(process.env.LIMITE ?? 1000);
  const pisoDeCuota = Number(process.env.PISO_CUOTA ?? 5000);
  const ventanaMs = Number(process.env.DIAS ?? 7) * 24 * 3600_000;

  let revisados = 0;
  let cerrados = 0;
  let pedidos = 0;

  while (revisados < limite) {
    const { dayRemaining } = await budget.snapshot();
    if (dayRemaining !== null && dayRemaining < pisoDeCuota) {
      console.log(`Corte por cuota: quedan ${dayRemaining} pedidos del día`);
      break;
    }

    const partidos = await sync.candidatosDeCierre(
      Math.min(PARTIDOS_POR_LOTE, limite - revisados),
      ventanaMs,
    );
    if (partidos.length === 0) break;

    const resultado = await cerrar.cerrarLote(partidos, ventanaMs);
    /* Un partido cerrado todavía no tiene relato: el análisis se arma con lo que acaba de llegar. */
    for (const matchId of resultado.cerrados) {
      await cola.encolar('match-insight', { matchId });
    }
    revisados += resultado.revisados;
    cerrados += resultado.cerrados.length;
    pedidos += resultado.pedidos;
    console.log(`${revisados} revisados · ${cerrados} cerrados · ${pedidos} pedidos al proveedor`);
  }

  const resumen = await sync.resumen();
  console.log(
    `Pendientes de las últimas 48 h: ${resumen.pendientes} · completos del día: ${resumen.completosDelDia}/${resumen.terminadosDelDia}`,
  );
  await app.close();
}

void main();
