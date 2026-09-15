import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import {
  AuditarImpostorService,
  type EstadoDelReto,
  type Veredicto,
} from '../modules/juegos/auditar-impostor.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class AuditoriaModule {}

const ETIQUETA: Record<EstadoDelReto, string> = {
  ok: 'ok',
  'ok-a-mano': 'ok (a mano)',
  'ok-con-reparo': 'ok (con reparo)',
  'impostor-cumple': 'CONDICIÓN MAL',
  'falta-alguno': 'falta alguno',
  'foto-repetida': 'foto repetida',
  'sin-partido': 'sin partido',
};

/* Relativo al archivo y no al directorio de trabajo: el script se corre desde `apps/api`. */
const INFORME = fileURLToPath(
  new URL('../../../../docs/juegos/AUDITORIA-EL-IMPOSTOR.md', import.meta.url),
);

/**
 * Audita los retos de El Impostor contra API-Football. No escribe nada en la base.
 *
 *   SOLO=IMP-001,IMP-012   audita solo esos
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AuditoriaModule, {
    logger: ['warn', 'error'],
  });

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const veredictos = await app.get(AuditarImpostorService).revisarTodos(claves);

  for (const v of veredictos) {
    console.log(
      `${v.reto.clave} ${ETIQUETA[v.estado].padEnd(16)} ${(v.fixtureRef ?? v.contexto ?? '—').padEnd(24)} ` +
        `${v.porCrear} por crear${v.nota ? ' · ' + v.nota : ''}`,
    );
  }

  const porEstado = new Map<EstadoDelReto, number>();
  for (const v of veredictos) porEstado.set(v.estado, (porEstado.get(v.estado) ?? 0) + 1);
  console.log('\n' + [...porEstado].map(([e, n]) => `${ETIQUETA[e]}: ${n}`).join(' · '));
  console.log('futbolistas por crear:', veredictos.reduce((t, v) => t + v.porCrear, 0));

  await escribirInforme(veredictos);
  console.log('informe en', INFORME);
  await app.close();
}

async function escribirInforme(veredictos: Veredicto[]): Promise<void> {
  const SEMAFORO: Record<EstadoDelReto, string> = {
    ok: 'válido',
    'ok-a-mano': 'válido · revisión editorial',
    'ok-con-reparo': 'válido · con reparo',
    'impostor-cumple': 'INCORRECTO',
    'falta-alguno': 'falta un futbolista',
    'foto-repetida': 'sin foto propia',
    'sin-partido': 'sin partido',
  };

  const fila = (v: Veredicto): string =>
    `| ${v.reto.clave} | ${v.reto.dificultad} | ${v.reto.categoria} | **${SEMAFORO[v.estado]}** | ` +
    `${v.fixtureRef ?? '—'} | ${v.seis.filter((s) => s.enAthena).length}/6 | ${v.porCrear} | ${v.nota ?? ''} |`;

  const cuerpo = [
    '# El Impostor — auditoría de los retos contra API-Football',
    '',
    `Generado el ${new Date().toISOString().slice(0, 10)}. Un reto entra al catálogo solo si sus seis`,
    'futbolistas existen, tienen foto propia —la silueta genérica del proveedor no cuenta— y la',
    'condición se cumple: los cinco sí, el impostor no.',
    '',
    '| reto | dificultad | categoría | estado | fixture | en Athena | por crear | nota |',
    '|---|---|---|---|---|---|---|---|',
    ...veredictos.map(fila),
    '',
  ].join('\n');

  await mkdir(dirname(INFORME), { recursive: true });
  await writeFile(INFORME, cuerpo, 'utf8');
}

void main();
