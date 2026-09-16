/*
 * Qué se compara de dos jugadores dentro de un partido, y en qué orden.
 *
 * Vive aparte del componente porque decide contenido, no forma: qué estadística vale la pena poner
 * al lado de cuál, cómo se escribe un "8 de 12" y cuál de los dos valores va adelante. Eso se puede
 * leer y discutir sin abrir una plantilla.
 *
 * Las filas que ningún jugador tiene no se dibujan: un delantero y un volante comparten quince
 * números, y las atajadas solo aparecen cuando alguno es arquero.
 */

export interface EstadisticasDeFicha {
  minutesPlayed?: number | null;
  rating?: string | null;
  goals?: number | null;
  assists?: number | null;
  saves?: number | null;
  shotsTotal?: number | null;
  shotsOnTarget?: number | null;
  passesTotal?: number | null;
  passesKey?: number | null;
  passesAccurate?: number | null;
  tacklesTotal?: number | null;
  interceptions?: number | null;
  duelsTotal?: number | null;
  duelsWon?: number | null;
  dribblesTotal?: number | null;
  dribblesSuccess?: number | null;
  foulsCommitted?: number | null;
  foulsDrawn?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  penaltyScored?: number | null;
  penaltyMissed?: number | null;
  penaltySaved?: number | null;
}

export interface FichaDeJugador {
  playerId: string;
  slug: string | null;
  name: string;
  photoUrl: string | null;
  number: number | null;
  position: string | null;
  team: { name: string; slug: string; logoUrl: string | null };
  stats: EstadisticasDeFicha | null;
}

export interface ValorComparado {
  /** Lo que se lee: "8 de 12", "78%", "–". */
  texto: string;
  /** Con qué se ordena y se dibuja la barra. Cero cuando no hay dato. */
  orden: number;
}

export interface FilaComparada {
  label: string;
  valores: ValorComparado[];
  /*
   * Si tiene sentido señalar a uno. En faltas, amarillas y rojas no lo tiene: el que más tiene no
   * gana nada, y pintarlo como líder decía lo contrario de lo que pasó.
   */
  hayLider: boolean;
}

export interface GrupoComparado {
  titulo: string;
  filas: FilaComparada[];
}

const VACIO: ValorComparado = { texto: '–', orden: 0 };

const numero = (valor: number | null | undefined): ValorComparado =>
  valor === null || valor === undefined ? VACIO : { texto: String(valor), orden: valor };

const decimal = (valor: string | null | undefined): ValorComparado => {
  const n = valor === null || valor === undefined ? Number.NaN : Number(valor);
  return Number.isFinite(n) && n > 0 ? { texto: n.toFixed(1), orden: n } : VACIO;
};

/** "8 de 12": el acierto se lee junto al intento, que es lo que le da sentido. */
const deCada = (
  hechos: number | null | undefined,
  intentos: number | null | undefined,
): ValorComparado => {
  if (hechos === null || hechos === undefined) return VACIO;
  if (intentos === null || intentos === undefined) return { texto: String(hechos), orden: hechos };
  return { texto: `${hechos} de ${intentos}`, orden: hechos };
};

const minutos = (valor: number | null | undefined): ValorComparado =>
  valor === null || valor === undefined ? VACIO : { texto: `${valor}'`, orden: valor };

interface Definicion {
  label: string;
  /** Cómo sale el valor de las estadísticas de un jugador. */
  de: (s: EstadisticasDeFicha) => ValorComparado;
}

const GRUPOS: Array<{ titulo: string; hayLider?: boolean; filas: Definicion[] }> = [
  {
    titulo: 'En cancha',
    filas: [
      { label: 'Nota', de: (s) => decimal(s.rating) },
      { label: 'Minutos', de: (s) => minutos(s.minutesPlayed) },
    ],
  },
  {
    titulo: 'Ataque',
    filas: [
      { label: 'Goles', de: (s) => numero(s.goals) },
      { label: 'Asistencias', de: (s) => numero(s.assists) },
      { label: 'Remates al arco', de: (s) => deCada(s.shotsOnTarget, s.shotsTotal) },
      { label: 'Regates', de: (s) => deCada(s.dribblesSuccess, s.dribblesTotal) },
      { label: 'Penales', de: (s) => numero(s.penaltyScored) },
    ],
  },
  {
    titulo: 'Pases',
    filas: [
      { label: 'Pases precisos', de: (s) => deCada(s.passesAccurate, s.passesTotal) },
      { label: 'Pases clave', de: (s) => numero(s.passesKey) },
    ],
  },
  {
    titulo: 'Defensa',
    filas: [
      { label: 'Duelos ganados', de: (s) => deCada(s.duelsWon, s.duelsTotal) },
      { label: 'Quites', de: (s) => numero(s.tacklesTotal) },
      { label: 'Intercepciones', de: (s) => numero(s.interceptions) },
      { label: 'Atajadas', de: (s) => numero(s.saves) },
    ],
  },
  {
    titulo: 'Disciplina',
    hayLider: false,
    filas: [
      { label: 'Faltas cometidas', de: (s) => numero(s.foulsCommitted) },
      { label: 'Faltas recibidas', de: (s) => numero(s.foulsDrawn) },
      { label: 'Amarillas', de: (s) => numero(s.yellowCards) },
      { label: 'Rojas', de: (s) => numero(s.redCards) },
    ],
  },
];

/**
 * Las filas a dibujar para un conjunto de jugadores.
 *
 * Una fila donde todos marcan cero y nadie tiene dato no se dibuja: "0 rojas" contra "0 rojas"
 * ocupa el mismo alto que un dato y no responde ninguna pregunta.
 */
export function filasDeComparacion(fichas: FichaDeJugador[]): GrupoComparado[] {
  const stats = fichas.map((f) => f.stats ?? {});

  return GRUPOS.map((grupo) => ({
    titulo: grupo.titulo,
    filas: grupo.filas
      .map((def) => ({
        label: def.label,
        valores: stats.map(def.de),
        hayLider: grupo.hayLider !== false,
      }))
      .filter((fila) => fila.valores.some((v) => v.texto !== '–' && v.orden > 0)),
  })).filter((grupo) => grupo.filas.length > 0);
}
