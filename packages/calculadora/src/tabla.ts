import type {
  DefinicionDeTabla,
  Equipo,
  Fila,
  OrdenOficial,
  Partido,
  Pronosticos,
  Tabla,
} from './tipos.js';

/**
 * La tabla, rehecha desde los resultados.
 *
 * Un partido suma cuando terminó, cuando está en curso —el marcador de ahora es un resultado
 * como cualquier otro mientras dure— o cuando el lector lo pronosticó. Los suspendidos y los
 * cancelados no suman nada: no se jugaron y nadie sabe si se jugarán.
 */

interface Acumulado {
  puntos: number;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
}

const JUGADO = new Set(['finished', 'in_play', 'paused']);
/** Lo cancelado, suspendido o abandonado no se juega ni se pronostica: nadie sabe si volverá. */
const PRONOSTICABLE = new Set(['scheduled', 'postponed']);

function marcadorDe(
  partido: Partido,
  pronosticos: Pronosticos,
): readonly [number, number] | null {
  if (JUGADO.has(partido.estado)) {
    if (partido.golesLocal === null || partido.golesVisita === null) return null;
    return [partido.golesLocal, partido.golesVisita];
  }
  if (!PRONOSTICABLE.has(partido.estado)) return null;
  return pronosticos.get(partido.id) ?? null;
}

function vacio(): Acumulado {
  return {
    puntos: 0,
    jugados: 0,
    ganados: 0,
    empatados: 0,
    perdidos: 0,
    golesFavor: 0,
    golesContra: 0,
  };
}

function anotar(acumulado: Acumulado, favor: number, contra: number): void {
  acumulado.jugados += 1;
  acumulado.golesFavor += favor;
  acumulado.golesContra += contra;
  if (favor > contra) {
    acumulado.ganados += 1;
    acumulado.puntos += 3;
  } else if (favor === contra) {
    acumulado.empatados += 1;
    acumulado.puntos += 1;
  } else {
    acumulado.perdidos += 1;
  }
}

/**
 * El ▲▼ se mide contra la tabla de hoy **calculada por nosotros**, no contra el orden que publica
 * el proveedor. No es lo mismo: su tabla se refresca aparte de los resultados y llega a quedar a
 * medio actualizar —hoy mismo pone a Juan Pablo II quinto con doce puntos, delante de dos equipos
 * con catorce—. Además así la flecha responde lo que el lector pregunta: cuánto movió **su**
 * pronóstico, no cuánto lleva de atraso el proveedor.
 */
export function calcularTabla(
  definicion: DefinicionDeTabla,
  equipos: readonly Equipo[],
  partidos: readonly Partido[],
  pronosticos: Pronosticos,
  ordenOficial: readonly OrdenOficial[],
  base?: readonly string[],
): Tabla {
  const cuenta = new Map<string, Acumulado>(equipos.map((e) => [e.id, vacio()]));
  const suma = definicion.fases.length === 0;

  for (const partido of partidos) {
    if (!suma && !definicion.fases.includes(partido.fase)) continue;
    const marcador = marcadorDe(partido, pronosticos);
    if (marcador === null) continue;
    const local = cuenta.get(partido.local);
    const visita = cuenta.get(partido.visita);
    if (!local || !visita) continue;
    anotar(local, marcador[0], marcador[1]);
    anotar(visita, marcador[1], marcador[0]);
  }

  const oficial = ordenOficial.find((o) => o.clave === definicion.clave)?.equipos ?? [];
  const puestoOficial = new Map(oficial.map((id, indice) => [id, indice]));
  const SIN_PUESTO = oficial.length;

  const filas = equipos
    .map((equipo) => {
      const a = cuenta.get(equipo.id) ?? vacio();
      return {
        equipo,
        ...a,
        diferencia: a.golesFavor - a.golesContra,
        posicion: 0,
        movimiento: 0,
      };
    })
    .sort(
      (a, b) =>
        b.puntos - a.puntos ||
        b.diferencia - a.diferencia ||
        b.golesFavor - a.golesFavor ||
        (puestoOficial.get(a.equipo.id) ?? SIN_PUESTO) -
          (puestoOficial.get(b.equipo.id) ?? SIN_PUESTO) ||
        a.equipo.nombre.localeCompare(b.equipo.nombre),
    );

  const puestoBase = new Map((base ?? []).map((id, indice) => [id, indice]));

  return {
    clave: definicion.clave,
    titulo: definicion.titulo,
    filas: filas.map((fila, indice): Fila => {
      const previa = puestoBase.get(fila.equipo.id);
      return {
        ...fila,
        posicion: indice + 1,
        movimiento: previa === undefined ? 0 : previa - indice,
      };
    }),
  };
}

/**
 * Las tres tablas de una vez. La base sin pronósticos se calcula acá adentro para que el ▲▼ salga
 * solo y nadie tenga que acordarse de pasarla.
 */
export function calcularTablas(
  definiciones: readonly DefinicionDeTabla[],
  equipos: readonly Equipo[],
  partidos: readonly Partido[],
  pronosticos: Pronosticos,
  ordenOficial: readonly OrdenOficial[],
): Tabla[] {
  const vacio: Pronosticos = new Map();
  return definiciones.map((definicion) => {
    const base = calcularTabla(definicion, equipos, partidos, vacio, ordenOficial);
    return calcularTabla(
      definicion,
      equipos,
      partidos,
      pronosticos,
      ordenOficial,
      base.filas.map((f) => f.equipo.id),
    );
  });
}
