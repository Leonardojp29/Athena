/*
 * Qué se compara y cómo se lee, para jugadores y para equipos.
 *
 * El servidor arma los datos —una entidad por columna, con todos sus ámbitos adentro— y el navegador
 * decide qué ámbito mira cada una. Por eso los números viajan sueltos en un `Record` y las filas se
 * declaran acá: cambiar de temporada no puede costar un viaje al servidor, y el orden de las filas
 * es una decisión de producto que conviene poder leer de corrido.
 *
 * "Ámbito" es el recorte que se mira: una temporada en un torneo, o el acumulado de todas.
 */

export const CLAVE_TOTAL = 'total';
export const MAXIMO_A_COMPARAR = 5;

export interface AmbitoComparado {
  /** Lo que viaja en la URL y en el `<select>`. */
  clave: string;
  etiqueta: string;
  /** El escudo del torneo, o el del club en el acumulado. */
  logoUrl: string | null;
  numeros: Record<string, number | null>;
}

export interface EntidadComparada {
  slug: string;
  nombre: string;
  fotoUrl: string | null;
  /** La posición y el país de un jugador; el país de un equipo. */
  subtitulo: string | null;
  /** El escudo del club al que pertenece hoy. */
  escudoUrl: string | null;
  ambitos: AmbitoComparado[];
}

export interface DefinicionDeFila {
  clave: string;
  etiqueta: string;
  /** Cierto cuando el número más chico es el mejor: tarjetas, goles en contra, posición. */
  menosEsMejor?: boolean;
  /** Filas donde nadie gana: los partidos jugados no son un mérito. */
  neutral?: boolean;
  decimales?: number;
  sufijo?: string;
}

export interface GrupoDeFilas {
  titulo: string;
  filas: DefinicionDeFila[];
}

export const FILAS_DE_JUGADOR: GrupoDeFilas[] = [
  {
    titulo: 'Presencia',
    filas: [
      { clave: 'appearances', etiqueta: 'Partidos', neutral: true },
      { clave: 'lineups', etiqueta: 'De titular', neutral: true },
      { clave: 'minutesPlayed', etiqueta: 'Minutos', neutral: true },
      { clave: 'rating', etiqueta: 'Nota media', decimales: 2 },
    ],
  },
  {
    titulo: 'Ataque',
    filas: [
      { clave: 'goals', etiqueta: 'Goles' },
      { clave: 'assists', etiqueta: 'Asistencias' },
      { clave: 'golesCada90', etiqueta: 'Goles cada 90′', decimales: 2 },
      { clave: 'shotsTotal', etiqueta: 'Remates' },
      { clave: 'shotsOnTarget', etiqueta: 'Remates al arco' },
      { clave: 'penaltyScored', etiqueta: 'Penales convertidos' },
    ],
  },
  {
    titulo: 'Con la pelota',
    filas: [
      { clave: 'passesTotal', etiqueta: 'Pases' },
      { clave: 'passesKey', etiqueta: 'Pases clave' },
      { clave: 'passesAccuracyPercent', etiqueta: 'Precisión de pase', sufijo: '%' },
      { clave: 'dribblesSuccess', etiqueta: 'Regates' },
      { clave: 'duelsWon', etiqueta: 'Duelos ganados' },
    ],
  },
  {
    titulo: 'Disciplina',
    filas: [
      { clave: 'yellowCards', etiqueta: 'Amarillas', menosEsMejor: true },
      { clave: 'redCards', etiqueta: 'Rojas', menosEsMejor: true },
    ],
  },
];

export const FILAS_DE_EQUIPO: GrupoDeFilas[] = [
  {
    titulo: 'En la tabla',
    filas: [
      { clave: 'position', etiqueta: 'Posición', menosEsMejor: true },
      { clave: 'points', etiqueta: 'Puntos' },
      { clave: 'played', etiqueta: 'Jugados', neutral: true },
      { clave: 'puntosPorPartido', etiqueta: 'Puntos por partido', decimales: 2 },
    ],
  },
  {
    titulo: 'Resultados',
    filas: [
      { clave: 'won', etiqueta: 'Ganados' },
      { clave: 'drawn', etiqueta: 'Empatados', neutral: true },
      { clave: 'lost', etiqueta: 'Perdidos', menosEsMejor: true },
    ],
  },
  {
    titulo: 'Goles',
    filas: [
      { clave: 'goalsFor', etiqueta: 'A favor' },
      { clave: 'goalsAgainst', etiqueta: 'En contra', menosEsMejor: true },
      { clave: 'diferencia', etiqueta: 'Diferencia' },
      { clave: 'golesPorPartido', etiqueta: 'Goles por partido', decimales: 2 },
    ],
  },
];

/** Cómo se escribe un número en su fila. Sin dato es una raya, no un cero. */
export function formatear(valor: number | null | undefined, fila: DefinicionDeFila): string {
  if (valor === null || valor === undefined) return '–';
  const texto = fila.decimales
    ? valor.toFixed(fila.decimales)
    : Math.round(valor).toLocaleString('es-PE');
  return `${texto}${fila.sufijo ?? ''}`;
}

/**
 * Quién gana la fila, por índice. Devuelve un conjunto porque puede haber empate arriba.
 *
 * Vacío cuando la fila es neutral, cuando nadie tiene dato o cuando todos empatan: marcar a los
 * cinco es lo mismo que no marcar a ninguno, y encima ensucia.
 */
export function lideresDeFila(valores: Array<number | null>, fila: DefinicionDeFila): Set<number> {
  if (fila.neutral) return new Set();
  const conDato = valores
    .map((valor, indice) => ({ valor, indice }))
    .filter((v): v is { valor: number; indice: number } => v.valor !== null);
  if (conDato.length < 2) return new Set();

  const mejor = fila.menosEsMejor
    ? Math.min(...conDato.map((v) => v.valor))
    : Math.max(...conDato.map((v) => v.valor));
  const lideres = conDato.filter((v) => v.valor === mejor);
  return lideres.length === conDato.length ? new Set() : new Set(lideres.map((v) => v.indice));
}
