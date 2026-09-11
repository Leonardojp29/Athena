import { describe, expect, it } from 'vitest';
import type { FootballDataProvider, ProviderMatchDetail } from '@athena/domain';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { CerrarPartidosUseCase } from './cerrar-partidos.usecase.js';
import type { Veredicto } from './cierre-politica.js';
import type { MatchEventWriter } from './match-event.writer.js';
import type { MatchSyncService, PartidoPorCerrar } from './match-sync.service.js';
import type { SyncMatchDetailUseCase } from './sync-match-detail.usecase.js';
import type { SyncMatchPlayersUseCase } from './sync-match-players.usecase.js';

const PARTIDO: PartidoPorCerrar = {
  matchId: '11111111-1111-1111-1111-111111111111',
  providerRef: '1635628',
  kickoffUtc: new Date(Date.now() - 3 * 3600_000),
  status: 'finished',
  estado: {
    eventosCompleto: false,
    alineacionesCompleto: false,
    estadisticasCompleto: false,
    jugadoresCompleto: false,
    intentos: 0,
    cobertura: null,
  },
};

const detalle = (extra: Partial<ProviderMatchDetail> = {}): ProviderMatchDetail => ({
  match: { providerRef: PARTIDO.providerRef, data: {} as never },
  events: [{} as never],
  lineups: [{} as never, {} as never],
  statistics: [{} as never, {} as never],
  playerStatistics: Array.from({ length: 30 }, () => ({}) as never),
  ...extra,
});

function armar(detalles: ProviderMatchDetail[]) {
  const escrito = { eventos: 0, alineaciones: 0, estadisticas: 0, jugadores: 0 };
  const registrados: Veredicto[] = [];
  const borradas: string[] = [];

  const sync = {
    registrarIntento: (_id: string, veredicto: Veredicto) => {
      registrados.push(veredicto);
      return Promise.resolve();
    },
  } as unknown as MatchSyncService;

  const detalleUseCase = {
    escribirAlineaciones: (_id: string, filas: unknown[]) => {
      escrito.alineaciones++;
      return Promise.resolve(filas.length);
    },
    escribirEstadisticas: (_id: string, filas: unknown[]) => {
      escrito.estadisticas++;
      return Promise.resolve(filas.length);
    },
  } as unknown as SyncMatchDetailUseCase;

  const jugadores = {
    escribir: (_id: string, filas: unknown[]) => {
      escrito.jugadores++;
      return Promise.resolve(filas.length);
    },
  } as unknown as SyncMatchPlayersUseCase;

  const eventos = {
    replace: (_p: string, _id: string, filas: unknown[]) => {
      escrito.eventos++;
      return Promise.resolve(filas.length);
    },
  } as unknown as MatchEventWriter;

  const cache = new ViewCacheService();
  const borrar = cache.borrar.bind(cache);
  cache.borrar = (clave: string) => {
    borradas.push(clave);
    borrar(clave);
  };

  const provider = {
    name: 'api-football',
    getMatchDetails: () => Promise.resolve(detalles),
  } as unknown as FootballDataProvider;

  const uso = new CerrarPartidosUseCase(sync, detalleUseCase, jugadores, eventos, cache, provider);
  return { uso, escrito, registrados, borradas };
}

describe('CerrarPartidosUseCase', () => {
  it('un partido completo se escribe una vez y queda cerrado', async () => {
    const { uso, escrito, registrados, borradas } = armar([detalle()]);

    const resultado = await uso.cerrarLote([PARTIDO]);

    expect(escrito).toEqual({ eventos: 1, alineaciones: 1, estadisticas: 1, jugadores: 1 });
    expect(registrados[0]?.motivo).toBe('completo');
    expect(resultado.cerrados).toEqual([PARTIDO.matchId]);
    expect(resultado.pedidos).toBe(1);
    expect(borradas).toEqual([`match:${PARTIDO.matchId}`]);
  });

  /* La faceta que ya está guardada no se vuelve a escribir aunque el proveedor la mande de nuevo. */
  it('no reescribe lo que ya estaba completo', async () => {
    const { uso, escrito } = armar([detalle()]);
    const conEventos = { ...PARTIDO, estado: { ...PARTIDO.estado, eventosCompleto: true } };

    await uso.cerrarLote([conEventos]);

    expect(escrito.eventos).toBe(0);
    expect(escrito.alineaciones).toBe(1);
  });

  it('una respuesta vacía no cierra nada y deja el partido para el próximo intento', async () => {
    const { uso, registrados } = armar([
      detalle({ lineups: [], statistics: [], playerStatistics: [], events: [] }),
    ]);

    const resultado = await uso.cerrarLote([PARTIDO]);

    expect(resultado.cerrados).toEqual([]);
    expect(registrados[0]?.motivo).toBe('pendiente');
    expect(registrados[0]?.intentos).toBe(1);
  });

  it('un partido que el proveedor no devolvió queda anotado con su motivo', async () => {
    const { uso, registrados, escrito } = armar([]);

    await uso.cerrarLote([PARTIDO]);

    expect(escrito).toEqual({ eventos: 0, alineaciones: 0, estadisticas: 0, jugadores: 0 });
    expect(registrados[0]?.motivo).toBe('pendiente');
  });
});
