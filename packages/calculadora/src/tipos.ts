/**
 * Qué pasaría si.
 *
 * El lector pronostica los partidos que faltan y acá se rehacen las tablas. Athena no predice
 * nada: pone los números del escenario que le dieron, que es una cosa bien distinta y hay que
 * sostenerla también en los nombres.
 *
 * El motor no sabe de Perú. Las zonas, el reparto de cupos y el camino al título son datos de la
 * competencia (`ReglasLiga`), así que la próxima liga con Apertura y Clausura es una tabla más y
 * no otro archivo.
 */

export interface Equipo {
  id: string;
  nombre: string;
  slug: string;
  logo: string | null;
  /** Tres letras para la URL. Los `short_name` del proveedor no sirven: hay tres "SPO". */
  codigo: string;
}

export type EstadoDePartido =
  | 'scheduled'
  | 'in_play'
  | 'paused'
  | 'finished'
  | 'postponed'
  | 'suspended'
  | 'cancelled'
  | 'abandoned'
  | 'awarded';

export interface Partido {
  id: string;
  /** "Clausura - 9" tal como llega del proveedor. */
  ronda: string;
  /** "Clausura", ya resuelta con `faseDeJornada`. */
  fase: string;
  local: string;
  visita: string;
  estado: EstadoDePartido;
  golesLocal: number | null;
  golesVisita: number | null;
  kickoff: string;
}

/** Lo que el lector escribió, por id de partido. */
export type Pronosticos = ReadonlyMap<string, readonly [number, number]>;

export interface Fila {
  equipo: Equipo;
  posicion: number;
  puntos: number;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferencia: number;
  /** Cuánto subió o bajó contra la posición oficial de hoy. Positivo es subir. */
  movimiento: number;
}

export type ClaveDeTabla = string;

export interface Tabla {
  clave: ClaveDeTabla;
  titulo: string;
  filas: Fila[];
}

/**
 * El orden que publica el proveedor hoy. Es el último criterio de desempate porque absorbe el
 * resultado entre sí, el fair play y el sorteo tal como la Liga los aplicó, y calcularlos por
 * nuestra cuenta divergiría justo donde el proveedor no los aplicó.
 */
export interface OrdenOficial {
  clave: ClaveDeTabla;
  equipos: string[];
}

export type Zona = 'campeon' | 'libertadores' | 'sudamericana' | 'descenso';

export interface ReglaDeZona {
  zona: Zona;
  desde: number;
  hasta: number;
  etiqueta: string;
}

export interface DefinicionDeTabla {
  clave: ClaveDeTabla;
  titulo: string;
  /** Las fases que suma. La anual las suma todas. */
  fases: string[];
  zonas: ReglaDeZona[];
}

export interface ReglasLiga {
  tablas: DefinicionDeTabla[];
  /** Cuál de las tablas manda para los cupos y el descenso. */
  claveAcumulada: ClaveDeTabla;
}

export interface DatosDeLaCalculadora {
  competencia: { nombre: string; slug: string; logo: string | null };
  temporada: number;
  fase: string | null;
  fecha: number | null;
  equipos: Equipo[];
  partidos: Partido[];
  ordenOficial: OrdenOficial[];
}
