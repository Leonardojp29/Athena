import { describe, expect, it } from 'vitest';
import {
  ANTIGUEDAD_MAXIMA_MS,
  esperaDeCierre,
  evaluarIntento,
  faseDe,
  facetasPendientes,
  type EstadoDeCierre,
  type LlegadaDeFacetas,
} from './cierre-politica.js';

const AHORA = new Date('2026-09-11T18:00:00.000Z');
const RECIEN_TERMINADO = new Date(AHORA.getTime() - 2 * 3600_000);

const nuevo = (extra: Partial<EstadoDeCierre> = {}): EstadoDeCierre => ({
  eventosCompleto: false,
  alineacionesCompleto: false,
  estadisticasCompleto: false,
  jugadoresCompleto: false,
  intentos: 0,
  cobertura: null,
  ...extra,
});

const vacio: LlegadaDeFacetas = { eventos: null, alineaciones: null, estadisticas: null, jugadores: null };
const completo: LlegadaDeFacetas = { eventos: 19, alineaciones: 2, estadisticas: 2, jugadores: 34 };

describe('la política de cierre', () => {
  it('un partido con todo cerrado no vuelve a preguntarse', () => {
    const veredicto = evaluarIntento({
      estado: nuevo(),
      llegada: completo,
      fase: 'cierre',
      kickoff: RECIEN_TERMINADO,
      ahora: AHORA,
    });

    expect(veredicto.motivo).toBe('completo');
    expect(veredicto.cerradoEn).toEqual(AHORA);
    expect(Object.values(veredicto.completo).every(Boolean)).toBe(true);
  });

  /* El proveedor responde con listas vacías mientras el dato todavía no existe: eso es "todavía no". */
  it('una respuesta vacía espera, no cierra', () => {
    const veredicto = evaluarIntento({
      estado: nuevo(),
      llegada: { eventos: 0, alineaciones: 0, estadisticas: 0, jugadores: 0 },
      fase: 'cierre',
      kickoff: RECIEN_TERMINADO,
      ahora: AHORA,
    });

    expect(veredicto.motivo).toBe('pendiente');
    expect(veredicto.cerradoEn).toBeNull();
    expect(veredicto.intentos).toBe(1);
    expect(veredicto.proximoIntento.getTime() - AHORA.getTime()).toBe(15 * 60_000);
  });

  it('la espera crece con cada intento hasta el día', () => {
    expect(esperaDeCierre(1)).toBe(15 * 60_000);
    expect(esperaDeCierre(2)).toBe(60 * 60_000);
    expect(esperaDeCierre(3)).toBe(6 * 3600_000);
    expect(esperaDeCierre(4)).toBe(24 * 3600_000);
    expect(esperaDeCierre(9)).toBe(24 * 3600_000);
  });

  it('una alineación a medias no cuenta como alineación', () => {
    const veredicto = evaluarIntento({
      estado: nuevo(),
      llegada: { ...vacio, alineaciones: 1 },
      fase: 'cierre',
      kickoff: RECIEN_TERMINADO,
      ahora: AHORA,
    });

    expect(veredicto.completo.alineaciones).toBe(false);
  });

  /* Mientras el partido no termina, nada se da por cerrado: las notas y la posesión siguen moviéndose. */
  it('un partido en curso vuelve en cinco minutos y no cierra ninguna faceta', () => {
    const veredicto = evaluarIntento({
      estado: nuevo({ intentos: 3 }),
      llegada: completo,
      fase: 'en-juego',
      kickoff: new Date(AHORA.getTime() - 30 * 60_000),
      ahora: AHORA,
    });

    expect(veredicto.intentos).toBe(3);
    expect(Object.values(veredicto.completo).some(Boolean)).toBe(false);
    expect(veredicto.cerradoEn).toBeNull();
    expect(veredicto.proximoIntento.getTime() - AHORA.getTime()).toBe(5 * 60_000);
  });

  it('la previa vuelve en quince minutos, a esperar la alineación', () => {
    const veredicto = evaluarIntento({
      estado: nuevo(),
      llegada: { ...vacio, alineaciones: 2 },
      fase: 'previa',
      kickoff: new Date(AHORA.getTime() + 30 * 60_000),
      ahora: AHORA,
    });

    expect(veredicto.proximoIntento.getTime() - AHORA.getTime()).toBe(15 * 60_000);
    expect(veredicto.cerradoEn).toBeNull();
  });

  it('la fase sale del estado del partido', () => {
    expect(faseDe('finished')).toBe('cierre');
    expect(faseDe('in_play')).toBe('en-juego');
    expect(faseDe('paused')).toBe('en-juego');
    expect(faseDe('scheduled')).toBe('previa');
  });

  it('a la semana se abandona', () => {
    const veredicto = evaluarIntento({
      estado: nuevo(),
      llegada: vacio,
      fase: 'cierre',
      kickoff: new Date(AHORA.getTime() - ANTIGUEDAD_MAXIMA_MS - 1),
      ahora: AHORA,
    });

    expect(veredicto.motivo).toBe('abandonado');
    expect(veredicto.cerradoEn).toEqual(AHORA);
  });

  /* Una liga que no publica notas por jugador no puede dejar el partido abierto para siempre. */
  it('lo que la competencia no publica no se pide', () => {
    const estado = nuevo({ cobertura: { jugadores: false, estadisticas: false } });
    expect(facetasPendientes(estado)).toEqual(['eventos', 'alineaciones']);

    const veredicto = evaluarIntento({
      estado,
      llegada: { eventos: 12, alineaciones: 2, estadisticas: 0, jugadores: 0 },
      fase: 'cierre',
      kickoff: RECIEN_TERMINADO,
      ahora: AHORA,
    });

    expect(veredicto.motivo).toBe('sin-cobertura');
    expect(veredicto.cerradoEn).toEqual(AHORA);
  });

  it('lo ya guardado no se pierde cuando una vuelta trae menos', () => {
    const veredicto = evaluarIntento({
      estado: nuevo({ alineacionesCompleto: true, eventosCompleto: true }),
      llegada: vacio,
      fase: 'cierre',
      kickoff: RECIEN_TERMINADO,
      ahora: AHORA,
    });

    expect(veredicto.completo.alineaciones).toBe(true);
    expect(veredicto.completo.eventos).toBe(true);
    expect(veredicto.motivo).toBe('pendiente');
  });
});
