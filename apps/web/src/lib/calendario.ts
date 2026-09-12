import { rivalesDeclarados } from '@athena/domain';
import type { MatchCard } from './api';
import { isLive } from './format';
import { describirRonda } from '@athena/domain';

/*
 * El día, leído por el reloj.
 *
 * Un calendario tiene dos ejes y hasta hoy la página solo tenía uno: dónde. Quien abre esta página
 * a las siete de la tarde no está buscando Bélgica, está buscando qué puede ver ahora. Ese es el
 * eje que faltaba, y todo lo de este archivo existe para armarlo.
 *
 * Nada de `Intl` con hora local del navegador: el sitio presenta todo en Lima y esto corre en el
 * servidor, así que la hora se calcula una vez y no depende de dónde esté quien mira.
 */

const TZ = 'America/Lima';

const horaEnLima = new Intl.DateTimeFormat('es-PE', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const diaEnLima = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

export const fechaEnLima = (cuando: Date | string) =>
  diaEnLima.format(typeof cuando === 'string' ? new Date(cuando) : cuando);

export const relojDe = (kickoffUtc: string) => horaEnLima.format(new Date(kickoffUtc));

/** La hora en punto a la que pertenece un partido: "20:30" cae en el bloque de las 20. */
export const bloqueDe = (kickoffUtc: string) => relojDe(kickoffUtc).slice(0, 2);

export interface Bloque {
  /** "20", en Lima. */
  hora: string;
  /** "20:00", para escribirlo. */
  etiqueta: string;
  partidos: MatchCard[];
  vivos: number;
  terminados: number;
}

/**
 * Los partidos del día repartidos por hora de inicio.
 *
 * Se agrupa por hora en punto y no por cada horario exacto: un día tiene veinte horarios distintos
 * y veinte encabezados con un partido cada uno no es una parrilla, es la misma lista con más ruido.
 */
export function agruparPorHora(partidos: MatchCard[]): Bloque[] {
  const mapa = new Map<string, MatchCard[]>();
  for (const partido of partidos) {
    const hora = bloqueDe(partido.kickoffUtc);
    mapa.set(hora, [...(mapa.get(hora) ?? []), partido]);
  }
  return [...mapa]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hora, lista]) => ({
      hora,
      etiqueta: `${hora}:00`,
      partidos: [...lista].sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc)),
      vivos: lista.filter((m) => isLive(m.status)).length,
      terminados: lista.filter((m) => m.status === 'finished').length,
    }));
}

/**
 * Cuántos partidos hay en cada hora del día, de 0 a 23.
 *
 * Es lo que dibuja la tira de carga: dice a qué hora está el bloque grande sin tener que bajar la
 * página. Se devuelven las veinticuatro horas, también las vacías, porque el hueco entre dos picos
 * es parte de la forma del día.
 */
export function cargaDelDia(partidos: MatchCard[]): number[] {
  const horas = Array.from({ length: 24 }, () => 0);
  for (const partido of partidos) {
    const hora = Number(bloqueDe(partido.kickoffUtc));
    if (Number.isFinite(hora)) horas[hora] = (horas[hora] ?? 0) + 1;
  }
  return horas;
}

export interface Ahora {
  enJuego: MatchCard[];
  proximos: MatchCard[];
  /** Minutos que faltan para el próximo, o null si no queda ninguno. */
  faltan: number | null;
}

/**
 * Lo que pasa a esta hora: lo que rueda y lo que arranca enseguida.
 *
 * Los próximos se cortan por hora de inicio y no por cantidad: los seis que arrancan juntos a las
 * ocho son un bloque, y mostrar tres de ellos sería elegir por el lector.
 */
export function ahoraYProximos(partidos: MatchCard[], ahora = new Date()): Ahora {
  const enJuego = partidos.filter((m) => isLive(m.status));
  const pendientes = partidos
    .filter((m) => m.status === 'scheduled' && new Date(m.kickoffUtc).getTime() > ahora.getTime())
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

  const primero = pendientes[0];
  if (!primero) return { enJuego, proximos: [], faltan: null };

  const arranque = new Date(primero.kickoffUtc).getTime();
  return {
    enJuego,
    proximos: pendientes.filter((m) => m.kickoffUtc === primero.kickoffUtc),
    faltan: Math.max(0, Math.round((arranque - ahora.getTime()) / 60_000)),
  };
}

/** "en 40 min", "en 2 h 15", "ya mismo". */
export function enCuanto(minutos: number): string {
  if (minutos <= 1) return 'ya mismo';
  if (minutos < 60) return `en ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `en ${horas} h` : `en ${horas} h ${String(resto).padStart(2, '0')}`;
}

export type Motivo = 'clasico' | 'definicion' | 'punta';

export interface Realce {
  motivo: Motivo;
  /** Lo que se escribe en la pastilla. Un realce sin razón visible es decoración. */
  etiqueta: string;
}

/** Dónde llega cada uno a este partido, cuando la competencia tiene tabla. */
export type Puestos = Record<string, { local: number; visita: number }>;

/*
 * Los torneos donde un partido cualquiera ya es un partido grande. Es la misma lista curada que
 * pinta las cabeceras de copa, y se declara en vez de deducirse de un ranking que no tenemos.
 */
const COPAS_MAYORES = new Set([
  'uefa-champions-league',
  'conmebol-libertadores',
  'copa-libertadores',
  'uefa-europa-league',
  'conmebol-sudamericana',
  'copa-sudamericana',
  'fifa-club-world-cup',
]);

/**
 * Por qué este partido no es uno más.
 *
 * Tres razones, y las tres se pueden defender con un dato: el clásico está declarado en una tabla
 * escrita a mano —un clásico es historia y barrio, no una columna de la base—, la ronda la nombra
 * el propio torneo, y la punta de la tabla sale de las posiciones reales. Cuando ninguna aplica, el
 * partido no se realza: inventar una razón para llenar la pantalla es lo contrario de esto.
 *
 * Se devuelve una sola, la más fuerte. Dos pastillas en una fila compiten entre sí y ninguna gana.
 */
export function realceDe(
  partido: Pick<MatchCard, 'id' | 'round' | 'homeTeam' | 'awayTeam' | 'season'>,
  puestos: Puestos,
): Realce | null {
  if (rivalesDeclarados(partido.homeTeam.slug).includes(partido.awayTeam.slug)) {
    return { motivo: 'clasico', etiqueta: 'Clásico' };
  }

  /* El rango crece hacia la final: 440 son los cuartos, 470 la final. De cuartos en adelante. */
  const ronda = partido.round ? describirRonda(partido.round) : null;
  if (ronda && ronda.etapa === 'final' && ronda.rank >= 440) {
    return { motivo: 'definicion', etiqueta: ronda.label };
  }

  const puesto = puestos[partido.id];
  if (puesto) {
    const arriba = Math.max(puesto.local, puesto.visita);
    if (arriba <= 4) {
      const mayor = COPAS_MAYORES.has(partido.season.competition.slug);
      return {
        motivo: 'punta',
        etiqueta: mayor ? 'Duelo de arriba' : `${puesto.local}º contra ${puesto.visita}º`,
      };
    }
  }

  return null;
}
