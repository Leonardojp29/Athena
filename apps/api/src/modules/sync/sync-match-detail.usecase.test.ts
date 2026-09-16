import { describe, expect, it } from 'vitest';
import type { ProviderLineup, ProviderMatchStatistics } from '@athena/domain';
import type { PrismaService } from '../../shared/prisma.service.js';
import type { CoachResolverService } from './coach-resolver.service.js';
import type { ExternalReferenceService } from './external-reference.service.js';
import { SyncMatchDetailUseCase } from './sync-match-detail.usecase.js';

const MATCH = '11111111-1111-1111-1111-111111111111';
const EQUIPOS = new Map([
  ['100', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  ['200', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],
]);

function armar() {
  const upserts: Array<Record<string, unknown>> = [];
  const prisma = {
    matchStatistics: { upsert: (args: Record<string, unknown>) => (upserts.push(args), Promise.resolve()) },
    matchLineup: { upsert: (args: Record<string, unknown>) => (upserts.push(args), Promise.resolve()) },
    player: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaService;
  const refs = {
    resolveMany: () => Promise.resolve(EQUIPOS),
  } as unknown as ExternalReferenceService;
  const provider = { name: 'api-football' } as never;
  const entrenadores = {
    resolveMany: () => Promise.resolve(new Map<string, string>()),
  } as unknown as CoachResolverService;

  return { uso: new SyncMatchDetailUseCase(prisma, refs, entrenadores, provider), upserts };
}

const estadistica = (teamRef: string, possessionPercent: number | null): ProviderMatchStatistics =>
  ({ teamRef, possessionPercent, shotsTotal: null, corners: null }) as ProviderMatchStatistics;

const alineacion = (teamRef: string, formation: string | null, titulares: number): ProviderLineup =>
  ({
    teamRef,
    formation,
    coachName: 'DT',
    colors: { primary: null, secondary: null },
    startXi: Array.from({ length: titulares }, (_, i) => ({ playerRef: String(i), name: 'J', number: i, position: 'G', grid: null })),
    substitutes: [],
  }) as unknown as ProviderLineup;

describe('SyncMatchDetailUseCase', () => {
  /* El proveedor manda a veces las dos entradas con todas las métricas en null: eso no es una estadística. */
  it('no guarda ni cuenta estadísticas sin una sola métrica', async () => {
    const { uso, upserts } = armar();

    const escritas = await uso.escribirEstadisticas(MATCH, [
      estadistica('100', null),
      estadistica('200', null),
    ]);

    expect(escritas).toBe(0);
    expect(upserts).toHaveLength(0);
  });

  it('guarda las que sí traen dato', async () => {
    const { uso, upserts } = armar();

    const escritas = await uso.escribirEstadisticas(MATCH, [
      estadistica('100', 62),
      estadistica('200', 38),
    ]);

    expect(escritas).toBe(2);
    expect(upserts).toHaveLength(2);
  });

  it('una alineación sin formación o sin los once no cuenta como dibujable', async () => {
    const { uso } = armar();

    expect(await uso.escribirAlineaciones(MATCH, [alineacion('100', null, 11)])).toBe(0);
    expect(await uso.escribirAlineaciones(MATCH, [alineacion('100', '4-3-3', 7)])).toBe(0);
    expect(await uso.escribirAlineaciones(MATCH, [alineacion('100', '4-3-3', 11)])).toBe(1);
  });
});
