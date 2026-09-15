import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SharedModule } from '../shared/shared.module.js';
import { JuegosModule } from '../modules/juegos/juegos.module.js';
import {
  AuditarRetosService,
  type EstadoDelReto,
  type Veredicto,
} from '../modules/juegos/auditar-retos.service.js';

@Module({ imports: [SharedModule, JuegosModule] })
class AuditoriaModule {}

const ETIQUETA: Record<EstadoDelReto, string> = {
  ok: 'ok',
  'ok-manual': 'ok (a mano)',
  'sin-partido': 'sin partido',
  'sin-alineacion': 'sin alineación',
  'sin-disposicion': 'sin disposición',
  'xi-incompleto': 'XI incompleto',
};

/* Relativo al archivo y no al directorio de trabajo: el script se corre desde `apps/api`. */
const INFORME = fileURLToPath(new URL('../../../../docs/juegos/AUDITORIA-ADIVINA-EL-XI.md', import.meta.url));

/**
 * Audita los retos de Adivina el XI contra API-Football. No escribe nada en la base.
 *
 *   SOLO=int-facil-1,per-normal-3   audita solo esos
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AuditoriaModule, {
    logger: ['warn', 'error'],
  });
  const auditoria = app.get(AuditarRetosService);

  const claves = (process.env.SOLO ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const veredictos = await auditoria.revisarTodos(claves);
  for (const v of veredictos) {
    console.log(
      `${v.reto.clave.padEnd(15)} ${ETIQUETA[v.estado].padEnd(15)} ` +
        `fixture ${String(v.fixtureRef ?? '—').padEnd(9)} ${(v.formacion ?? '—').padEnd(9)} ` +
        `${v.titulares}/11 · ${v.conCasilla} con casilla · ${v.porCrear} por crear`,
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
  const fila = (v: Veredicto): string =>
    `| ${v.reto.clave} | ${v.reto.dificultad} | ${v.reto.localNombre} ${v.reto.marcador[0]}-${v.reto.marcador[1]} ${v.reto.visitaNombre} | ` +
    `${v.reto.competencia} ${v.reto.anio} | **${ETIQUETA[v.estado]}** | ${v.fixtureRef ?? '—'} | ` +
    `${v.jugadoEn ?? '—'} | ${v.formacion ?? '—'} | ${v.titulares}/11 | ${v.porCrear} |`;

  const cuerpo = [
    '# Adivina el XI — auditoría de los retos contra API-Football',
    '',
    `Generado el ${new Date().toISOString().slice(0, 10)}. Un reto en cualquier estado que no sea`,
    '`ok` no entra al catálogo: el juego nunca debe mostrar una partida rota.',
    '',
    '| clave | dificultad | partido | competencia | estado | fixture | fecha | formación | titulares | por crear |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...veredictos.map(fila),
    '',
  ].join('\n');

  await mkdir(dirname(INFORME), { recursive: true });
  await writeFile(INFORME, cuerpo, 'utf8');
}

void main();
