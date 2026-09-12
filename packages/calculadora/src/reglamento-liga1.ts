import type { ReglasLiga, Tabla } from './tipos.js';

/**
 * El reglamento de la Liga 1 2026, codificado.
 *
 * Son datos y no código: las zonas, los cupos y el camino al título viven en esta tabla porque la
 * próxima liga con Apertura y Clausura —Uruguay, Colombia— es otro objeto igual y no otro motor.
 *
 * El campeón no sale de una tabla sino de un árbol de cuatro ramas, y cada rama se acompaña de la
 * frase del reglamento que la manda: en Athena un número siempre viene con lo que lo sostiene.
 */

export const APERTURA = 'apertura';
export const CLAUSURA = 'clausura';
export const ANUAL = 'anual';

export const LIGA1: ReglasLiga = {
  claveAcumulada: ANUAL,
  tablas: [
    {
      clave: APERTURA,
      titulo: 'Apertura',
      fases: ['Apertura'],
      zonas: [{ zona: 'campeon', desde: 1, hasta: 1, etiqueta: 'Ganó el Apertura' }],
    },
    {
      clave: CLAUSURA,
      titulo: 'Clausura',
      fases: ['Clausura'],
      zonas: [{ zona: 'campeon', desde: 1, hasta: 1, etiqueta: 'Gana el Clausura' }],
    },
    {
      clave: ANUAL,
      titulo: 'Tabla anual',
      fases: [],
      zonas: [
        { zona: 'libertadores', desde: 1, hasta: 4, etiqueta: 'Copa Libertadores' },
        { zona: 'sudamericana', desde: 5, hasta: 8, etiqueta: 'Copa Sudamericana' },
        { zona: 'descenso', desde: 17, hasta: 18, etiqueta: 'Desciende' },
      ],
    },
  ],
};

/**
 * Quién juega un cruce. Puede ser un equipo, o el que salga de una semifinal que todavía no se
 * jugó: la final se arma contra "el ganador de la semifinal" y decir un nombre ahí sería inventar
 * un resultado.
 */
export type Participante =
  | { tipo: 'equipo'; id: string }
  | { tipo: 'ganadorDe'; semifinal: number };

export interface Cruce {
  ronda: 'semifinal' | 'final';
  local: Participante;
  visita: Participante;
}

const equipo = (id: string): Participante => ({ tipo: 'equipo', id });
const ganadorDe = (semifinal: number): Participante => ({ tipo: 'ganadorDe', semifinal });

export interface CaminoAlTitulo {
  tipo: 'campeon-directo' | 'final' | 'semifinal-y-final';
  /** Cuando alguien ya es campeón sin jugar. */
  campeon: string | null;
  cruces: Cruce[];
  fundamento: string;
}

const CAMPEON_DOBLE =
  'Si un equipo gana ambos torneos, se proclama campeón nacional automáticamente.';
const FINAL_DIRECTA =
  'Si los dos equipos ganadores de los torneos también eran los 2 primeros del acumulado, se jugará directamente la Final.';
const FINAL_CON_SEMI =
  'Si un equipo hubiese ganado Apertura o Clausura, y estuviese entre los dos primeros del acumulado, clasifica directamente a la Final. Su rival sería el ganador de la semifinal entre el otro ganador de uno de los torneos y el otro equipo de mayor puntaje en el acumulado.';
const SEMIS =
  'Si los campeones del Apertura y del Clausura y los 2 primeros del acumulado fuesen distintos equipos, se disputarán Semifinales y Final.';
/* Las bases no publican los cruces de este caso: se siembran por la acumulada, y así se declara. */
const SEMIS_SEMBRADAS = `${SEMIS} Los cruces se siembran por la tabla acumulada.`;

/**
 * Quién juega qué para definir el título, según quiénes ganaron los torneos y cómo quedó la
 * acumulada. Las cuatro ramas son las del reglamento, en su orden.
 */
export function caminoAlTitulo(
  apertura: Tabla,
  clausura: Tabla,
  anual: Tabla,
): CaminoAlTitulo | null {
  const ganadorApertura = apertura.filas[0]?.equipo.id;
  const ganadorClausura = clausura.filas[0]?.equipo.id;
  if (!ganadorApertura || !ganadorClausura) return null;

  const orden = anual.filas.map((fila) => fila.equipo.id);
  const [primero, segundo] = orden;
  if (!primero || !segundo) return null;

  if (ganadorApertura === ganadorClausura) {
    return {
      tipo: 'campeon-directo',
      campeon: ganadorApertura,
      cruces: [],
      fundamento: CAMPEON_DOBLE,
    };
  }

  const dosPrimeros = new Set([primero, segundo]);
  const aperturaArriba = dosPrimeros.has(ganadorApertura);
  const clausuraArriba = dosPrimeros.has(ganadorClausura);

  if (aperturaArriba && clausuraArriba) {
    return {
      tipo: 'final',
      campeon: null,
      cruces: [
        { ronda: 'final', local: equipo(ganadorApertura), visita: equipo(ganadorClausura) },
      ],
      fundamento: FINAL_DIRECTA,
    };
  }

  const ganadores = new Set([ganadorApertura, ganadorClausura]);

  if (aperturaArriba || clausuraArriba) {
    const finalista = aperturaArriba ? ganadorApertura : ganadorClausura;
    const otroGanador = aperturaArriba ? ganadorClausura : ganadorApertura;
    /* "el otro equipo de mayor puntaje en el acumulado": el mejor que no es ni finalista ni el otro ganador. */
    const rival = orden.find((id) => id !== finalista && !ganadores.has(id));
    if (!rival) return null;
    return {
      tipo: 'semifinal-y-final',
      campeon: null,
      cruces: [
        { ronda: 'semifinal', local: equipo(otroGanador), visita: equipo(rival) },
        { ronda: 'final', local: equipo(finalista), visita: ganadorDe(0) },
      ],
      fundamento: FINAL_CON_SEMI,
    };
  }

  /* Nadie ganó un torneo y quedó entre los dos primeros: los cuatro se cruzan. */
  return {
    tipo: 'semifinal-y-final',
    campeon: null,
    cruces: [
      { ronda: 'semifinal', local: equipo(primero), visita: equipo(ganadorClausura) },
      { ronda: 'semifinal', local: equipo(segundo), visita: equipo(ganadorApertura) },
      { ronda: 'final', local: ganadorDe(0), visita: ganadorDe(1) },
    ],
    fundamento: SEMIS_SEMBRADAS,
  };
}

export function zonaDe(
  reglas: ReglasLiga,
  clave: string,
  posicion: number,
): { zona: string; etiqueta: string } | null {
  const tabla = reglas.tablas.find((t) => t.clave === clave);
  const regla = tabla?.zonas.find((z) => posicion >= z.desde && posicion <= z.hasta);
  return regla ? { zona: regla.zona, etiqueta: regla.etiqueta } : null;
}
