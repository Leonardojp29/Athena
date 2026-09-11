export const FACETAS = ['eventos', 'alineaciones', 'estadisticas', 'jugadores'] as const;
export type Faceta = (typeof FACETAS)[number];

export type Cobertura = Partial<Record<Faceta, boolean>>;

/**
 * En qué momento se le pregunta a un partido.
 *
 * Solo un partido terminado puede dar una faceta por cerrada: mientras se juega, las estadísticas
 * y las notas cambian cada pocos minutos y la alineación todavía admite una baja de último momento.
 */
export type Fase = 'previa' | 'en-juego' | 'cierre';

export interface EstadoDeCierre {
  eventosCompleto: boolean;
  alineacionesCompleto: boolean;
  estadisticasCompleto: boolean;
  jugadoresCompleto: boolean;
  intentos: number;
  cobertura: Cobertura | null;
}

/** Cuántas filas trajo cada faceta; `null` es la faceta que el proveedor ni siquiera mandó. */
export interface LlegadaDeFacetas {
  eventos: number | null;
  alineaciones: number | null;
  estadisticas: number | null;
  jugadores: number | null;
}

export interface Veredicto {
  completo: Record<Faceta, boolean>;
  intentos: number;
  proximoIntento: Date;
  cerradoEn: Date | null;
  motivo: 'completo' | 'sin-cobertura' | 'abandonado' | 'pendiente';
}

const CAMPO: Record<Faceta, keyof EstadoDeCierre> = {
  eventos: 'eventosCompleto',
  alineaciones: 'alineacionesCompleto',
  estadisticas: 'estadisticasCompleto',
  jugadores: 'jugadoresCompleto',
};

/* El proveedor publica la alineación unos cuarenta minutos antes del pitazo y mueve las notas cada cinco. */
const ESPERA_POR_FASE: Record<Exclude<Fase, 'cierre'>, number> = {
  previa: 15 * 60_000,
  'en-juego': 5 * 60_000,
};

/*
 * Un dato que no llegó con el pitazo final puede tardar horas; insistir cada minuto con cada partido
 * reciente son ochenta pedidos por minuto de una cuota que se comparte con otros sistemas.
 */
const ESPERAS_DE_CIERRE_MS = [15 * 60_000, 60 * 60_000, 6 * 3600_000, 24 * 3600_000];
export const ESPERA_TRAS_EL_PITAZO_MS = 5 * 60_000;
/** A la semana el partido ya es archivo: lo que falte se rellena a mano. */
export const ANTIGUEDAD_MAXIMA_MS = 7 * 24 * 3600_000;

export function faseDe(status: string): Fase {
  if (status === 'finished') return 'cierre';
  if (status === 'in_play' || status === 'paused') return 'en-juego';
  return 'previa';
}

export function esperaDeCierre(intentos: number): number {
  const indice = Math.min(Math.max(intentos - 1, 0), ESPERAS_DE_CIERRE_MS.length - 1);
  return ESPERAS_DE_CIERRE_MS[indice] as number;
}

export function facetasPendientes(estado: EstadoDeCierre): Faceta[] {
  return FACETAS.filter((faceta) => !estado[CAMPO[faceta]] && cubre(estado.cobertura, faceta));
}

function cubre(cobertura: Cobertura | null, faceta: Faceta): boolean {
  return cobertura?.[faceta] !== false;
}

/**
 * Cuántas filas hacen falta para dar una faceta por cerrada.
 *
 * Una alineación a medias existe: el proveedor ha publicado los once sin formación y los ha
 * completado horas después, y esa no se puede dibujar en la cancha.
 */
export function evaluarLlegada(
  estado: EstadoDeCierre,
  llegada: LlegadaDeFacetas,
): Record<Faceta, boolean> {
  return {
    eventos: estado.eventosCompleto || (llegada.eventos ?? 0) > 0,
    alineaciones: estado.alineacionesCompleto || (llegada.alineaciones ?? 0) >= 2,
    estadisticas: estado.estadisticasCompleto || (llegada.estadisticas ?? 0) >= 2,
    jugadores: estado.jugadoresCompleto || (llegada.jugadores ?? 0) >= 22,
  };
}

export function evaluarIntento(opciones: {
  estado: EstadoDeCierre;
  llegada: LlegadaDeFacetas;
  fase: Fase;
  kickoff: Date;
  ahora: Date;
  /** Hasta qué antigüedad vale la pena insistir; el relleno del archivo la estira a propósito. */
  antiguedadMaximaMs?: number;
}): Veredicto {
  const { estado, llegada, fase, kickoff, ahora } = opciones;
  const antiguedadMaximaMs = opciones.antiguedadMaximaMs ?? ANTIGUEDAD_MAXIMA_MS;

  if (fase !== 'cierre') {
    return {
      completo: yaCompleto(estado),
      intentos: estado.intentos,
      proximoIntento: new Date(ahora.getTime() + ESPERA_POR_FASE[fase]),
      cerradoEn: null,
      motivo: 'pendiente',
    };
  }

  const completo = evaluarLlegada(estado, llegada);
  const pendientes = facetasPendientes({ ...estado, ...aEstado(completo) });

  if (pendientes.length === 0) {
    const todas = FACETAS.every((faceta) => completo[faceta]);
    return {
      completo,
      intentos: estado.intentos,
      proximoIntento: ahora,
      cerradoEn: ahora,
      motivo: todas ? 'completo' : 'sin-cobertura',
    };
  }

  if (ahora.getTime() - kickoff.getTime() > antiguedadMaximaMs) {
    return {
      completo,
      intentos: estado.intentos + 1,
      proximoIntento: ahora,
      cerradoEn: ahora,
      motivo: 'abandonado',
    };
  }

  const intentos = estado.intentos + 1;
  return {
    completo,
    intentos,
    proximoIntento: new Date(ahora.getTime() + esperaDeCierre(intentos)),
    cerradoEn: null,
    motivo: 'pendiente',
  };
}

function yaCompleto(estado: EstadoDeCierre): Record<Faceta, boolean> {
  return {
    eventos: estado.eventosCompleto,
    alineaciones: estado.alineacionesCompleto,
    estadisticas: estado.estadisticasCompleto,
    jugadores: estado.jugadoresCompleto,
  };
}

function aEstado(completo: Record<Faceta, boolean>): Partial<EstadoDeCierre> {
  return {
    eventosCompleto: completo.eventos,
    alineacionesCompleto: completo.alineaciones,
    estadisticasCompleto: completo.estadisticas,
    jugadoresCompleto: completo.jugadores,
  };
}
