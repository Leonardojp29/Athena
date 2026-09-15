import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import {
  Auditar60Service,
  type EstadoDeLaPregunta,
  type Veredicto,
} from '../modules/juegos/auditar-60.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class AuditoriaModule {}

const ETIQUETA: Record<EstadoDeLaPregunta, string> = {
  ok: 'ok',
  'ok-a-mano': 'ok (a mano)',
  'no-cuadra': 'NO CUADRA',
  'sin-partido': 'sin partido',
  'sin-foto': 'sin foto',
  'sin-datos': 'sin datos',
};

/* Relativo al archivo y no al directorio de trabajo: el script se corre desde `apps/api`. */
const INFORME = fileURLToPath(
  new URL('../../../../docs/juegos/AUDITORIA-60-SEGUNDOS.md', import.meta.url),
);

/**
 * Audita las 50 preguntas de 60 Segundos contra API-Football. No escribe nada en la base.
 *
 *   SOLO=Q001,Q012   audita solo esas
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AuditoriaModule, {
    logger: ['warn', 'error'],
  });

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const veredictos = await app.get(Auditar60Service).revisarTodas(claves);

  for (const v of veredictos) {
    console.log(
      `${v.pregunta.clave} ${ETIQUETA[v.estado].padEnd(13)} ${(v.fixtureRef ?? '—').padEnd(10)} ` +
        `${v.pregunta.tipo.padEnd(16)} ${v.nota ?? ''}`,
    );
  }

  const porEstado = new Map<EstadoDeLaPregunta, number>();
  for (const v of veredictos) porEstado.set(v.estado, (porEstado.get(v.estado) ?? 0) + 1);
  console.log('\n' + [...porEstado].map(([e, n]) => `${ETIQUETA[e]}: ${n}`).join(' · '));

  await escribirInforme(veredictos);
  console.log('informe en', INFORME);
  await app.close();
}

async function escribirInforme(veredictos: Veredicto[]): Promise<void> {
  const SEMAFORO: Record<EstadoDeLaPregunta, string> = {
    ok: 'validada con API-Football',
    'ok-a-mano': 'validación editorial',
    'no-cuadra': 'INCORRECTA',
    'sin-partido': 'sin partido',
    'sin-foto': 'sin foto',
    'sin-datos': 'sin datos del proveedor',
  };

  const fila = (v: Veredicto): string =>
    `| ${v.pregunta.clave} | ${v.pregunta.tipo} | ${v.pregunta.dificultad} | ` +
    `**${SEMAFORO[v.estado]}** | ${v.fixtureRef ?? '—'} | ${v.nota ?? ''} |`;

  const cuerpo = [
    '# 60 Segundos — auditoría de las preguntas contra API-Football',
    '',
    `Generado el ${new Date().toISOString().slice(0, 10)}.`,
    '',
    'Una pregunta entra al catálogo si el proveedor confirma su respuesta, o si es de las que él no',
    'puede comprobar —el Balón de Oro, los acumulados históricos— y la respalda el editor. Lo que',
    'sale **INCORRECTA** se reporta y queda bloqueado: no se sustituye por cuenta propia.',
    '',
    '| pregunta | tipo | dificultad | estado | fixture | qué dice el proveedor |',
    '|---|---|---|---|---|---|',
    ...veredictos.map(fila),
    '',
  ].join('\n');

  await mkdir(dirname(INFORME), { recursive: true });
  await writeFile(INFORME, cuerpo, 'utf8');
}

void main();
